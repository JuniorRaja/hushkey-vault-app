import type { StorageProvider, UploadResult, FileMetadata, StorageConfig } from './types';

export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private credentials: any;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket || 'hushkey-vault';
    this.region = config.region || 'us-east-1';
    this.endpoint = config.endpoint;
    this.credentials = config.credentials;
  }

  async upload(file: Blob, path: string, contentType?: string): Promise<UploadResult> {
    // Lazy load AWS SDK only when S3 is used
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: this.credentials
    });

    const buffer = await file.arrayBuffer();
    await client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: new Uint8Array(buffer),
      ContentType: contentType || 'application/octet-stream'
    }));

    return {
      path,
      size: file.size,
      contentType: contentType || 'application/octet-stream'
    };
  }

  async download(path: string): Promise<Blob> {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: this.credentials
    });

    const response = await client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: path
    }));

    const buffer = await response.Body?.transformToByteArray();
    if (!buffer) throw new Error('No data received');
    
    return new Blob([buffer]);
  }

  async delete(path: string): Promise<void> {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: this.credentials
    });

    await client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path
    }));
  }

  getPublicUrl(path: string): string {
    const endpoint = this.endpoint || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    return `${endpoint}/${path}`;
  }

  async getSignedUrl(path: string, expiresIn: number): Promise<string> {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    
    const client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: this.credentials
    });

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path
    });

    return getSignedUrl(client, command, { expiresIn });
  }

  async listFiles(prefix: string): Promise<FileMetadata[]> {
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    const client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: this.credentials
    });

    const response = await client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix
    }));

    return (response.Contents || []).map(obj => ({
      path: obj.Key || '',
      name: obj.Key?.split('/').pop() || '',
      size: obj.Size || 0,
      contentType: 'application/octet-stream',
      lastModified: obj.LastModified
    }));
  }
}
