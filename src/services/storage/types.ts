/**
 * Storage Provider Types
 */

export interface UploadResult {
  path: string;
  url?: string;
  size: number;
  contentType: string;
}

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  contentType: string;
  lastModified?: Date;
}

export interface StorageConfig {
  bucket?: string;
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    accountId?: string;
    apiToken?: string;
    connectionString?: string;
  };
}

export interface StorageProvider {
  upload(file: Blob, path: string, contentType?: string): Promise<UploadResult>;
  download(path: string): Promise<Blob>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): string;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
  listFiles(prefix: string): Promise<FileMetadata[]>;
}

export enum StorageProviderType {
  SUPABASE = 'supabase',
  S3 = 's3',
  AZURE = 'azure',
  CLOUDFLARE_R2 = 'cloudflare_r2'
}
