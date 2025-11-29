import { supabase } from '../../supabaseClient';
import type { StorageProvider, UploadResult, FileMetadata, StorageConfig } from './types';

export class SupabaseStorageProvider implements StorageProvider {
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket || 'hushkey-vault';
  }

  async upload(file: Blob, path: string, contentType?: string): Promise<UploadResult> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        contentType: contentType || 'application/octet-stream',
        upsert: false
      });

    if (error) throw error;

    return {
      path: data.path,
      size: file.size,
      contentType: contentType || 'application/octet-stream'
    };
  }

  async download(path: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .download(path);

    if (error) throw error;
    return data;
  }

  async delete(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) throw error;
  }

  getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async getSignedUrl(path: string, expiresIn: number): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  async listFiles(prefix: string): Promise<FileMetadata[]> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .list(prefix);

    if (error) throw error;

    return data.map(file => ({
      path: `${prefix}/${file.name}`,
      name: file.name,
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || 'application/octet-stream',
      lastModified: file.updated_at ? new Date(file.updated_at) : undefined
    }));
  }
}
