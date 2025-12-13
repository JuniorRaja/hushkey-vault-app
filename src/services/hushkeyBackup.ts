import EncryptionService from "./encryption";
import { Item, Vault, Category, UserSettings } from "../../types";

export interface HKBFormat {
  version: string;
  timestamp: string;
  salt: string;
  pinHash: string;
  wrappedKey?: string; // New in V2
  data: {
    vaults: string;
    items: string;
    categories: string;
    settings: string;
  };
  integrity: string;
}

export interface BackupData {
  vaults: Vault[];
  items: Item[];
  categories: Category[];
  settings: UserSettings | null;
}

class HushKeyBackupService {
  private readonly VERSION = "2.0"; // Bumped version

  // Version 2.0: Portable Backup
  // 1. Generate random Transient Key (32 bytes)
  // 2. Encrypt Data with Transient Key
  // 3. Derive Key from PIN + Salt
  // 4. Encrypt Transient Key with PIN-Key -> Wrapped Key
  // 5. Store Wrapped Key, Salt, Data

  async create(
    data: BackupData,
    pin: string // Need PIN to encrypt the key
  ): Promise<HKBFormat> {
    const salt = await EncryptionService.generateSalt();
    const pinKey = await EncryptionService.deriveMasterKey(pin, salt);
    const pinHash = await this.hashKey(pinKey); // For verification

    // Generate transient key for data encryption
    const transientKey = await EncryptionService.generateKey();

    // Encrypt data with transient key
    const vaultsEncrypted = await EncryptionService.encryptObject(
      data.vaults,
      transientKey
    );
    const itemsEncrypted = await EncryptionService.encryptObject(
      data.items,
      transientKey
    );
    const categoriesEncrypted = await EncryptionService.encryptObject(
      data.categories,
      transientKey
    );
    const settingsEncrypted = await EncryptionService.encryptObject(
      data.settings,
      transientKey
    );

    // Wrap the transient key with PIN key
    // Encrypt the raw bytes of the transient key
    const wrappedKey = await EncryptionService.encrypt(
      JSON.stringify(Array.from(transientKey)),
      pinKey
    );

    const hkb: HKBFormat = {
      version: this.VERSION,
      timestamp: new Date().toISOString(),
      salt,
      pinHash,
      wrappedKey,
      data: {
        vaults: vaultsEncrypted,
        items: itemsEncrypted,
        categories: categoriesEncrypted,
        settings: settingsEncrypted,
      },
      integrity: "",
    };

    hkb.integrity = await this.generateIntegrityHash(hkb);
    return hkb;
  }

  async restore(
    hkb: HKBFormat,
    pin: string,
    masterKey?: Uint8Array
  ): Promise<BackupData> {
    const isValid = await this.verifyIntegrity(hkb);
    if (!isValid) {
      throw new Error("Backup file integrity check failed");
    }

    let decryptKey: Uint8Array;

    if (hkb.version === "2.0" && hkb.wrappedKey) {
      // V2: Derive PIN key -> Unwrap Transient Key
      const pinKey = await EncryptionService.deriveMasterKey(pin, hkb.salt);
      const pinHash = await this.hashKey(pinKey);

      if (pinHash !== hkb.pinHash) {
        throw new Error("Invalid PIN");
      }

      const transientKeyJson = await EncryptionService.decrypt(
        hkb.wrappedKey,
        pinKey
      );
      const transientKeyArray = JSON.parse(transientKeyJson) as number[];
      decryptKey = new Uint8Array(transientKeyArray);
    } else {
      // V1: Legacy, uses Master Key directly (if provided)
      // Or V1 might have reused PIN logic if masterKey was derived from PIN.
      // Current codebase passed 'masterKey' to restore.
      if (!masterKey) {
        // Try deriving from PIN as fallback for V1 if it matches current account logic
        // But V1 HKB stores data encrypted with the ACCOUNT'S master key.
        // Correct V1 restore requires the Account Master Key.
        throw new Error(
          "This is a legacy backup requiring the Master Key. Please unlock deeply to restore."
        );
      }
      decryptKey = masterKey;
    }

    const vaults = await EncryptionService.decryptObject<Vault[]>(
      hkb.data.vaults,
      decryptKey
    );
    const items = await EncryptionService.decryptObject<Item[]>(
      hkb.data.items,
      decryptKey
    );
    const categories = await EncryptionService.decryptObject<Category[]>(
      hkb.data.categories,
      decryptKey
    );
    const settings = await EncryptionService.decryptObject<UserSettings>(
      hkb.data.settings,
      decryptKey
    );

    return { vaults, items, categories, settings };
  }

  async validatePIN(hkb: HKBFormat, pin: string): Promise<boolean> {
    try {
      const derivedKey = await EncryptionService.deriveMasterKey(pin, hkb.salt);
      const derivedHash = await this.hashKey(derivedKey);
      return derivedHash === hkb.pinHash;
    } catch (error) {
      return false;
    }
  }

  async validateFile(file: File): Promise<boolean> {
    try {
      const content = await file.text();
      const hkb = JSON.parse(content) as HKBFormat;

      if (
        !hkb.version ||
        !hkb.data ||
        !hkb.integrity ||
        !hkb.salt ||
        !hkb.pinHash
      ) {
        return false;
      }

      return await this.verifyIntegrity(hkb);
    } catch (error) {
      return false;
    }
  }

  private async generateIntegrityHash(hkb: HKBFormat): Promise<string> {
    const dataString = JSON.stringify({
      version: hkb.version,
      timestamp: hkb.timestamp,
      salt: hkb.salt,
      pinHash: hkb.pinHash,
      wrappedKey: hkb.wrappedKey, // Added to integrity check
      data: hkb.data,
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async verifyIntegrity(hkb: HKBFormat): Promise<boolean> {
    const expectedHash = await this.generateIntegrityHash(hkb);
    return expectedHash === hkb.integrity;
  }

  private async hashKey(key: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      key.buffer as ArrayBuffer
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
export default new HushKeyBackupService();
