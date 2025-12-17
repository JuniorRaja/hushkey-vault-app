import React from "react";
import { X, Server, HardDrive, AlertTriangle, ArrowRight } from "lucide-react";
import SyncService from "../src/services/syncService";

interface ConflictResolutionModalProps {
  conflict: any;
  onResolve: () => void;
  onClose: () => void;
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflict,
  onResolve,
  onClose,
}) => {
  if (!conflict) return null;

  const handleResolve = async (resolution: "local" | "remote") => {
    await SyncService.resolveConflict(conflict.id, resolution);
    onResolve();
  };

  const localData = conflict.local.data;
  const remoteData = conflict.remote;

  // Helper to render diff (simplified)
  const renderDiff = () => {
    // Compare basic fields
    const fields = ["name", "username", "email", "notes"];

    return (
      <div className="space-y-2">
        {fields.map((field) => {
          const localVal = localData[field] || remoteData[field]; // Fallback to visualize context
          const remoteVal = remoteData[field];

          // Only show if relevant (one of them has it)
          if (!localVal && !remoteVal) return null;

          const isDiff = localData[field] !== remoteVal;

          return (
            <div
              key={field}
              className="grid grid-cols-2 gap-4 text-sm p-2 bg-gray-900 rounded"
            >
              <div
                className={`${
                  isDiff ? "text-amber-400 font-bold" : "text-gray-400"
                }`}
              >
                <span className="text-xs uppercase text-gray-600 block mb-1">
                  {field}
                </span>
                {localData[field] || (
                  <span className="italic text-gray-700">Empty</span>
                )}
              </div>
              <div
                className={`${
                  isDiff ? "text-blue-400 font-bold" : "text-gray-400"
                }`}
              >
                <span className="text-xs uppercase text-gray-600 block mb-1">
                  {field}
                </span>
                {remoteVal || (
                  <span className="italic text-gray-700">Empty</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Sync Conflict Detected
              </h2>
              <p className="text-sm text-gray-400">
                Values on the server differ from your offline changes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-6 px-4">
            <div className="flex flex-col items-center">
              <div className="p-3 bg-amber-500/10 rounded-full text-amber-500 mb-2">
                <HardDrive size={24} />
              </div>
              <span className="font-bold text-amber-500">Your Version</span>
              <span className="text-xs text-gray-500">Modified Offline</span>
            </div>

            <div className="flex items-center text-gray-600 gap-2">
              <div className="h-px w-12 bg-gray-700"></div>
              <span className="text-xs uppercase">VS</span>
              <div className="h-px w-12 bg-gray-700"></div>
            </div>

            <div className="flex flex-col items-center">
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-500 mb-2">
                <Server size={24} />
              </div>
              <span className="font-bold text-blue-500">Server Version</span>
              <span className="text-xs text-gray-500">
                Modified by another device
              </span>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <ArrowRight size={14} /> Compare Changes
            </h3>
            {renderDiff()}
          </div>

          <div className="mt-6 text-sm text-gray-500 text-center">
            Choosing "Your Version" will overwrite the server data.
            <br />
            Choosing "Server Version" will discard your offline changes.
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/30 flex gap-4">
          <button
            onClick={() => handleResolve("local")}
            className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-amber-900/20 active:scale-[0.98]"
          >
            Keep My Version
          </button>
          <button
            onClick={() => handleResolve("remote")}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
          >
            Keep Server Version
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
