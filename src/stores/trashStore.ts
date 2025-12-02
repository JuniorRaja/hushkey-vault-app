/**
 * Trash Store using Zustand
 * Manages deleted items and vaults with recovery options
 */

import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import DatabaseService from '../services/database';
import EncryptionService from '../services/encryption';
import IndexedDBService from '../services/indexedDB';
import { useAuthStore } from './authStore';
import { SoundService } from '../services/soundService';
import type { Vault, Item } from '../../types';

interface TrashState {
  deletedItems: Item[];
  deletedVaults: Vault[];
  isLoading: boolean;
  error: string | null;
}

interface TrashActions {
  loadTrash: () => Promise<void>;
  restoreItem: (itemId: string) => Promise<void>;
  restoreVault: (vaultId: string, restoreItems: boolean) => Promise<void>;
  permanentDeleteItem: (itemId: string) => Promise<void>;
  permanentDeleteVault: (vaultId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  cleanupExpiredTrash: (autoDeleteDays: number) => Promise<void>;
}

export const useTrashStore = create<TrashState & TrashActions>((set, get) => ({
  deletedItems: [],
  deletedVaults: [],
  isLoading: false,
  error: null,

  async loadTrash() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    set({ isLoading: true, error: null });
    try {
      // Fetch deleted items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*, vaults!inner(user_id)')
        .eq('vaults.user_id', user.id)
        .eq('is_deleted', true);

      if (itemsError) throw itemsError;

      // Fetch deleted vaults
      const { data: vaultsData, error: vaultsError } = await supabase
        .from('vaults')
        .select('*, items(count)')
        .eq('user_id', user.id)
        .eq('is_deleted', true);

      if (vaultsError) throw vaultsError;

      // Decrypt items
      const deletedItems = await Promise.all(
        itemsData.map(async (item) => {
          const decryptedData = await EncryptionService.decryptObject(item.data_encrypted, masterKey);
          return {
            id: item.id,
            vaultId: item.vault_id,
            categoryId: item.category_id,
            type: item.type,
            isFavorite: item.is_favorite,
            folder: item.folder,
            lastUpdated: item.updated_at,
            deletedAt: item.deleted_at,
            ...decryptedData,
          };
        })
      );

      // Decrypt vaults
      const deletedVaults = await Promise.all(
        vaultsData.map(async (vault) => ({
          id: vault.id,
          name: await EncryptionService.decrypt(vault.name_encrypted, masterKey),
          description: vault.description_encrypted
            ? await EncryptionService.decrypt(vault.description_encrypted, masterKey)
            : undefined,
          icon: vault.icon,
          createdAt: vault.created_at,
          itemCount: vault.items?.[0]?.count || 0,
          isShared: vault.is_shared,
          sharedWith: vault.shared_with || [],
          deletedAt: vault.deleted_at,
        }))
      );

      set({ deletedItems, deletedVaults, isLoading: false });
    } catch (error) {
      console.error('Failed to load trash:', error);
      set({ error: 'Failed to load trash', isLoading: false });
    }
  },

  async restoreItem(itemId: string) {
    try {
      await DatabaseService.restoreItem(itemId);
      
      // Update local state
      set(state => ({
        deletedItems: state.deletedItems.filter(i => i.id !== itemId)
      }));

      // Log activity
      const { user } = useAuthStore.getState();
      if (user) {
        await DatabaseService.logActivity(user.id, 'RESTORE', `Restored item from trash`);
      }
    } catch (error) {
      console.error('Failed to restore item:', error);
      throw error;
    }
  },

  async restoreVault(vaultId: string, restoreItems: boolean) {
    try {
      const vault = get().deletedVaults.find(v => v.id === vaultId);
      if (!vault) throw new Error('Vault not found');

      await DatabaseService.restoreVault(vaultId);

      if (restoreItems) {
        // Restore all items in this vault
        await supabase
          .from('items')
          .update({ is_deleted: false, deleted_at: null })
          .eq('vault_id', vaultId)
          .eq('is_deleted', true);

        // Update local state
        set(state => ({
          deletedVaults: state.deletedVaults.filter(v => v.id !== vaultId),
          deletedItems: state.deletedItems.filter(i => i.vaultId !== vaultId)
        }));
      } else {
        set(state => ({
          deletedVaults: state.deletedVaults.filter(v => v.id !== vaultId)
        }));
      }

      // Log activity
      const { user } = useAuthStore.getState();
      if (user) {
        const itemCount = restoreItems ? get().deletedItems.filter(i => i.vaultId === vaultId).length : 0;
        await DatabaseService.logActivity(
          user.id, 
          'RESTORE', 
          `Restored vault ${vault.name}${restoreItems ? ` with ${itemCount} items` : ''}`
        );
      }
    } catch (error) {
      console.error('Failed to restore vault:', error);
      throw error;
    }
  },

  async permanentDeleteItem(itemId: string) {
    try {
      await DatabaseService.permanentlyDeleteItem(itemId);
      await IndexedDBService.deleteItem(itemId);

      // Play trash sound
      SoundService.playTrash();

      set(state => ({
        deletedItems: state.deletedItems.filter(i => i.id !== itemId)
      }));

      // Log activity
      const { user } = useAuthStore.getState();
      if (user) {
        await DatabaseService.logActivity(user.id, 'PERMANENT_DELETE', `Permanently deleted item`);
      }
    } catch (error) {
      console.error('Failed to permanently delete item:', error);
      throw error;
    }
  },

  async permanentDeleteVault(vaultId: string) {
    try {
      await DatabaseService.permanentlyDeleteVault(vaultId);
      await IndexedDBService.deleteVault(vaultId);

      // Play trash sound
      SoundService.playTrash();

      set(state => ({
        deletedVaults: state.deletedVaults.filter(v => v.id !== vaultId),
        deletedItems: state.deletedItems.filter(i => i.vaultId !== vaultId)
      }));

      // Log activity
      const { user } = useAuthStore.getState();
      if (user) {
        await DatabaseService.logActivity(user.id, 'PERMANENT_DELETE', `Permanently deleted vault`);
      }
    } catch (error) {
      console.error('Failed to permanently delete vault:', error);
      throw error;
    }
  },

  async emptyTrash() {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const { deletedItems, deletedVaults } = get();

      // Delete all items
      await Promise.all(
        deletedItems.map(item => DatabaseService.permanentlyDeleteItem(item.id))
      );

      // Delete all vaults
      await Promise.all(
        deletedVaults.map(vault => DatabaseService.permanentlyDeleteVault(vault.id))
      );

      // Play trash sound
      SoundService.playTrash();

      set({ deletedItems: [], deletedVaults: [] });

      // Log activity
      await DatabaseService.logActivity(
        user.id, 
        'PERMANENT_DELETE', 
        `Emptied trash: ${deletedItems.length} items, ${deletedVaults.length} vaults`
      );
    } catch (error) {
      console.error('Failed to empty trash:', error);
      throw error;
    }
  },

  async cleanupExpiredTrash(autoDeleteDays: number) {
    if (autoDeleteDays === 0) return; // Never auto-delete

    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - autoDeleteDays * 24 * 60 * 60 * 1000);

      const { deletedItems, deletedVaults } = get();

      // Find expired items
      const expiredItems = deletedItems.filter(item => {
        if (!item.deletedAt) return false;
        return new Date(item.deletedAt) < cutoffDate;
      });

      // Find expired vaults
      const expiredVaults = deletedVaults.filter(vault => {
        if (!vault.deletedAt) return false;
        return new Date(vault.deletedAt) < cutoffDate;
      });

      if (expiredItems.length === 0 && expiredVaults.length === 0) return;

      // Delete expired items
      await Promise.all(
        expiredItems.map(item => DatabaseService.permanentlyDeleteItem(item.id))
      );

      // Delete expired vaults
      await Promise.all(
        expiredVaults.map(vault => DatabaseService.permanentlyDeleteVault(vault.id))
      );

      // Update state
      set(state => ({
        deletedItems: state.deletedItems.filter(i => !expiredItems.includes(i)),
        deletedVaults: state.deletedVaults.filter(v => !expiredVaults.includes(v))
      }));

      // Log activity
      await DatabaseService.logActivity(
        user.id,
        'PERMANENT_DELETE',
        `Auto-deleted ${expiredItems.length} items and ${expiredVaults.length} vaults`
      );
    } catch (error) {
      console.error('Failed to cleanup expired trash:', error);
    }
  }
}));
