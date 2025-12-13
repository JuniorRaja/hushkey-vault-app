import JSZip from "jszip";

class ZIPService {
  async createZip(
    files: { name: string; content: string | Blob }[]
  ): Promise<Blob> {
    const zip = new JSZip();

    for (const file of files) {
      zip.file(file.name, file.content);
    }

    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    return zipBlob;
  }

  async createPasswordProtectedZip(
    files: { name: string; content: string }[],
    password: string
  ): Promise<Blob> {
    const zip = new JSZip();

    // Encrypt each file content before adding to ZIP
    for (const file of files) {
      const encrypted = await this.encryptString(file.content, password);
      zip.file(file.name + ".enc", encrypted);
    }

    // Generate ZIP without additional encryption
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    return zipBlob;
  }

  private async encryptString(
    content: string,
    password: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    const passwordKey = await this.deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      passwordKey,
      data
    );

    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for storage in ZIP
    return btoa(String.fromCharCode(...result));
  }

  async decryptZip(
    zipBlob: Blob,
    password: string
  ): Promise<{ [key: string]: string }> {
    const zip = new JSZip();
    await zip.loadAsync(zipBlob);

    const decryptedFiles: { [key: string]: string } = {};

    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir && filename.endsWith(".enc")) {
        const encryptedContent = await file.async("string");
        const decrypted = await this.decryptString(encryptedContent, password);
        const originalName = filename.replace(".enc", "");
        decryptedFiles[originalName] = decrypted;
      }
    }

    return decryptedFiles;
  }

  private async decryptString(
    encryptedBase64: string,
    password: string
  ): Promise<string> {
    // Decode from base64
    const encryptedData = Uint8Array.from(atob(encryptedBase64), (c) =>
      c.charCodeAt(0)
    );

    const iv = encryptedData.slice(0, 12);
    const data = encryptedData.slice(12);

    const passwordKey = await this.deriveKey(password);

    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      passwordKey,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  private async deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
      "raw",
      passwordData,
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    const salt = encoder.encode("hushkey-zip-salt-v1");

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
}

export default new ZIPService();
