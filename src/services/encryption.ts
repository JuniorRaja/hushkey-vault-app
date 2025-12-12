/**
 * Encryption Service using Web Crypto API
 * - PBKDF2 with 600k iterations
 * - AES-256-GCM for encryption
 * - Random salt generation
 * - Base64 utilities
 */

class EncryptionService {
  private readonly ITERATIONS = 600000;
  private readonly KEY_LENGTH = 256;
  private readonly SALT_LENGTH = 16;
  private readonly IV_LENGTH = 12;

  /**
   * Generate a random salt for PBKDF2
   */
  generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    return this.toBase64(salt);
  }

  /**
   * Generate a random string (for device IDs, etc.)
   */
  generateRandomString(length: number = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derive a master key from password and salt using PBKDF2
   */
  async deriveMasterKey(password: string, salt: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = this.fromBase64(salt);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer.buffer as ArrayBuffer,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );

    // Export as raw bytes
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(exportedKey);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(data: string, masterKey: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      masterKey.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      dataBuffer
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return this.toBase64(combined);
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async decrypt(encryptedData: string, masterKey: Uint8Array): Promise<string> {
    const combined = this.fromBase64(encryptedData);

    // Extract IV and encrypted data
    const iv = combined.slice(0, this.IV_LENGTH);
    const encryptedBuffer = combined.slice(this.IV_LENGTH);

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      masterKey.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Convert Uint8Array to Base64
   */
  toBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...Array.from(bytes)));
  }

  /**
   * Convert Base64 to Uint8Array
   */
  fromBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Encrypt an object (converts to JSON first)
   */
  async encryptObject<T>(obj: T, masterKey: Uint8Array): Promise<string> {
    const json = JSON.stringify(obj);
    return this.encrypt(json, masterKey);
  }

  /**
   * Decrypt to an object (parses JSON after decryption)
   */
  async decryptObject<T>(encryptedData: string, masterKey: Uint8Array): Promise<T> {
    const json = await this.decrypt(encryptedData, masterKey);
    return JSON.parse(json);
  }

  /**
   * Encrypt binary data (for files)
   */
  async encryptBinary(data: Uint8Array, masterKey: Uint8Array): Promise<Uint8Array> {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      masterKey.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return combined;
  }

  /**
   * Decrypt binary data (for files)
   */
  async decryptBinary(encryptedData: Uint8Array, masterKey: Uint8Array): Promise<Uint8Array> {
    // Extract IV and encrypted data
    const iv = encryptedData.slice(0, this.IV_LENGTH);
    const encryptedBuffer = encryptedData.slice(this.IV_LENGTH);

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      masterKey.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      encryptedBuffer
    );

    return new Uint8Array(decryptedBuffer);
  }

  /**
   * Create PIN verification hash (encrypt known constant)
   */
  async createPinVerification(masterKey: Uint8Array): Promise<string> {
    const VERIFICATION_CONSTANT = 'HUSHKEY_PIN_VERIFICATION';
    return await this.encrypt(VERIFICATION_CONSTANT, masterKey);
  }

  /**
   * Verify PIN by attempting to decrypt verification hash
   */
  async verifyPin(verificationHash: string, masterKey: Uint8Array): Promise<boolean> {
    try {
      const VERIFICATION_CONSTANT = 'HUSHKEY_PIN_VERIFICATION';
      const decrypted = await this.decrypt(verificationHash, masterKey);
      return decrypted === VERIFICATION_CONSTANT;
    } catch {
      return false;
    }
  }
}

export default new EncryptionService();
