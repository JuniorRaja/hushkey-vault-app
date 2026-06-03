import EncryptionService from './encryption'

class ShareEncryptionService {
  async generateShareToken(): Promise<string> {
    const bytes = crypto.getRandomValues(new Uint8Array(24))
    return Array.from(bytes, b => b.toString(36)).join('').substring(0, 32)
  }

  async generateShareKey(): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(32))
  }

  async encryptForShare(data: any, shareKey: Uint8Array): Promise<string> {
    return await EncryptionService.encryptObject(data, shareKey)
  }

  async decryptShare<T>(encryptedData: string, shareKey: Uint8Array): Promise<T> {
    return await EncryptionService.decryptObject<T>(encryptedData, shareKey)
  }

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      keyMaterial,
      256
    )
    return 'pbkdf2:' + EncryptionService.toBase64(salt) + ':' + EncryptionService.toBase64(new Uint8Array(derivedBits))
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash.startsWith('pbkdf2:')) {
      // Legacy SHA-256 path for shares created before this fix
      const encoder = new TextEncoder()
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password))
      return EncryptionService.toBase64(new Uint8Array(hashBuffer)) === storedHash
    }
    const parts = storedHash.split(':')
    if (parts.length !== 3) return false
    const salt = EncryptionService.fromBase64(parts[1])
    const expected = EncryptionService.fromBase64(parts[2])
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      keyMaterial,
      256
    )
    const derived = new Uint8Array(derivedBits)
    if (derived.length !== expected.length) return false
    // Constant-time comparison to prevent timing attacks
    let diff = 0
    for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i]
    return diff === 0
  }

  shareKeyToString(key: Uint8Array): string {
    return EncryptionService.toBase64(key)
  }

  stringToShareKey(keyString: string): Uint8Array {
    return EncryptionService.fromBase64(keyString)
  }
}

export default new ShareEncryptionService()
