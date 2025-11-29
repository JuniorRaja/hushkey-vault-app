/**
 * File Storage Service using Supabase Storage
 * Handles encrypted file uploads and downloads
 */

import { supabase } from '../supabaseClient';
import EncryptionService from './encryption';

class FileStorageService {
  private readonly BUCKET_NAME = 'hushkey-files';

  /**
   * Initialize storage bucket (call once on app setup)
   */
  async initializeBucket(): Promise<void> {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === this.BUCKET_NAME);

    if (!bucketExists) {
      await supabase.storage.createBucket(this.BUCKET_NAME, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
    }
  }

  /**
   * Upload encrypted file
   */
  async uploadFile(
    itemId: string,
    file: File,
    masterKey: Uint8Array
  ): Promise<{ id: string; path: string; size: number }> {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Encrypt file data
      const encryptedData = await EncryptionService.encryptBinary(fileData, masterKey);

      // Generate unique file path
      const fileId = crypto.randomUUID();
      const filePath = `${itemId}/${fileId}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, encryptedData, {
          contentType: 'application/octet-stream',
          upsert: false
        });

      if (error) throw error;

      // Encrypt and store metadata in database
      const { user } = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const nameEncrypted = await EncryptionService.encrypt(file.name, masterKey);

      const { data: attachmentData, error: dbError } = await supabase
        .from('file_attachments')
        .insert({
          id: fileId,
          item_id: itemId,
          name_encrypted: nameEncrypted,
          size_bytes: file.size,
          mime_type: file.type || 'application/octet-stream',
          file_data_encrypted: data.path
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        id: fileId,
        path: data.path,
        size: file.size
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  /**
   * Download and decrypt file
   */
  async downloadFile(
    fileId: string,
    masterKey: Uint8Array
  ): Promise<{ data: Blob; name: string; mimeType: string }> {
    try {
      // Get file metadata from database
      const { data: metadata, error: dbError } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('id', fileId)
        .single();

      if (dbError) throw dbError;

      // Download encrypted file from storage
      const { data: encryptedData, error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(metadata.file_data_encrypted);

      if (storageError) throw storageError;

      // Decrypt file data
      const encryptedBuffer = await encryptedData.arrayBuffer();
      const decryptedData = await EncryptionService.decryptBinary(
        new Uint8Array(encryptedBuffer),
        masterKey
      );

      // Decrypt file name
      const fileName = await EncryptionService.decrypt(metadata.name_encrypted, masterKey);

      return {
        data: new Blob([decryptedData], { type: metadata.mime_type }),
        name: fileName,
        mimeType: metadata.mime_type
      };
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  /**
   * Delete file from storage and database
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      // Get file path from database
      const { data: metadata, error: dbError } = await supabase
        .from('file_attachments')
        .select('file_data_encrypted')
        .eq('id', fileId)
        .single();

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([metadata.file_data_encrypted]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from('file_attachments')
        .delete()
        .eq('id', fileId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Get all attachments for an item
   */
  async getItemAttachments(
    itemId: string,
    masterKey: Uint8Array
  ): Promise<Array<{ id: string; name: string; size: number; mimeType: string }>> {
    try {
      const { data, error } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('item_id', itemId);

      if (error) throw error;

      // Decrypt file names
      const attachments = await Promise.all(
        data.map(async (file) => ({
          id: file.id,
          name: await EncryptionService.decrypt(file.name_encrypted, masterKey),
          size: file.size_bytes,
          mimeType: file.mime_type
        }))
      );

      return attachments;
    } catch (error) {
      console.error('Failed to get item attachments:', error);
      throw error;
    }
  }

  /**
   * Get total storage used by user
   */
  async getUserStorageUsed(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('file_attachments')
        .select('size_bytes, items!inner(vault_id, vaults!inner(user_id))')
        .eq('items.vaults.user_id', userId);

      if (error) throw error;

      return data.reduce((total, file) => total + file.size_bytes, 0);
    } catch (error) {
      console.error('Failed to get storage used:', error);
      return 0;
    }
  }
}

export default new FileStorageService();
