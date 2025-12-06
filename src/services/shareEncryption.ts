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
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return EncryptionService.toBase64(new Uint8Array(hashBuffer))
  }

  shareKeyToString(key: Uint8Array): string {
    return EncryptionService.toBase64(key)
  }

  stringToShareKey(keyString: string): Uint8Array {
    return EncryptionService.fromBase64(keyString)
  }
}

export default new ShareEncryptionService()
