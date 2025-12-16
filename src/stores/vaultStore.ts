/**
 * Vault Store using Zustand
 * Manages vaults, items, and categories with encryption
 */

import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import DatabaseService from '../services/database';
import IndexedDBService from '../services/indexedDB';
import EncryptionService from '../services/encryption';
import { useAuthStore } from './authStore';
import type { Vault, Item, Category } from '../../types';

interface VaultState {
  vaults: Vault[];
  items: Item[];
  categories: Category[];
  favoriteItems: Item[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
}

interface VaultActions {
  loadVaults: () => Promise<void>;
  createVault: (name: string, icon: string, description?: string, notes?: string) => Promise<void>;
  updateVault: (vaultId: string, updates: Partial<Vault>) => Promise<void>;
  deleteVault: (vaultId: string) => Promise<void>;
  restoreVault: (vaultId: string) => Promise<void>;
  permanentlyDeleteVault: (vaultId: string) => Promise<void>;
  loadItems: (vaultId?: string) => Promise<void>;
  loadFavoriteItems: () => Promise<void>;
  createItem: (vaultId: string, itemData: Partial<Item>) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  restoreItem: (itemId: string) => Promise<void>;
  permanentlyDeleteItem: (itemId: string) => Promise<void>;
  toggleFavorite: (itemId: string) => Promise<void>;
  markItemAccessed: (itemId: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  createCategory: (name: string, color: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  syncWithServer: () => Promise<void>;
  setOnlineStatus: (status: boolean) => void;
}

export const useVaultStore = create<VaultState & VaultActions>((set, get) => ({
  vaults: [],
  items: [],
  categories: [],
  favoriteItems: [],
  isLoading: false,
  error: null,
  isOnline: navigator.onLine,

  async loadVaults() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    set({ isLoading: true });
    
    try {
      if (navigator.onLine) {
        // Online: Fetch from server and rebuild IndexedDB
        const vaults = await DatabaseService.getVaults(user.id, masterKey);
        const vaultsWithCounts = await Promise.all(
          vaults.map(async (v) => ({
            ...v,
            itemCount: await DatabaseService.getVaultItemCount(v.id)
          }))
        );
        
        // Rebuild IndexedDB cache with encrypted data
        const vaultRecords = await Promise.all(
          vaultsWithCounts.map(async (v) => ({
            id: v.id,
            userId: user.id,
            nameEncrypted: await EncryptionService.encrypt(v.name, masterKey),
            descriptionEncrypted: v.description ? await EncryptionService.encrypt(v.description, masterKey) : undefined,
            icon: v.icon,
            isShared: v.isShared,
            sharedWith: v.sharedWith,
            notesEncrypted: v.notes ? await EncryptionService.encrypt(v.notes, masterKey) : undefined,
            createdAt: v.createdAt,
            updatedAt: v.createdAt,
            deletedAt: v.deletedAt
          }))
        );
        
        await IndexedDBService.bulkSaveVaults(vaultRecords);
        set({ vaults: vaultsWithCounts.filter(v => !v.deletedAt), isLoading: false });
      } else {
        // Offline: Load from IndexedDB
        const cachedVaults = await IndexedDBService.getVaults(user.id);
        const vaults = await Promise.all(
          cachedVaults.filter(v => v.nameEncrypted && !v.deletedAt).map(async (v) => ({
            id: v.id,
            name: await EncryptionService.decrypt(v.nameEncrypted, masterKey),
            description: v.descriptionEncrypted ? await EncryptionService.decrypt(v.descriptionEncrypted, masterKey) : undefined,
            icon: v.icon,
            createdAt: v.createdAt,
            itemCount: 0,
            isShared: v.isShared,
            sharedWith: v.sharedWith,
            notes: v.notesEncrypted ? await EncryptionService.decrypt(v.notesEncrypted, masterKey) : undefined,
            deletedAt: v.deletedAt
          }))
        );
        set({ vaults, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load vaults:', error);
      set({ isLoading: false });
    }
  },

  async createVault(name: string, icon: string, description?: string, notes?: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) throw new Error('Not authenticated');

    const vaultId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const vault = {
      id: vaultId,
      name,
      description,
      icon,
      createdAt: timestamp,
      itemCount: 0,
      isShared: false,
      sharedWith: [],
      notes
    };

    // 1. Update local state immediately
    set({ vaults: [...get().vaults, vault] });

    // 2. Save to IndexedDB
    const nameEncrypted = await EncryptionService.encrypt(name, masterKey);
    const descriptionEncrypted = description ? await EncryptionService.encrypt(description, masterKey) : undefined;
    const notesEncrypted = notes ? await EncryptionService.encrypt(notes, masterKey) : undefined;
    
    await IndexedDBService.saveVault({
      id: vaultId,
      userId: user.id,
      nameEncrypted,
      descriptionEncrypted,
      icon,
      isShared: false,
      sharedWith: [],
      notesEncrypted,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine) {
      try {
        await DatabaseService.createVault(user.id, name, icon, masterKey, description, notes);
      } catch (error) {
        console.log('Vault creation failed, queuing for sync');
        await IndexedDBService.queueChange('CREATE', 'vault', vaultId, { name, icon, description, notes });
      }
    } else {
      await IndexedDBService.queueChange('CREATE', 'vault', vaultId, { name, icon, description, notes });
    }
  },

  async updateVault(vaultId: string, updates: Partial<Vault>) {
    const { masterKey } = useAuthStore.getState();
    if (!masterKey) throw new Error('Not authenticated');

    // 1. Update local state immediately
    const vaults = get().vaults.map(v => 
      v.id === vaultId ? { ...v, ...updates } : v
    );
    set({ vaults });

    // 2. Update IndexedDB
    const vault = vaults.find(v => v.id === vaultId);
    if (vault) {
      const nameEncrypted = vault.name ? await EncryptionService.encrypt(vault.name, masterKey) : '';
      const descriptionEncrypted = vault.description ? await EncryptionService.encrypt(vault.description, masterKey) : undefined;
      const notesEncrypted = vault.notes ? await EncryptionService.encrypt(vault.notes, masterKey) : undefined;
      
      await IndexedDBService.saveVault({
        id: vaultId,
        userId: vault.isShared ? '' : vaultId,
        nameEncrypted,
        descriptionEncrypted,
        icon: vault.icon,
        isShared: vault.isShared,
        sharedWith: vault.sharedWith,
        notesEncrypted,
        createdAt: vault.createdAt,
        updatedAt: new Date().toISOString()
      });
    }

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine) {
      try {
        await DatabaseService.updateVault(vaultId, updates, masterKey);
      } catch (error) {
        console.log('Vault update failed, queuing for sync');
        await IndexedDBService.queueChange('UPDATE', 'vault', vaultId, updates);
      }
    } else {
      await IndexedDBService.queueChange('UPDATE', 'vault', vaultId, updates);
    }
  },

  async deleteVault(vaultId: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!masterKey) return;
    
    const timestamp = new Date().toISOString();

    // 1. Update local state - remove from active vaults
    const vaults = get().vaults.filter(v => v.id !== vaultId);
    const items = get().items.filter(i => i.vaultId !== vaultId);
    set({ vaults, items });

    // 2. Update IndexedDB with deletedAt
    const vault = get().vaults.find(v => v.id === vaultId);
    if (vault) {
      await IndexedDBService.saveVault({
        id: vaultId,
        userId: user?.id || '',
        nameEncrypted: await EncryptionService.encrypt(vault.name, masterKey),
        descriptionEncrypted: vault.description ? await EncryptionService.encrypt(vault.description, masterKey) : undefined,
        icon: vault.icon,
        isShared: vault.isShared,
        sharedWith: vault.sharedWith,
        notesEncrypted: vault.notes ? await EncryptionService.encrypt(vault.notes, masterKey) : undefined,
        createdAt: vault.createdAt,
        updatedAt: timestamp,
        deletedAt: timestamp
      });
    }

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine && user) {
      try {
        await DatabaseService.deleteVault(vaultId);
        await supabase.from('items').update({ is_deleted: true, deleted_at: timestamp }).eq('vault_id', vaultId);
        await DatabaseService.logActivity(user.id, 'DELETE', 'Moved vault to trash');
      } catch (error) {
        console.log('Vault deletion failed, queuing for sync');
        await IndexedDBService.queueChange('DELETE', 'vault', vaultId, {});
      }
    } else {
      const existingQueue = await IndexedDBService.getSyncQueue();
      const alreadyQueued = existingQueue.some(q => q.entityId === vaultId && q.action === 'DELETE');
      if (!alreadyQueued) {
        await IndexedDBService.queueChange('DELETE', 'vault', vaultId, {});
      }
    }
  },

  async restoreVault(vaultId: string) {
    try {
      await DatabaseService.restoreVault(vaultId);
      
      // Restore all items in this vault
      await supabase
        .from('items')
        .update({ is_deleted: false, deleted_at: null })
        .eq('vault_id', vaultId);
      
      // Reload vaults and items
      await get().loadVaults();
      await get().loadItems();
    } catch (error) {
      console.error('Failed to restore vault:', error);
      throw error;
    }
  },

  async permanentlyDeleteVault(vaultId: string) {
    try {
      await DatabaseService.permanentlyDeleteVault(vaultId);
      await IndexedDBService.deleteVault(vaultId);
      
      // Remove from local state
      const vaults = get().vaults.filter(v => v.id !== vaultId);
      set({ vaults });
    } catch (error) {
      console.error('Failed to permanently delete vault:', error);
      throw error;
    }
  },

  async loadItems(vaultId?: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    set({ isLoading: true, error: null });
    try {
      if (navigator.onLine) {
        // Online: Fetch from server and rebuild IndexedDB
        const items = vaultId 
          ? await DatabaseService.getItems(vaultId, masterKey)
          : await DatabaseService.getAllItems(user.id, masterKey);
        
        // Rebuild IndexedDB cache with encrypted data
        const itemRecords = await Promise.all(
          items.map(async (i) => ({
            id: i.id,
            vaultId: i.vaultId,
            categoryId: i.categoryId,
            type: i.type,
            dataEncrypted: await EncryptionService.encryptObject(i, masterKey),
            isFavorite: i.isFavorite,
            folder: i.folder,
            createdAt: i.lastUpdated,
            updatedAt: i.lastUpdated,
            deletedAt: i.deletedAt
          }))
        );
        
        await IndexedDBService.bulkSaveItems(itemRecords);
        set({ items: items.filter(i => !i.deletedAt), isLoading: false });
      } else {
        // Offline: Load ALL items from IndexedDB, then filter by vault if needed
        const allCachedItems = await IndexedDBService.getDB().items.toArray();
        const cachedItems = vaultId 
          ? allCachedItems.filter(i => i.vaultId === vaultId)
          : allCachedItems;
        
        const items = await Promise.all(
          cachedItems.filter(i => i.dataEncrypted && !i.deletedAt).map(async (i) => {
            const decryptedData = await EncryptionService.decryptObject(i.dataEncrypted, masterKey);
            return {
              id: i.id,
              vaultId: i.vaultId,
              categoryId: i.categoryId,
              type: i.type,
              isFavorite: i.isFavorite,
              folder: i.folder,
              lastUpdated: i.updatedAt,
              deletedAt: i.deletedAt,
              ...decryptedData
            } as Item;
          })
        );
        set({ items, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      set({ isLoading: false, error: 'Failed to load items' });
    }
  },

  async loadFavoriteItems() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    try {
      const favoriteItems = await DatabaseService.getFavoriteItems(user.id, masterKey, 10);
      set({ favoriteItems });
    } catch (error) {
      console.error('Failed to load favorite items:', error);
    }
  },

  async createItem(vaultId: string, itemData: Partial<Item>) {
    const { masterKey } = useAuthStore.getState();
    if (!masterKey) throw new Error('Not authenticated');

    const itemId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const item: Item = {
      id: itemId,
      vaultId,
      categoryId: itemData.categoryId,
      type: itemData.type!,
      isFavorite: itemData.isFavorite || false,
      folder: itemData.folder,
      lastUpdated: timestamp,
      ...itemData
    } as Item;

    // 1. Update local state immediately
    set({ items: [...get().items, item] });

    // 2. Save to IndexedDB
    const dataEncrypted = await EncryptionService.encryptObject(itemData, masterKey);
    await IndexedDBService.saveVaultItem({
      id: itemId,
      vaultId,
      categoryId: itemData.categoryId,
      type: itemData.type!,
      dataEncrypted,
      isFavorite: itemData.isFavorite || false,
      folder: itemData.folder,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine) {
      try {
        await DatabaseService.createItem(vaultId, itemData, masterKey);
      } catch (error) {
        console.log('Item creation failed, queuing for sync');
        await IndexedDBService.queueChange('CREATE', 'item', itemId, { vaultId, ...itemData });
      }
    } else {
      await IndexedDBService.queueChange('CREATE', 'item', itemId, { vaultId, ...itemData });
    }
  },

  async updateItem(itemId: string, updates: Partial<Item>) {
    const { masterKey } = useAuthStore.getState();
    if (!masterKey) throw new Error('Not authenticated');

    const timestamp = new Date().toISOString();

    // 1. Update local state immediately
    const items = get().items.map(i => 
      i.id === itemId ? { ...i, ...updates, lastUpdated: timestamp } : i
    );
    const favoriteItems = get().favoriteItems.map(i => 
      i.id === itemId ? { ...i, ...updates, lastUpdated: timestamp } : i
    );
    set({ items, favoriteItems });

    // 2. Update IndexedDB
    const item = items.find(i => i.id === itemId);
    if (item) {
      const dataEncrypted = await EncryptionService.encryptObject(item, masterKey);
      await IndexedDBService.saveVaultItem({
        id: itemId,
        vaultId: item.vaultId,
        categoryId: item.categoryId,
        type: item.type,
        dataEncrypted,
        isFavorite: item.isFavorite,
        folder: item.folder,
        createdAt: item.lastUpdated,
        updatedAt: timestamp
      });
    }

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine) {
      try {
        await DatabaseService.updateItem(itemId, updates, masterKey);
      } catch (error) {
        console.log('Item update failed, queuing for sync');
        await IndexedDBService.queueChange('UPDATE', 'item', itemId, updates);
      }
    } else {
      await IndexedDBService.queueChange('UPDATE', 'item', itemId, updates);
    }
  },

  async toggleFavorite(itemId: string) {
    const item = get().items.find(i => i.id === itemId);
    if (!item) return;
    
    await get().updateItem(itemId, { isFavorite: !item.isFavorite });
    await get().loadFavoriteItems();
  },

  async markItemAccessed(itemId: string) {
    try {
      await DatabaseService.updateLastAccessed(itemId);
    } catch (error) {
      console.error('Failed to update last accessed:', error);
    }
  },

  async deleteItem(itemId: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!masterKey) return;
    
    const timestamp = new Date().toISOString();

    // 1. Update local state - remove from active items
    const items = get().items.filter(i => i.id !== itemId);
    set({ items });

    // 2. Update IndexedDB with deletedAt
    const item = get().items.find(i => i.id === itemId);
    if (item) {
      await IndexedDBService.saveVaultItem({
        id: itemId,
        vaultId: item.vaultId,
        categoryId: item.categoryId,
        type: item.type,
        dataEncrypted: await EncryptionService.encryptObject(item, masterKey),
        isFavorite: item.isFavorite,
        folder: item.folder,
        createdAt: item.lastUpdated,
        updatedAt: timestamp,
        deletedAt: timestamp
      });
    }

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine && user) {
      try {
        await DatabaseService.deleteItem(itemId);
        await DatabaseService.logActivity(user.id, 'DELETE', 'Moved item to trash');
      } catch (error) {
        console.log('Item deletion failed, queuing for sync');
        await IndexedDBService.queueChange('DELETE', 'item', itemId, {});
      }
    } else {
      const existingQueue = await IndexedDBService.getSyncQueue();
      const alreadyQueued = existingQueue.some(q => q.entityId === itemId && q.action === 'DELETE');
      if (!alreadyQueued) {
        await IndexedDBService.queueChange('DELETE', 'item', itemId, {});
      }
    }
  },

  async restoreItem(itemId: string) {
    try {
      await DatabaseService.restoreItem(itemId);
      
      // Update local state
      const items = get().items.map(i => 
        i.id === itemId ? { ...i, deletedAt: undefined } : i
      );
      set({ items });
    } catch (error) {
      console.error('Failed to restore item:', error);
      throw error;
    }
  },

  async permanentlyDeleteItem(itemId: string) {
    try {
      await DatabaseService.permanentlyDeleteItem(itemId);
      await IndexedDBService.deleteItem(itemId);
      
      // Remove from local state
      const items = get().items.filter(i => i.id !== itemId);
      set({ items });
    } catch (error) {
      console.error('Failed to permanently delete item:', error);
      throw error;
    }
  },

  async loadCategories() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    try {
      const categories = await DatabaseService.getCategories(user.id, masterKey);
      set({ categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
      throw error;
    }
  },

  async createCategory(name: string, color: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) throw new Error('Not authenticated');

    try {
      const category = await DatabaseService.createCategory(user.id, name, color, masterKey);
      set({ categories: [...get().categories, category] });
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  },

  async deleteCategory(categoryId: string) {
    try {
      await DatabaseService.deleteCategory(categoryId);
      
      // Remove from local state
      const categories = get().categories.filter(c => c.id !== categoryId);
      set({ categories });
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  },

  async syncWithServer() {
    if (!navigator.onLine) return;
    
    try {
      // Process sync queue first
      const SyncService = (await import('../services/syncService')).default;
      await SyncService.processSyncQueue();
      
      // Then reload from server to rebuild IndexedDB
      await get().loadVaults();
      await get().loadCategories();
      await get().loadItems();
      await get().loadFavoriteItems();
    } catch (error) {
      console.error('Failed to sync with server:', error);
      throw error;
    }
  },

  setOnlineStatus(status: boolean) {
    set({ isOnline: status });
    if (status) {
      get().syncWithServer();
    }
  }
}));

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    useVaultStore.getState().setOnlineStatus(true);
    try {
      const SyncService = (await import('../services/syncService')).default;
      await SyncService.processSyncQueue();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  });
  
  window.addEventListener('offline', () => {
    useVaultStore.getState().setOnlineStatus(false);
  });
}
