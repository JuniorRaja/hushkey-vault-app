/**
 * Vault Store using Zustand
 * Manages vaults, items, and categories with encryption
 */

import { create } from 'zustand';
import DatabaseService from '../services/database';
import IndexedDBService from '../services/indexedDB';
import { useAuthStore } from './authStore';
import type { Vault, Item, Category } from '../../types';

interface VaultState {
  vaults: Vault[];
  items: Item[];
  categories: Category[];
  isLoading: boolean;
}

interface VaultActions {
  loadVaults: () => Promise<void>;
  createVault: (name: string, icon: string, description?: string, notes?: string) => Promise<void>;
  updateVault: (vaultId: string, updates: Partial<Vault>) => Promise<void>;
  deleteVault: (vaultId: string) => Promise<void>;
  restoreVault: (vaultId: string) => Promise<void>;
  permanentlyDeleteVault: (vaultId: string) => Promise<void>;
  loadItems: (vaultId: string) => Promise<void>;
  createItem: (vaultId: string, itemData: Partial<Item>) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  restoreItem: (itemId: string) => Promise<void>;
  permanentlyDeleteItem: (itemId: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  createCategory: (name: string, color: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  syncWithServer: () => Promise<void>;
}

export const useVaultStore = create<VaultState & VaultActions>((set, get) => ({
  vaults: [],
  items: [],
  categories: [],
  isLoading: false,

  async loadVaults() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    set({ isLoading: true });
    
    try {
      const vaults = await DatabaseService.getVaults(user.id, masterKey);
      
      // Cache in IndexedDB
      const vaultRecords = vaults.map(v => ({
        id: v.id,
        userId: user.id,
        nameEncrypted: '', // Already decrypted, would need to re-encrypt for cache
        icon: v.icon,
        isShared: v.isShared,
        sharedWith: v.sharedWith,
        createdAt: v.createdAt,
        updatedAt: v.createdAt,
        deletedAt: v.deletedAt
      }));
      
      await IndexedDBService.bulkSaveVaults(vaultRecords as any);
      set({ vaults, isLoading: false });
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
    try {
      await DatabaseService.deleteVault(vaultId);
      
      // Update local state (soft delete)
      const vaults = get().vaults.map(v => 
        v.id === vaultId ? { ...v, deletedAt: new Date().toISOString() } : v
      );
      set({ vaults });
    } catch (error) {
      console.error('Failed to delete vault:', error);
      throw error;
    }
  },

  async restoreVault(vaultId: string) {
    try {
      await DatabaseService.restoreVault(vaultId);
      
      // Update local state
      const vaults = get().vaults.map(v => 
        v.id === vaultId ? { ...v, deletedAt: undefined } : v
      );
      set({ vaults });
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

  async loadItems(vaultId: string) {
    const { masterKey } = useAuthStore.getState();
    if (!masterKey) return;

    try {
      const items = await DatabaseService.getItems(vaultId, masterKey);
      set({ items });
    } catch (error) {
      console.error('Failed to load items:', error);
      throw error;
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
      
      // Update local state
      const items = get().items.map(i => 
        i.id === itemId ? { ...i, ...updates } : i
      );
      set({ items });
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  },

  async deleteItem(itemId: string) {
    try {
      await DatabaseService.deleteItem(itemId);
      
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
    // Sync IndexedDB ↔ Supabase
    try {
      await get().loadVaults();
      await get().loadCategories();
    } catch (error) {
      console.error('Failed to sync with server:', error);
      throw error;
    }
  }
}));
