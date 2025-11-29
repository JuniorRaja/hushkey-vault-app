/**
 * Item Store - Complete CRUD operations for Items
 * Handles Supabase backend + IndexedDB offline sync
 */

import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import DatabaseService from '../services/database';
import IndexedDBService from '../services/indexedDB';
import { useAuthStore } from './authStore';
import type { Item, Vault, Category } from '../../types';

interface ItemState {
  items: Item[];
  vaults: Vault[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
}

interface ItemActions {
  // Items
  loadItems: (vaultId?: string) => Promise<void>;
  getItem: (itemId: string) => Promise<Item | null>;
  createItem: (vaultId: string, itemData: Partial<Item>) => Promise<Item>;
  updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  toggleFavorite: (itemId: string) => Promise<void>;
  
  // Vaults
  loadVaults: () => Promise<void>;
  getVaultItemCount: (vaultId: string) => Promise<number>;
  
  // Categories
  loadCategories: () => Promise<void>;
  
  // Sync
  syncWithServer: () => Promise<void>;
  setOnlineStatus: (status: boolean) => void;
}

export const useItemStore = create<ItemState & ItemActions>((set, get) => ({
  items: [],
  vaults: [],
  categories: [],
  isLoading: false,
  error: null,
  isOnline: navigator.onLine,

  async loadItems(vaultId?: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) {
      console.log('loadItems: No user or masterKey');
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      console.log('loadItems: Loading items for', vaultId ? `vault ${vaultId}` : 'all vaults');
      const allItems = vaultId 
        ? await DatabaseService.getItems(vaultId, masterKey)
        : await DatabaseService.getAllItems(user.id, masterKey);
      
      console.log('loadItems: Raw items from DB:', allItems);
      
      // Filter out deleted items
      const items = allItems.filter(i => !i.deletedAt);
      
      console.log('loadItems: Loaded', items.length, 'active items', items);
      
      // Cache in IndexedDB
      await IndexedDBService.bulkSaveItems(items.map(i => ({
        id: i.id,
        vaultId: i.vaultId,
        categoryId: i.categoryId,
        type: i.type,
        dataEncrypted: '',
        isFavorite: i.isFavorite,
        folder: i.folder,
        createdAt: i.lastUpdated,
        updatedAt: i.lastUpdated,
        deletedAt: i.deletedAt
      })) as any);
      
      set({ items, isLoading: false });
    } catch (error) {
      console.error('Failed to load items:', error);
      set({ isLoading: false, error: 'Failed to load items' });
      
      // Fallback to IndexedDB if offline
      if (!get().isOnline && vaultId) {
        const cachedItems = await IndexedDBService.getVaultItems(vaultId);
        set({ items: cachedItems as any });
      }
    }
  },

  async getItem(itemId: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return null;

    try {
      // Check local state first
      const localItem = get().items.find(i => i.id === itemId);
      if (localItem) {
        await DatabaseService.updateLastAccessed(itemId);
        return localItem;
      }

      // Fetch from server
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;

      const EncryptionService = (await import('../services/encryption')).default;
      const decryptedData = await EncryptionService.decryptObject(
        data.data_encrypted,
        masterKey
      );

      const item: Item = {
        id: data.id,
        vaultId: data.vault_id,
        categoryId: data.category_id,
        type: data.type,
        isFavorite: data.is_favorite,
        folder: data.folder,
        lastUpdated: data.updated_at,
        deletedAt: data.deleted_at,
        ...decryptedData,
      } as Item;

      await DatabaseService.updateLastAccessed(itemId);
      return item;
    } catch (error) {
      console.error('Failed to get item:', error);
      return null;
    }
  },

  async createItem(vaultId: string, itemData: Partial<Item>) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) throw new Error('Not authenticated');

    try {
      const item = await DatabaseService.createItem(vaultId, itemData, masterKey);
      
      // Cache in IndexedDB
      await IndexedDBService.saveVaultItem({
        id: item.id,
        vaultId: item.vaultId,
        categoryId: item.categoryId,
        type: item.type,
        dataEncrypted: '',
        isFavorite: item.isFavorite,
        folder: item.folder,
        createdAt: item.lastUpdated,
        updatedAt: item.lastUpdated
      } as any);
      
      // Log activity
      await DatabaseService.logActivity(user.id, 'CREATE', `Created ${item.type} item: ${item.name}`);
      
      // Add to state immediately
      set({ items: [...get().items, item] });
      
      return item;
    } catch (error) {
      console.error('Failed to create item:', error);
      
      // Queue for offline sync
      if (!get().isOnline) {
        await IndexedDBService.queueChange('CREATE', 'item', '', itemData);
      }
      
      throw error;
    }
  },

  async updateItem(itemId: string, updates: Partial<Item>) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) throw new Error('Not authenticated');

    try {
      await DatabaseService.updateItem(itemId, updates, masterKey);
      
      // Log activity
      await DatabaseService.logActivity(user.id, 'UPDATE', `Updated item: ${updates.name || itemId}`);
      
      // Update local state
      const items = get().items.map(i => 
        i.id === itemId ? { ...i, ...updates, lastUpdated: new Date().toISOString() } : i
      );
      set({ items });
    } catch (error) {
      console.error('Failed to update item:', error);
      
      // Queue for offline sync
      if (!get().isOnline) {
        await IndexedDBService.queueChange('UPDATE', 'item', itemId, updates);
      }
      
      throw error;
    }
  },

  async deleteItem(itemId: string) {
    const { user } = useAuthStore.getState();
    
    try {
      await DatabaseService.deleteItem(itemId);
      
      // Log activity
      if (user) {
        await DatabaseService.logActivity(user.id, 'DELETE', `Moved item to trash: ${itemId}`);
      }
      
      // Update local state (soft delete)
      const items = get().items.map(i => 
        i.id === itemId ? { ...i, deletedAt: new Date().toISOString() } : i
      );
      set({ items });
    } catch (error) {
      console.error('Failed to delete item:', error);
      
      // Queue for offline sync
      if (!get().isOnline) {
        await IndexedDBService.queueChange('DELETE', 'item', itemId, {});
      }
      
      throw error;
    }
  },

  async toggleFavorite(itemId: string) {
    const item = get().items.find(i => i.id === itemId);
    if (!item) return;
    
    await get().updateItem(itemId, { isFavorite: !item.isFavorite });
  },

  async loadVaults() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    set({ isLoading: true });
    try {
      const vaults = await DatabaseService.getVaults(user.id, masterKey);
      
      // Get actual item counts
      const vaultsWithCounts = await Promise.all(
        vaults.map(async (v) => ({
          ...v,
          itemCount: await DatabaseService.getVaultItemCount(v.id)
        }))
      );
      
      console.log('loadVaults: Loaded', vaultsWithCounts.length, 'vaults with counts');
      set({ vaults: vaultsWithCounts, isLoading: false });
    } catch (error) {
      console.error('Failed to load vaults:', error);
      set({ isLoading: false });
    }
  },

  async getVaultItemCount(vaultId: string) {
    try {
      return await DatabaseService.getVaultItemCount(vaultId);
    } catch (error) {
      console.error('Failed to get vault item count:', error);
      return 0;
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
    }
  },

  async syncWithServer() {
    try {
      await get().loadVaults();
      await get().loadCategories();
      await get().loadItems();
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
  window.addEventListener('online', () => {
    useItemStore.getState().setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    useItemStore.getState().setOnlineStatus(false);
  });
}
