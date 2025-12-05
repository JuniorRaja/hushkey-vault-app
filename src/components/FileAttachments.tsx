/**
 * File Attachments Component
 * Upload, view, download, and delete file attachments
 */

import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  Eye,
  Trash2,
  File,
  AlertTriangle,
  X,
  Plus,
} from "lucide-react";
import AttachmentsService, {
  FileMetadata,
  UploadProgress,
} from "../services/attachmentsService";
import { useAuthStore } from "../stores/authStore";
import { ItemType } from "../../types";

interface FileAttachmentsProps {
  itemId: string;
  itemType: ItemType;
  attachments: FileMetadata[];
  onAttachmentsChange: () => void;
  isEditing?: boolean;
}

export const FileAttachments: React.FC<FileAttachmentsProps> = ({
  itemId,
  itemType,
  attachments,
  onAttachmentsChange,
  isEditing = false,
}) => {
  const { user, masterKey } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [showDownloadWarning, setShowDownloadWarning] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !masterKey) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setError(null);

      if (!AttachmentsService.isFileTypeAllowed(file.type)) {
        setError("File type not allowed");
        return;
      }

      if (!AttachmentsService.isFileSizeValid(file.size)) {
        setError(
          `File size exceeds ${
            AttachmentsService.getMaxFileSize() / 1024 / 1024
          }MB`
        );
        return;
      }

      setUploading(true);
      setUploadProgress({ loaded: 0, total: 100, percentage: 0 });

      try {
        await AttachmentsService.uploadFile(
          file,
          itemId,
          user.id,
          masterKey,
          (progress) => setUploadProgress(progress)
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        break;
      }
    }

    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onAttachmentsChange();
  };

  const handleView = async (fileId: string) => {
    if (!masterKey) return;

    if (itemType === ItemType.FILE) {
      setShowDownloadWarning(fileId);
      return;
    }

    try {
      const url = await AttachmentsService.viewFile(fileId, masterKey);
      setViewingFile(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot view file");
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    if (!masterKey) return;
    setShowDownloadWarning(fileId);
  };

  const performDownload = async (fileId: string) => {
    if (!masterKey) return;
    try {
      const { blob, fileName } = await AttachmentsService.downloadFile(
        fileId,
        masterKey
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setShowDownloadWarning(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Delete this file?")) return;
    try {
      await AttachmentsService.deleteFile(fileId);
      onAttachmentsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          ATTACHMENTS
        </h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`p-1.5 hover:bg-gray-800 rounded text-primary-400 disabled:opacity-50  ${
            isEditing ? "" : "hidden"
          }`}
          title="Add files"
        >
          <Plus className={`w-4 h-4`} />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {uploading && uploadProgress && (
        <div className="p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Uploading...</span>
            <span className="text-sm text-gray-400">
              {uploadProgress.percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-violet-600 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing &&
                  (file.mimeType.startsWith("image/") ||
                    file.mimeType === "application/pdf" ||
                    file.mimeType === "text/plain") && (
                    <button
                      onClick={() => handleView(file.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                {!isEditing && (
                  <button
                    onClick={() => handleDownload(file.id, file.name)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                {isEditing && (
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>
        ))}
        {attachments.length === 0 && !isEditing && (
          <div className="text-center py-2 text-gray-500 text-sm">
            No attachments
          </div>
        )}
      </div>

      {viewingFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-medium text-white">File Preview</h3>
              <button
                onClick={() => {
                  URL.revokeObjectURL(viewingFile);
                  setViewingFile(null);
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <iframe
                src={viewingFile}
                className="w-full h-[70vh] rounded-lg"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {showDownloadWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-2">
                  Security Warning
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Downloading this file will save it unprotected on your device.
                  Make sure you're in a secure location.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => performDownload(showDownloadWarning)}
                    className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                  >
                    Download Anyway
                  </button>
                  <button
                    onClick={() => setShowDownloadWarning(null)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileAttachments;
