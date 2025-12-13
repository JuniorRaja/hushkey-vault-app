import { Item, ItemType, Vault, Category, UserSettings } from "../../types";
import CSVExporter from "./csvExporter";
import ZIPService from "./zipService";
import HushKeyBackupService, { BackupData } from "./hushkeyBackup";
import DatabaseService from "./database";
import { supabase } from "../supabaseClient";
import JSZip from "jszip";

export interface BackupOptions {
  format: "csv" | "zip" | "hkb" | "raw_csv" | "raw_zip";
  password?: string;
  pin?: string;
  includeAttachments?: boolean;
}

export interface BackupProgress {
  stage: "preparing" | "encrypting" | "compressing" | "finalizing";
  progress: number;
  currentItem?: string;
  total?: number;
  current?: number;
}

export interface RestoreResult {
  success: boolean;
  itemsRestored: number;
  vaultsRestored: number;
  categoriesRestored: number;
  errors: string[];
}

export interface BackupHealth {
  status: "healthy" | "warning" | "critical";
  daysSinceLastBackup: number;
  totalBackups: number;
  lastBackupItemCount: number;
  recommendation: string;
}

class BackupService {
  async createBackup(
    options: BackupOptions,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<Blob> {
    const { format, password, pin } = options;

    // Get master key first to fail fast if not available
    const masterKey = await this.getMasterKey();

    onProgress?.({ stage: "preparing", progress: 10 });

    const items = await this.getAllItems(masterKey);
    const vaults = await this.getAllVaults(masterKey);
    const categories = await this.getAllCategories(masterKey);
    const settings = await this.getUserSettings();

    onProgress?.({
      stage: "encrypting",
      progress: 30,
      total: items.length,
      current: 0,
    });

    let blob: Blob;

    if (format === "csv") {
      blob = await this.exportToCSV(items, masterKey, onProgress);
    } else if (format === "zip") {
      if (!password) throw new Error("Password required for ZIP backup");
      blob = await this.exportToZIP(items, masterKey, password, onProgress);
    } else if (format === "raw_csv") {
      blob = await this.exportToRawCSV(
        { vaults, categories, items },
        onProgress
      );
    } else if (format === "raw_zip") {
      blob = await this.exportToRawZIP(
        { vaults, categories, items },
        onProgress
      );
    } else {
      if (!pin) throw new Error("PIN required for HKB backup");

      blob = await this.exportToHKB(
        { vaults, items, categories, settings },
        pin,
        onProgress
      );
    }

    onProgress?.({ stage: "finalizing", progress: 95 });

    await this.recordBackup(format, items.length, blob.size);

    onProgress?.({ stage: "finalizing", progress: 100 });

    return blob;
  }

  private async exportToCSV(
    items: Item[],
    masterKey: Uint8Array,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<Blob> {
    const files: { name: string; content: string }[] = [];
    const types = Object.values(ItemType);

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const typeItems = items.filter((item) => item.type === type);

      if (typeItems.length > 0) {
        onProgress?.({
          stage: "encrypting",
          progress: 30 + (i / types.length) * 50,
          currentItem: type,
          total: types.length,
          current: i + 1,
        });

        const csv = await CSVExporter.exportByType(items, type);
        files.push({ name: `${type.toLowerCase()}.csv`, content: csv });
      }
    }

    const combinedCSV = files
      .map((f) => `=== ${f.name} ===\n${f.content}`)
      .join("\n\n");
    return new Blob([combinedCSV], { type: "text/csv" });
  }

  private async exportToZIP(
    items: Item[],
    masterKey: Uint8Array,
    password: string,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<Blob> {
    const files: { name: string; content: string }[] = [];
    const types = Object.values(ItemType);

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const typeItems = items.filter((item) => item.type === type);

      if (typeItems.length > 0) {
        onProgress?.({
          stage: "encrypting",
          progress: 30 + (i / types.length) * 40,
          currentItem: type,
          total: types.length,
          current: i + 1,
        });

        const csv = await CSVExporter.exportByType(items, type);
        files.push({ name: `${type.toLowerCase()}.csv`, content: csv });
      }
    }

    onProgress?.({ stage: "compressing", progress: 80 });

    const zipBlob = await ZIPService.createPasswordProtectedZip(
      files,
      password
    );
    return zipBlob;
  }

  private async exportToHKB(
    data: BackupData,
    pin: string,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<Blob> {
    onProgress?.({ stage: "encrypting", progress: 40 });

    const hkb = await HushKeyBackupService.create(data, pin);

    onProgress?.({ stage: "compressing", progress: 80 });

    const json = JSON.stringify(hkb, null, 2);
    return new Blob([json], { type: "application/json" });
  }

  async exportToRawCSV(
    data: { vaults: Vault[]; categories: Category[]; items: Item[] },
    onProgress?: (progress: BackupProgress) => void
  ): Promise<Blob> {
    const files: { name: string; content: string | Blob }[] = [];

    onProgress?.({ stage: "preparing", progress: 20 });
    files.push({
      name: "vaults.csv",
      content: await CSVExporter.exportVaults(data.vaults),
    });
    files.push({
      name: "categories.csv",
      content: await CSVExporter.exportCategories(data.categories),
    });

    onProgress?.({ stage: "preparing", progress: 40 });
    const types = Object.values(ItemType);
    for (const type of types) {
      const typeItems = data.items.filter((item) => item.type === type);
      if (typeItems.length > 0) {
        const content = await CSVExporter.exportByType(data.items, type);
        files.push({ name: `items_${type.toLowerCase()}.csv`, content });
      }
    }

    onProgress?.({ stage: "compressing", progress: 80 });
    return ZIPService.createZip(files);
  }

  async exportToRawZIP(
    data: { vaults: Vault[]; categories: Category[]; items: Item[] },
    onProgress?: (progress: BackupProgress) => void
  ): Promise<Blob> {
    const files: { name: string; content: string | Blob }[] = [];

    // 1. CSVs (Reusing logic logic or calling exportToRawCSV logic?
    // exportToRawCSV returns a ZIP blob, so we can't reuse it to get files list easily without refactoring.
    // I will duplicate the CSV generation logic here for clean separation or refactor.
    // I'll duplicate for now to avoid breaking exportToRawCSV if that changes.

    onProgress?.({ stage: "preparing", progress: 10 });
    files.push({
      name: "vaults.csv",
      content: await CSVExporter.exportVaults(data.vaults),
    });
    files.push({
      name: "categories.csv",
      content: await CSVExporter.exportCategories(data.categories),
    });

    onProgress?.({ stage: "preparing", progress: 20 });
    const types = Object.values(ItemType);
    for (const type of types) {
      const typeItems = data.items.filter((item) => item.type === type);
      if (typeItems.length > 0) {
        const content = await CSVExporter.exportByType(data.items, type);
        files.push({ name: `items_${type.toLowerCase()}.csv`, content });
      }
    }

    // 2. Attachments
    onProgress?.({ stage: "preparing", progress: 40 });

    let attachmentCount = 0;
    for (const item of data.items) {
      // Check for attachments in data
      // Use type assertion or check check property existence safely
      const itemData = item.data as any;
      if (itemData.attachments && Array.isArray(itemData.attachments)) {
        for (const att of itemData.attachments) {
          if (att.data && att.name) {
            // Assuming att.data is Base64 string from DB/Storage retrieval
            try {
              const blob = await fetch(att.data).then((res) => res.blob());
              // Or if it's raw base64 string without data URI scheme:
              // const blob = base64ToBlob(att.data, att.type);
              // But typically file data in JS objects might be data URI.
              // Let's assume it's data URI or handle raw base64.

              // If it's a raw base64 string (no "data:...")
              let finalBlob: Blob;
              if (att.data.startsWith("data:")) {
                finalBlob = await (await fetch(att.data)).blob();
              } else {
                // Simple Base64 to Blob
                const byteCharacters = atob(att.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                finalBlob = new Blob([byteArray], {
                  type: att.type || "application/octet-stream",
                });
              }

              // Path: attachments/{itemId}/{filename}
              // We replace slashes in filename to avoid deeper nesting
              const safeName = att.name.replace(/\//g, "_");
              files.push({
                name: `attachments/${item.id}/${safeName}`,
                content: finalBlob,
              });
              attachmentCount++;
            } catch (e) {
              console.warn(`Failed to process attachment ${att.name}`, e);
            }
          }
        }
      }
    }

    onProgress?.({ stage: "compressing", progress: 80 });
    return ZIPService.createZip(files);
  }

  async parseRawZip(file: File): Promise<BackupData | null> {
    try {
      const zip = await JSZip.loadAsync(file);
      const backupData: BackupData = {
        vaults: [],
        categories: [],
        items: [],
        settings: null,
      };

      // 1. Vaults
      const vaultsFile = zip.file("vaults.csv");
      if (vaultsFile) {
        const text = await vaultsFile.async("string");
        const rows = await CSVExporter.parse(text);
        backupData.vaults = rows.map((r: any) => ({
          id: r["ID"],
          name: r["Name"],
          description: r["Description"],
          createdAt: r["Created"],
          itemCount: parseInt(r["Items Count"] || "0"),
          // Defaults for missing fields in CSV
          icon: "shield",
          isShared: false,
          sharedWith: [],
          notes: "",
        })) as Vault[];
      }

      // 2. Categories
      const categoriesFile = zip.file("categories.csv");
      if (categoriesFile) {
        const text = await categoriesFile.async("string");
        const rows = await CSVExporter.parse(text);
        backupData.categories = rows.map((r: any) => ({
          id: r["ID"],
          name: r["Name"],
          color: r["Color"],
        })) as Category[];
      }

      // 3. Items
      const itemFiles = Object.keys(zip.files).filter(
        (f) => f.startsWith("items_") && f.endsWith(".csv")
      );

      for (const fileName of itemFiles) {
        const text = await zip.file(fileName)?.async("string");
        if (!text) continue;

        const typeStr = fileName
          .replace("items_", "")
          .replace(".csv", "")
          .toUpperCase();

        const rows = await CSVExporter.parse(text);
        for (const r of rows) {
          const baseItem: any = {
            id: crypto.randomUUID(),
            name: r["Name"],
            notes: r["Notes"],
            vaultId: r["Vault"],
            categoryId: r["Category"],
            isFavorite: r["Favorite"] === "true",
            lastUpdated: r["Updated"] || new Date().toISOString(),
            createdAt: r["Created"] || new Date().toISOString(),
            type: typeStr as ItemType,
            data: {},
          };

          if (typeStr === "LOGIN") {
            baseItem.data = {
              username: r["Username"],
              password: r["Password"],
              url: r["URL"],
              totp: r["TOTP Secret"],
              notes: r["Notes"],
            };
          } else if (typeStr === "IMPORTANT_NOTE") {
            // Mapped from NOTE
            baseItem.data = {
              content: r["Content"],
            };
          } else if (typeStr === "NOTE") {
            // Handle both just in case
            baseItem.type = ItemType.NOTE;
            baseItem.data = { content: r["Content"] };
          } else if (typeStr === "CARD") {
            baseItem.data = {
              holderName: r["Cardholder Name"],
              number: r["Card Number"],
              expiry: `${r["Expiry Month"]}/${r["Expiry Year"]}`,
              cvv: r["CVV"],
              pin: r["PIN"],
            };
          }
          // Support other common types roughly or fallback to just basic data

          backupData.items.push(baseItem as Item);
        }
      }

      return backupData;
    } catch (error) {
      console.error("Failed to parse raw ZIP", error);
      return null;
    }
  }

  async isEncryptedZip(file: File): Promise<boolean> {
    try {
      const zip = await JSZip.loadAsync(file);
      // Check for .enc files
      return Object.keys(zip.files).some((f) => f.endsWith(".enc"));
    } catch {
      return false;
    }
  }

  async parseEncryptedZip(
    file: File,
    password: string
  ): Promise<BackupData | null> {
    try {
      const decryptedFiles = await ZIPService.decryptZip(file, password);

      const backupData: BackupData = {
        vaults: [],
        categories: [],
        items: [],
        settings: null,
      };

      // 1. Vaults
      if (decryptedFiles["vaults.csv"]) {
        const rows = await CSVExporter.parse(decryptedFiles["vaults.csv"]);
        backupData.vaults = rows.map((r: any) => ({
          id: r["ID"],
          name: r["Name"],
          description: r["Description"],
          createdAt: r["Created"],
          itemCount: parseInt(r["Items Count"] || "0"),
          icon: "shield",
          isShared: false,
          sharedWith: [],
          notes: "",
        })) as Vault[];
      }

      // 2. Categories
      if (decryptedFiles["categories.csv"]) {
        const rows = await CSVExporter.parse(decryptedFiles["categories.csv"]);
        backupData.categories = rows.map((r: any) => ({
          id: r["ID"],
          name: r["Name"],
          color: r["Color"],
        })) as Category[];
      }

      // 3. Items
      const allCsvs = Object.keys(decryptedFiles).filter(
        (f) =>
          f.endsWith(".csv") && f !== "vaults.csv" && f !== "categories.csv"
      );

      for (const fileName of allCsvs) {
        const text = decryptedFiles[fileName];
        const typeStr = fileName
          .replace("items_", "") // Handle items_ prefix if present
          .replace(".csv", "")
          .toUpperCase();

        const rows = await CSVExporter.parse(text);

        for (const r of rows) {
          const baseItem: any = {
            id: crypto.randomUUID(),
            name: r["Name"],
            notes: r["Notes"],
            vaultId: r["Vault"],
            categoryId: r["Category"],
            isFavorite: r["Favorite"] === "true",
            lastUpdated: r["Updated"] || new Date().toISOString(),
            createdAt: r["Created"] || new Date().toISOString(),
            type: typeStr as ItemType,
            data: {},
          };

          if (typeStr === "LOGIN") {
            baseItem.data = {
              username: r["Username"],
              password: r["Password"],
              url: r["URL"],
              totp: r["TOTP Secret"],
              notes: r["Notes"],
            };
          } else if (typeStr === "IMPORTANT_NOTE") {
            baseItem.data = { content: r["Content"] };
          } else if (typeStr === "NOTE") {
            baseItem.type = ItemType.NOTE;
            baseItem.data = { content: r["Content"] };
          } else if (typeStr === "CARD") {
            baseItem.data = {
              holderName: r["Cardholder Name"],
              number: r["Card Number"],
              expiry: `${r["Expiry Month"]}/${r["Expiry Year"]}`,
              cvv: r["CVV"],
              pin: r["PIN"],
            };
          }

          backupData.items.push(baseItem as Item);
        }
      }

      return backupData;
    } catch (error) {
      console.error("Failed to parse encrypted ZIP", error);
      return null;
    }
  }

  async restoreFromHKB(
    file: File,
    pin: string,
    masterKey: Uint8Array,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<RestoreResult> {
    const result: RestoreResult = {
      success: false,
      itemsRestored: 0,
      vaultsRestored: 0,
      categoriesRestored: 0,
      errors: [],
    };

    try {
      onProgress?.({ stage: "preparing", progress: 10 });

      const content = await file.text();
      const hkb = JSON.parse(content);

      const isValidPIN = await HushKeyBackupService.validatePIN(hkb, pin);
      if (!isValidPIN) {
        result.errors.push("Invalid PIN");
        return result;
      }

      onProgress?.({ stage: "encrypting", progress: 30 });

      const data = await HushKeyBackupService.restore(hkb, pin, masterKey);

      onProgress?.({ stage: "finalizing", progress: 60 });

      const userId = await this.getUserId();

      for (const vault of data.vaults) {
        try {
          await DatabaseService.createVault(
            userId,
            vault.name,
            vault.icon,
            masterKey,
            vault.description
          );
          result.vaultsRestored++;
        } catch (error) {
          result.errors.push(`Failed to restore vault: ${vault.name}`);
        }
      }

      for (const category of data.categories) {
        try {
          await DatabaseService.createCategory(
            userId,
            category.name,
            category.color,
            masterKey
          );
          result.categoriesRestored++;
        } catch (error) {
          result.errors.push(`Failed to restore category: ${category.name}`);
        }
      }

      for (const item of data.items) {
        try {
          await DatabaseService.createItem(item.vaultId, item, masterKey);
          result.itemsRestored++;
        } catch (error) {
          result.errors.push(`Failed to restore item: ${item.id}`);
        }
      }

      onProgress?.({ stage: "finalizing", progress: 100 });

      result.success = true;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    return result;
  }

  async validateHKBFile(file: File, pin: string): Promise<boolean> {
    try {
      const content = await file.text();
      const hkb = JSON.parse(content);
      return await HushKeyBackupService.validatePIN(hkb, pin);
    } catch (error) {
      return false;
    }
  }

  async recordBackup(
    type: string,
    itemCount: number,
    fileSize: number
  ): Promise<void> {
    const userId = await this.getUserId();

    await supabase.from("backup_history").insert({
      user_id: userId,
      backup_type: type,
      item_count: itemCount,
      file_size_bytes: fileSize,
      status: "completed",
    });

    await supabase
      .from("user_settings")
      .update({
        last_backup_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  async getLastBackupDate(): Promise<Date | null> {
    const userId = await this.getUserId();

    const { data } = await supabase
      .from("user_settings")
      .select("last_backup_at")
      .eq("user_id", userId)
      .single();

    return data?.last_backup_at ? new Date(data.last_backup_at) : null;
  }

  async getBackupHealth(): Promise<BackupHealth> {
    const userId = await this.getUserId();

    const { data: settings } = await supabase
      .from("user_settings")
      .select("last_backup_at, backup_frequency_days")
      .eq("user_id", userId)
      .single();

    const { data: history, count } = await supabase
      .from("backup_history")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastBackup = settings?.last_backup_at
      ? new Date(settings.last_backup_at)
      : null;
    const daysSince = lastBackup
      ? Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const frequency = settings?.backup_frequency_days || 30;

    let status: "healthy" | "warning" | "critical" = "healthy";
    let recommendation = "Your backups are up to date";

    if (daysSince > frequency * 2) {
      status = "critical";
      recommendation = `Critical: Last backup was ${daysSince} days ago. Create a backup immediately!`;
    } else if (daysSince > frequency) {
      status = "warning";
      recommendation = `Warning: Last backup was ${daysSince} days ago. Consider creating a backup soon.`;
    } else if (!lastBackup) {
      status = "critical";
      recommendation = "No backups found. Create your first backup now!";
    }

    return {
      status,
      daysSinceLastBackup: daysSince,
      totalBackups: count || 0,
      lastBackupItemCount: history?.[0]?.item_count || 0,
      recommendation,
    };
  }

  private async getAllItems(masterKey: Uint8Array): Promise<Item[]> {
    const userId = await this.getUserId();
    return DatabaseService.getAllItems(userId, masterKey);
  }

  private async getAllVaults(masterKey: Uint8Array): Promise<Vault[]> {
    const userId = await this.getUserId();
    return DatabaseService.getVaults(userId, masterKey);
  }

  private async getAllCategories(masterKey: Uint8Array): Promise<Category[]> {
    const userId = await this.getUserId();
    return DatabaseService.getCategories(userId, masterKey);
  }

  private async getUserSettings(): Promise<UserSettings | null> {
    const userId = await this.getUserId();
    return DatabaseService.getUserSettings(userId);
  }

  private async getUserId(): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    return user.id;
  }

  private async getMasterKey(): Promise<Uint8Array> {
    const authStore = await import("../stores/authStore");
    const masterKey = authStore.useAuthStore.getState().masterKey;
    if (!masterKey)
      throw new Error(
        "Master key not available. Please unlock your vault first."
      );
    return masterKey;
  }

  private async getUserSalt(): Promise<string> {
    const userId = await this.getUserId();
    const { data } = await supabase
      .from("user_profiles")
      .select("salt")
      .eq("user_id", userId)
      .single();
    return data?.salt || "";
  }

  private async getPinHash(): Promise<string> {
    const masterKey = await this.getMasterKey();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      masterKey.buffer as ArrayBuffer
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

export default new BackupService();
