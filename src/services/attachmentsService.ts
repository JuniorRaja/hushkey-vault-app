/**
 * Attachments Service - Provider-agnostic file management
 * Handles upload, download, view, and delete with encryption
 */

import EncryptionService from './encryption';
import { StorageProvider } from './storage/types';
import { SupabaseStorageProvider } from './storage/supabaseProvider';
import { supabase } from '../supabaseClient';
import pako from 'pako';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-rar-compressed',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  itemId: string;
  createdAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class AttachmentsService {
  private storageProvider: StorageProvider;

  constructor() {
    this.storageProvider = new SupabaseStorageProvider({ bucket: 'hushkey-vault' });
  }

  setStorageProvider(provider: StorageProvider) {
    this.storageProvider = provider;
  }

  async uploadFile(
    file: File,
    itemId: string,
    userId: string,
    masterKey: Uint8Array,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileMetadata> {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      let fileData = new Uint8Array(arrayBuffer);

      // Compress if beneficial
      const compressed = pako.deflate(fileData);
      if (compressed.length < fileData.length * 0.9) {
        fileData = compressed;
      }

      // Encrypt file data
      const encryptedData = await EncryptionService.encryptBinary(fileData, masterKey);

      // Encrypt filename only (mime_type stored as plain text per schema)
      const encryptedName = await EncryptionService.encrypt(file.name, masterKey);

      // Create blob from encrypted data
      const blob = new Blob([encryptedData]);

      // Upload to storage
      const path = `${userId}/${itemId}/${crypto.randomUUID()}`;
      
      if (onProgress) {
        onProgress({ loaded: 50, total: 100, percentage: 50 });
      }

      await this.storageProvider.upload(blob, path, 'application/octet-stream');

      if (onProgress) {
        onProgress({ loaded: 75, total: 100, percentage: 75 });
      }

      // Save metadata to database
      const { data, error } = await supabase
        .from('file_attachments')
        .insert({
          item_id: itemId,
          name_encrypted: encryptedName,
          size_bytes: file.size,
          mime_type: file.type,
          file_data_encrypted: path,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (onProgress) {
        onProgress({ loaded: 100, total: 100, percentage: 100 });
      }

      return {
        id: data.id,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        itemId,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAttachments(itemId: string, masterKey: Uint8Array): Promise<FileMetadata[]> {
    const { data, error } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('item_id', itemId);

    if (error) throw error;
    if (!data || data.length === 0) {
      return [];
    }

    const decrypted = await Promise.all(
      data.map(async (file) => ({
        id: file.id,
        name: await EncryptionService.decrypt(file.name_encrypted, masterKey),
        size: file.size_bytes,
        mimeType: file.mime_type,
        itemId: file.item_id,
        createdAt: file.created_at,
      }))
    );
    
    return decrypted;
  }

  async downloadFile(
    fileId: string,
    masterKey: Uint8Array,
    customFileName?: string
  ): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
    // Get file metadata
    const { data: fileData, error } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) throw error;

    const path = fileData.file_data_encrypted;
    const fileName = customFileName || (await EncryptionService.decrypt(fileData.name_encrypted, masterKey));
    const mimeType = fileData.mime_type;

    // Download encrypted file
    const encryptedBlob = await this.storageProvider.download(path);
    const encryptedData = new Uint8Array(await encryptedBlob.arrayBuffer());

    // Decrypt
    const decryptedData = await EncryptionService.decryptBinary(encryptedData, masterKey);

    // Try decompress
    let finalData: Uint8Array;
    try {
      finalData = pako.inflate(decryptedData);
    } catch {
      finalData = decryptedData;
    }

    const blob = new Blob([finalData], { type: mimeType });

    return { blob, fileName, mimeType };
  }

  async viewFile(fileId: string, masterKey: Uint8Array): Promise<string> {
    const { blob, mimeType } = await this.downloadFile(fileId, masterKey);

    // Only allow viewing images, PDFs, and text files
    const viewableTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain',
    ];

    if (!viewableTypes.includes(mimeType)) {
      throw new Error('File type not viewable');
    }

    return URL.createObjectURL(blob);
  }

  async deleteFile(fileId: string): Promise<void> {
    // Get file path
    const { data: fileData, error: fetchError } = await supabase
      .from('file_attachments')
      .select('file_data_encrypted')
      .eq('id', fileId)
      .single();

    if (fetchError) throw fetchError;

    const path = fileData.file_data_encrypted;

    // Delete from storage
    await this.storageProvider.delete(path);

    // Delete from database
    const { error } = await supabase
      .from('file_attachments')
      .delete()
      .eq('id', fileId);

    if (error) throw error;
  }

  isFileTypeAllowed(mimeType: string): boolean {
    return ALLOWED_TYPES.includes(mimeType);
  }

  isFileSizeValid(size: number): boolean {
    return size <= MAX_FILE_SIZE;
  }

  getMaxFileSize(): number {
    return MAX_FILE_SIZE;
  }
}

export default new AttachmentsService();
