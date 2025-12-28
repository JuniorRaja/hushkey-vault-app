/**
 * Item Store - Complete CRUD operations for Items
 * Handles Supabase backend + IndexedDB offline sync
 */

import { create } from "zustand";
import { supabase } from "../supabaseClient";
import DatabaseService from "../services/database";
import IndexedDBService from "../services/indexedDB";
import EncryptionService from "../services/encryption";
import { useAuthStore } from "./authStore";
import { SoundService } from "../services/soundService";
import type { Item, Vault, Category } from "../../types";

interface ItemState {
  items: Item[];
  vaults: Vault[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  typeFilter: string;
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

  // UI State
  setTypeFilter: (filter: string) => void;
}

export const useItemStore = create<ItemState & ItemActions>((set, get) => ({
  items: [],
  vaults: [],
  categories: [],
  isLoading: false,
  error: null,
  isOnline: navigator.onLine,
  typeFilter: "ALL",

  async loadItems(vaultId?: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) {
      console.log("loadItems: No user or masterKey");
      return;
    }

    set({ isLoading: true, error: null });

    try {
      if (navigator.onLine) {
        // Online: Fetch from server and rebuild IndexedDB
        const allItems = vaultId
          ? await DatabaseService.getItems(vaultId, masterKey)
          : await DatabaseService.getAllItems(user.id, masterKey);

        const items = allItems.filter((i) => !i.deletedAt);

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
            deletedAt: i.deletedAt,
          }))
        );

        await IndexedDBService.bulkSaveItems(itemRecords);
        set({ items, isLoading: false });
      } else {
        // Offline: Load from IndexedDB
        const cachedItems = vaultId
          ? await IndexedDBService.getVaultItems(vaultId)
          : [];

        const items = await Promise.all(
          cachedItems
            .filter((i) => i.dataEncrypted)
            .map(async (i) => {
              const decryptedData = await EncryptionService.decryptObject<
                Partial<Item>
              >(i.dataEncrypted, masterKey);
              return {
                id: i.id,
                vaultId: i.vaultId,
                categoryId: i.categoryId,
                type: i.type,
                isFavorite: i.isFavorite,
                folder: i.folder,
                lastUpdated: i.updatedAt,
                deletedAt: i.deletedAt,
                ...(decryptedData || {}),
              } as Item;
            })
        );
        set({ items: items.filter((i) => !i.deletedAt), isLoading: false });
      }
    } catch (error) {
      console.error("Failed to load items:", error);
      set({ isLoading: false, error: "Failed to load items" });
    }
  },

  async getItem(itemId: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return null;

    try {
      // Check local state first
      const localItem = get().items.find((i) => i.id === itemId);
      if (localItem) {
        await DatabaseService.updateLastAccessed(itemId);
        return localItem;
      }

      // Fetch from server
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (error) throw error;

      const EncryptionService = (await import("../services/encryption"))
        .default;
      const decryptedData = await EncryptionService.decryptObject<
        Partial<Item>
      >(data.data_encrypted, masterKey);

      const item: Item = {
        id: data.id,
        vaultId: data.vault_id,
        categoryId: data.category_id,
        type: data.type,
        isFavorite: data.is_favorite,
        folder: data.folder,
        lastUpdated: data.updated_at,
        deletedAt: data.deleted_at,
        ...(decryptedData || {}),
      } as Item;

      await DatabaseService.updateLastAccessed(itemId);
      return item;
    } catch (error) {
      console.error("Failed to get item:", error);
      return null;
    }
  },

  async createItem(vaultId: string, itemData: Partial<Item>) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) throw new Error("Not authenticated");

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
      ...itemData,
    } as Item;

    // 1. Update local state immediately
    set({ items: [...get().items, item] });

    // 2. Save to IndexedDB
    const dataEncrypted = await EncryptionService.encryptObject(
      itemData,
      masterKey
    );
    await IndexedDBService.saveVaultItem({
      id: itemId,
      vaultId,
      categoryId: itemData.categoryId,
      type: itemData.type!,
      dataEncrypted,
      isFavorite: itemData.isFavorite || false,
      folder: itemData.folder,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // 3. Sync to server in background (fire and forget)
    if (navigator.onLine) {
      DatabaseService.createItem(vaultId, itemData, masterKey, itemId)
        .then(() => {
          DatabaseService.logActivity(
            user.id,
            "CREATE",
            `Created ${item.type} item: ${item.name}`
          );
        })
        .catch(async (error) => {
          console.log("Item creation failed, queuing for sync");
          await IndexedDBService.queueChange("CREATE", "item", itemId, {
            vaultId,
            ...itemData,
          });
        });
    } else {
      await IndexedDBService.queueChange("CREATE", "item", itemId, {
        vaultId,
        ...itemData,
      });
    }

    return item;
  },

  async updateItem(itemId: string, updates: Partial<Item>) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) throw new Error("Not authenticated");

    const timestamp = new Date().toISOString();

    // 1. Update local state immediately
    const items = get().items.map((i) =>
      i.id === itemId ? { ...i, ...updates, lastUpdated: timestamp } : i
    );
    set({ items });

    // 2. Update IndexedDB
    const item = items.find((i) => i.id === itemId);
    if (item) {
      const dataEncrypted = await EncryptionService.encryptObject(
        item,
        masterKey
      );
      await IndexedDBService.saveVaultItem({
        id: itemId,
        vaultId: item.vaultId,
        categoryId: item.categoryId,
        type: item.type,
        dataEncrypted,
        isFavorite: item.isFavorite,
        folder: item.folder,
        createdAt: item.lastUpdated,
        updatedAt: timestamp,
      });
    }

    // 3. Sync to server in background
    if (navigator.onLine && user) {
      DatabaseService.updateItem(itemId, updates, masterKey)
        .then(() => {
          DatabaseService.logActivity(
            user.id,
            "UPDATE",
            `Updated item: ${updates.name || itemId}`
          );
        })
        .catch(async (error) => {
          console.log("Item update failed, queuing for sync");
          await IndexedDBService.queueChange("UPDATE", "item", itemId, updates);
        });
    } else {
      await IndexedDBService.queueChange("UPDATE", "item", itemId, updates);
    }
  },

  async deleteItem(itemId: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!masterKey) return;

    const timestamp = new Date().toISOString();
    SoundService.playTrash();

    const item = get().items.find((i) => i.id === itemId);

    // 1. Update local state - remove from display
    const items = get().items.filter((i) => i.id !== itemId);
    set({ items });

    // 2. Update IndexedDB with deletedAt
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
        deletedAt: timestamp,
      });
    }

    // 3. Sync to server in background
    if (navigator.onLine && user) {
      DatabaseService.deleteItem(itemId)
        .then(() => {
          DatabaseService.logActivity(
            user.id,
            "DELETE",
            `Moved item to trash: ${itemId}`
          );
        })
        .catch(async (error) => {
          console.log("Item deletion failed, queuing for sync");
          await IndexedDBService.queueChange("DELETE", "item", itemId, {});
        });
    } else {
      const existingQueue = await IndexedDBService.getSyncQueue();
      const alreadyQueued = existingQueue.some(
        (q) => q.entityId === itemId && q.action === "DELETE"
      );
      if (!alreadyQueued) {
        await IndexedDBService.queueChange("DELETE", "item", itemId, {});
      }
    }
  },

  async toggleFavorite(itemId: string) {
    const item = get().items.find((i) => i.id === itemId);
    if (!item) return;

    await get().updateItem(itemId, { isFavorite: !item.isFavorite });
  },

  async loadVaults() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    set({ isLoading: true });
    try {
      if (navigator.onLine) {
        const vaults = await DatabaseService.getVaults(user.id, masterKey);

        // Get actual item counts
        const vaultsWithCounts = await Promise.all(
          vaults.map(async (v) => ({
            ...v,
            itemCount: await DatabaseService.getVaultItemCount(v.id),
          }))
        );

        set({ vaults: vaultsWithCounts, isLoading: false });
      } else {
        // Offline: Load from IndexedDB
        const cachedVaults = await IndexedDBService.getVaults(user.id);
        const vaults = await Promise.all(
          cachedVaults
            .filter((v) => v.nameEncrypted && !v.deletedAt)
            .map(async (v) => ({
              id: v.id,
              name: await EncryptionService.decrypt(v.nameEncrypted, masterKey),
              description: v.descriptionEncrypted
                ? await EncryptionService.decrypt(
                    v.descriptionEncrypted,
                    masterKey
                  )
                : undefined,
              icon: v.icon,
              createdAt: v.createdAt,
              itemCount: 0,
              isShared: v.isShared,
              sharedWith: v.sharedWith,
              notes: v.notesEncrypted
                ? await EncryptionService.decrypt(v.notesEncrypted, masterKey)
                : undefined,
            }))
        );
        set({ vaults, isLoading: false });
      }
    } catch (error) {
      console.error("Failed to load vaults:", error);
      set({ isLoading: false });
    }
  },

  async getVaultItemCount(vaultId: string) {
    try {
      return await DatabaseService.getVaultItemCount(vaultId);
    } catch (error) {
      console.error("Failed to get vault item count:", error);
      return 0;
    }
  },

  async loadCategories() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    try {
      if (navigator.onLine) {
        const categories = await DatabaseService.getCategories(
          user.id,
          masterKey
        );
        set({ categories });
      } else {
        // Offline: Load from IndexedDB
        const cachedCategories = await IndexedDBService.getCategories(user.id);
        const categories = await Promise.all(
          cachedCategories.map(async (c) => ({
            id: c.id,
            name: await EncryptionService.decrypt(c.nameEncrypted, masterKey),
            color: c.color,
          }))
        );
        set({ categories });
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  },

  async syncWithServer() {
    if (!navigator.onLine) return;

    try {
      // Process sync queue first
      const SyncService = (await import("../services/syncService")).default;
      await SyncService.processSyncQueue();

      // Then reload from server to rebuild IndexedDB
      await get().loadVaults();
      await get().loadCategories();
      await get().loadItems();
    } catch (error) {
      console.error("Failed to sync with server:", error);
      throw error;
    }
  },

  setOnlineStatus(status: boolean) {
    set({ isOnline: status });
    if (status) {
      get().syncWithServer();
    }
  },

  setTypeFilter(filter: string) {
    set({ typeFilter: filter });
  },
}));

// Listen for online/offline events
if (typeof window !== "undefined") {
  window.addEventListener("online", async () => {
    useItemStore.getState().setOnlineStatus(true);
    try {
      const SyncService = (await import("../services/syncService")).default;
      await SyncService.processSyncQueue();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  });

  window.addEventListener("offline", () => {
    useItemStore.getState().setOnlineStatus(false);
  });
}
