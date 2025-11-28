/**
 * IndexedDB Service using Dexie
 * For offline-first caching of encrypted data
 */

import Dexie, { Table } from 'dexie';

interface SyncRecord {
  id: string;
  lastSynced: string;
  pendingChanges: number;
}

interface VaultRecord {
  id: string;
  userId: string;
  nameEncrypted: string;
  descriptionEncrypted?: string;
  icon: string;
  isShared: boolean;
  sharedWith: string[];
  notesEncrypted?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface ItemRecord {
  id: string;
  vaultId: string;
  categoryId?: string;
  type: string;
  dataEncrypted: string;
  isFavorite: boolean;
  folder?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface CategoryRecord {
  id: string;
  userId: string;
  nameEncrypted: string;
  color: string;
  createdAt: string;
}

interface MetadataRecord {
  key: string;
  [key: string]: any;
}

class HushkeyDB extends Dexie {
  vaults!: Table<VaultRecord>;
  items!: Table<ItemRecord>;
  categories!: Table<CategoryRecord>;
  sync!: Table<SyncRecord>;
  metadata!: Table<MetadataRecord>;

  constructor() {
    super('HushkeyDB');
    
    this.version(1).stores({
      vaults: 'id, userId, nameEncrypted, createdAt',
      items: 'id, vaultId, dataEncrypted, type, createdAt',
      categories: 'id, userId, nameEncrypted',
      sync: 'id, lastSynced, pendingChanges'
    });

    this.version(2).stores({
      vaults: 'id, userId, nameEncrypted, createdAt',
      items: 'id, vaultId, dataEncrypted, type, createdAt',
      categories: 'id, userId, nameEncrypted',
      sync: 'id, lastSynced, pendingChanges',
      metadata: 'key'
    });
  }
}

const db = new HushkeyDB();

class IndexedDBService {
  /**
   * Save a single vault to IndexedDB
   */
  async saveVault(vault: VaultRecord): Promise<void> {
    await db.vaults.put(vault);
  }

  /**
   * Bulk save vaults
   */
  async bulkSaveVaults(vaults: VaultRecord[]): Promise<void> {
    await db.vaults.bulkPut(vaults);
  }

  /**
   * Get all vaults for a user
   */
  async getVaults(userId: string): Promise<VaultRecord[]> {
    return await db.vaults.where('userId').equals(userId).toArray();
  }

  /**
   * Get a single vault by ID
   */
  async getVault(id: string): Promise<VaultRecord | undefined> {
    return await db.vaults.get(id);
  }

  /**
   * Delete a vault from IndexedDB
   */
  async deleteVault(id: string): Promise<void> {
    await db.vaults.delete(id);
  }

  /**
   * Save a single item (vault item) to IndexedDB
   */
  async saveVaultItem(item: ItemRecord): Promise<void> {
    await db.items.put(item);
  }

  /**
   * Bulk save items
   */
  async bulkSaveItems(items: ItemRecord[]): Promise<void> {
    await db.items.bulkPut(items);
  }

  /**
   * Get all items for a vault
   */
  async getVaultItems(vaultId: string): Promise<ItemRecord[]> {
    return await db.items.where('vaultId').equals(vaultId).toArray();
  }

  /**
   * Get a single item by ID
   */
  async getItem(id: string): Promise<ItemRecord | undefined> {
    return await db.items.get(id);
  }

  /**
   * Delete an item from IndexedDB
   */
  async deleteItem(id: string): Promise<void> {
    await db.items.delete(id);
  }

  /**
   * Save a category
   */
  async saveCategory(category: CategoryRecord): Promise<void> {
    await db.categories.put(category);
  }

  /**
   * Bulk save categories
   */
  async bulkSaveCategories(categories: CategoryRecord[]): Promise<void> {
    await db.categories.bulkPut(categories);
  }

  /**
   * Get all categories for a user
   */
  async getCategories(userId: string): Promise<CategoryRecord[]> {
    return await db.categories.where('userId').equals(userId).toArray();
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    await db.categories.delete(id);
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: string, lastSynced: string, pendingChanges: number): Promise<void> {
    await db.sync.put({ id, lastSynced, pendingChanges });
  }

  /**
   * Get sync status
   */
  async getSyncStatus(id: string): Promise<SyncRecord | undefined> {
    return await db.sync.get(id);
  }

  /**
   * Clear all data from IndexedDB
   */
  async clearAll(): Promise<void> {
    await db.vaults.clear();
    await db.items.clear();
    await db.categories.clear();
    await db.sync.clear();
    await db.metadata.clear();
  }

  async saveUserProfile(userId: string, salt: string): Promise<void> {
    await db.metadata.put({ key: `profile_${userId}`, salt, updated_at: new Date().toISOString() });
  }

  async saveSettings(userId: string, settings: any): Promise<void> {
    await db.metadata.put({ key: `settings_${userId}`, ...settings, updated_at: new Date().toISOString() });
  }

  async saveDevice(userId: string, deviceId: string, deviceName?: string): Promise<void> {
    await db.metadata.put({ key: `device_${userId}`, deviceId, deviceName, last_seen: new Date().toISOString() });
  }

  async logActivity(userId: string, action: string, details: string): Promise<void> {
    const log = {
      key: `log_${crypto.randomUUID()}`,
      userId,
      action,
      details,
      created_at: new Date().toISOString(),
    };
    await db.metadata.put(log);
  }

  /**
   * Get database instance (for advanced queries)
   */
  getDB(): HushkeyDB {
    return db;
  }
}

export default new IndexedDBService();
export type { VaultRecord, ItemRecord, CategoryRecord, SyncRecord };
