import type { StorageProvider, StorageConfig, StorageProviderType } from './types';
import { SupabaseStorageProvider } from './supabaseProvider';
import { S3StorageProvider } from './s3Provider';

export class StorageFactory {
  static create(type: StorageProviderType, config: StorageConfig): StorageProvider {
    switch (type) {
      case 'supabase':
        return new SupabaseStorageProvider(config);
      case 's3':
        return new S3StorageProvider(config);
      case 'cloudflare_r2':
        return new S3StorageProvider(config); // R2 is S3-compatible
      default:
        throw new Error(`Unsupported storage provider: ${type}`);
    }
  }

  static createFromEnv(): StorageProvider {
    const type = (import.meta.env.VITE_STORAGE_PROVIDER || 'supabase') as StorageProviderType;
    
    const config: StorageConfig = {
      bucket: import.meta.env.VITE_STORAGE_BUCKET,
      region: import.meta.env.VITE_STORAGE_REGION,
      endpoint: import.meta.env.VITE_STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: import.meta.env.VITE_STORAGE_ACCESS_KEY,
        secretAccessKey: import.meta.env.VITE_STORAGE_SECRET_KEY,
        accountId: import.meta.env.VITE_STORAGE_ACCOUNT_ID,
        apiToken: import.meta.env.VITE_STORAGE_API_TOKEN
      }
    };

    return this.create(type, config);
  }
}
