/**
 * Vault Store using Zustand
 * Manages vaults, items, and categories with encryption
 */

import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import DatabaseService from '../services/database';
import IndexedDBService from '../services/indexedDB';
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
      const vaults = await DatabaseService.getVaults(user.id, masterKey);
      
      // Get actual item counts for each vault
      const vaultsWithCounts = await Promise.all(
        vaults.map(async (v) => ({
          ...v,
          itemCount: await DatabaseService.getVaultItemCount(v.id)
        }))
      );
      
      // Cache in IndexedDB
      const vaultRecords = vaultsWithCounts.map(v => ({
        id: v.id,
        userId: user.id,
        nameEncrypted: '',
        icon: v.icon,
        isShared: v.isShared,
        sharedWith: v.sharedWith,
        createdAt: v.createdAt,
        updatedAt: v.createdAt,
        deletedAt: v.deletedAt
      }));
      
      await IndexedDBService.bulkSaveVaults(vaultRecords as any);
      console.log('loadVaults: Loaded', vaultsWithCounts.length, 'vaults with counts');
      set({ vaults: vaultsWithCounts, isLoading: false });
    } catch (error) {
      console.error('Failed to load vaults:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  async createVault(name: string, icon: string, description?: string, notes?: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) throw new Error('Not authenticated');

    try {
      const vault = await DatabaseService.createVault(
        user.id,
        name,
        icon,
        masterKey,
        description,
        notes
      );
      
      // Cache in IndexedDB
      await IndexedDBService.saveVault({
        id: vault.id,
        userId: user.id,
        nameEncrypted: '',
        icon: vault.icon,
        isShared: vault.isShared,
        sharedWith: vault.sharedWith,
        createdAt: vault.createdAt,
        updatedAt: vault.createdAt
      } as any);
      
      set({ vaults: [...get().vaults, vault] });
    } catch (error) {
      console.error('Failed to create vault:', error);
      throw error;
    }
  },

  async updateVault(vaultId: string, updates: Partial<Vault>) {
    const { masterKey } = useAuthStore.getState();
    if (!masterKey) throw new Error('Not authenticated');

    try {
      await DatabaseService.updateVault(vaultId, updates, masterKey);
      
      // Update local state
      const vaults = get().vaults.map(v => 
        v.id === vaultId ? { ...v, ...updates } : v
      );
      set({ vaults });
    } catch (error) {
      console.error('Failed to update vault:', error);
      throw error;
    }
  },

  async deleteVault(vaultId: string) {
    const { user } = useAuthStore.getState();
    try {
      await DatabaseService.deleteVault(vaultId);
      
      // Also soft delete all items in this vault
      const { data } = await supabase
        .from('items')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('vault_id', vaultId);
      
      // Log activity
      if (user) {
        await DatabaseService.logActivity(user.id, 'DELETE', 'Moved vault to trash');
      }
      
      // Reload vaults and items
      await get().loadVaults();
      await get().loadItems();
    } catch (error) {
      console.error('Failed to delete vault:', error);
      throw error;
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
      const items = vaultId 
        ? await DatabaseService.getItems(vaultId, masterKey)
        : await DatabaseService.getAllItems(user.id, masterKey);
      
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
      
      if (!get().isOnline) {
        const cachedItems = vaultId 
          ? await IndexedDBService.getVaultItems(vaultId)
          : [];
        set({ items: cachedItems as any });
      }
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
      
      set({ items: [...get().items, item] });
    } catch (error) {
      console.error('Failed to create item:', error);
      throw error;
    }
  },

  async updateItem(itemId: string, updates: Partial<Item>) {
    const { masterKey } = useAuthStore.getState();
    if (!masterKey) throw new Error('Not authenticated');

    try {
      await DatabaseService.updateItem(itemId, updates, masterKey);
      
      const items = get().items.map(i => 
        i.id === itemId ? { ...i, ...updates, lastUpdated: new Date().toISOString() } : i
      );
      const favoriteItems = get().favoriteItems.map(i => 
        i.id === itemId ? { ...i, ...updates, lastUpdated: new Date().toISOString() } : i
      );
      set({ items, favoriteItems });
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
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
    const { user } = useAuthStore.getState();
    try {
      await DatabaseService.deleteItem(itemId);
      
      // Log activity
      if (user) {
        await DatabaseService.logActivity(user.id, 'DELETE', 'Moved item to trash');
      }
      
      // Update local state (soft delete)
      const items = get().items.map(i => 
        i.id === itemId ? { ...i, deletedAt: new Date().toISOString() } : i
      );
      set({ items });
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
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
    try {
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
  window.addEventListener('online', () => {
    useVaultStore.getState().setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    useVaultStore.getState().setOnlineStatus(false);
  });
}
