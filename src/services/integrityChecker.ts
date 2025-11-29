/**
 * Data Integrity Checker Service
 * Implements HMAC-based integrity verification for stored data
 */

class IntegrityCheckerService {
  private integrityKey: CryptoKey | null = null;

  /**
   * Initialize integrity key
   */
  async initialize(masterKey: Uint8Array): Promise<void> {
    this.integrityKey = await crypto.subtle.importKey(
      'raw',
      masterKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }

  /**
   * Generate HMAC signature for data
   */
  async generateSignature(data: string): Promise<string> {
    if (!this.integrityKey) {
      throw new Error('Integrity key not initialized');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      this.integrityKey,
      dataBuffer
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  /**
   * Verify HMAC signature for data
   */
  async verifySignature(data: string, signature: string): Promise<boolean> {
    if (!this.integrityKey) {
      throw new Error('Integrity key not initialized');
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

      return await crypto.subtle.verify(
        'HMAC',
        this.integrityKey,
        signatureBuffer,
        dataBuffer
      );
    } catch {
      return false;
    }
  }

  /**
   * Create signed data package
   */
  async createSignedPackage(data: any): Promise<{ data: string; signature: string }> {
    const dataStr = JSON.stringify(data);
    const signature = await this.generateSignature(dataStr);
    
    return { data: dataStr, signature };
  }

  /**
   * Verify and extract signed data package
   */
  async verifySignedPackage(pkg: { data: string; signature: string }): Promise<any> {
    const isValid = await this.verifySignature(pkg.data, pkg.signature);
    
    if (!isValid) {
      throw new Error('Data integrity check failed - data may be corrupted or tampered');
    }

    return JSON.parse(pkg.data);
  }

  /**
   * Clear integrity key from memory
   */
  clear(): void {
    this.integrityKey = null;
  }
}

export default new IntegrityCheckerService();
