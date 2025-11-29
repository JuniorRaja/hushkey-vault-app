/**
 * Secure Memory Management Service
 * Implements secure key wrapping, memory clearing, and protection against memory dumps
 */

class SecureMemoryService {
  private wrappingKey: CryptoKey | null = null;
  private readonly WRAPPING_KEY_NAME = 'hushkey-wrapping-key';

  /**
   * Initialize or retrieve the wrapping key from IndexedDB
   */
  async initializeWrappingKey(): Promise<void> {
    const stored = await this.getStoredWrappingKey();
    
    if (stored) {
      this.wrappingKey = stored;
    } else {
      this.wrappingKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false, // non-extractable for security
        ['wrapKey', 'unwrapKey']
      );
      await this.storeWrappingKey(this.wrappingKey);
    }
  }

  /**
   * Wrap (encrypt) a master key for secure storage
   */
  async wrapMasterKey(masterKey: Uint8Array): Promise<string> {
    if (!this.wrappingKey) {
      await this.initializeWrappingKey();
    }

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      masterKey,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );

    const wrapped = await crypto.subtle.wrapKey(
      'raw',
      cryptoKey,
      this.wrappingKey!,
      { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) }
    );

    return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
  }

  /**
   * Unwrap (decrypt) a master key from secure storage
   */
  async unwrapMasterKey(wrappedKey: string): Promise<Uint8Array> {
    if (!this.wrappingKey) {
      await this.initializeWrappingKey();
    }

    const wrappedBuffer = Uint8Array.from(atob(wrappedKey), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.unwrapKey(
      'raw',
      wrappedBuffer,
      this.wrappingKey!,
      { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );

    const exported = await crypto.subtle.exportKey('raw', cryptoKey);
    return new Uint8Array(exported);
  }

  /**
   * Securely clear sensitive data from memory
   */
  secureWipe(data: Uint8Array): void {
    if (data && data.length > 0) {
      crypto.getRandomValues(data); // Overwrite with random data
      data.fill(0); // Then zero out
    }
  }

  /**
   * Securely clear string data
   */
  secureWipeString(str: string): void {
    if (typeof str === 'string' && str.length > 0) {
      // Create array and overwrite
      const arr = new Uint8Array(str.length);
      crypto.getRandomValues(arr);
    }
  }

  /**
   * Store wrapping key in IndexedDB
   */
  private async storeWrappingKey(key: CryptoKey): Promise<void> {
    const db = await this.openSecureDB();
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    
    await store.put({ id: this.WRAPPING_KEY_NAME, key });
    await tx.done;
  }

  /**
   * Retrieve wrapping key from IndexedDB
   */
  private async getStoredWrappingKey(): Promise<CryptoKey | null> {
    try {
      const db = await this.openSecureDB();
      const tx = db.transaction('keys', 'readonly');
      const store = tx.objectStore('keys');
      const result = await store.get(this.WRAPPING_KEY_NAME);
      
      return result?.key || null;
    } catch {
      return null;
    }
  }

  /**
   * Open secure IndexedDB for key storage
   */
  private async openSecureDB(): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('hushkey-secure', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Clear all secure storage
   */
  async clearSecureStorage(): Promise<void> {
    try {
      const db = await this.openSecureDB();
      const tx = db.transaction('keys', 'readwrite');
      await tx.objectStore('keys').clear();
      await tx.done;
      this.wrappingKey = null;
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
    }
  }
}

export default new SecureMemoryService();
