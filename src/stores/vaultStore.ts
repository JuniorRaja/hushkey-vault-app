/**
 * Vault Store using Zustand
 * Manages vaults, items, and categories with encryption
 */

import { create } from "zustand";
import { supabase } from "../supabaseClient";
import DatabaseService from "../services/database";
import IndexedDBService from "../services/indexedDB";
import EncryptionService from "../services/encryption";
import { useAuthStore } from "./authStore";
import type { Vault, Item, Category } from "../../types";

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
  loadVaults: (sync?: boolean) => Promise<void>;
  createVault: (
    name: string,
    icon: string,
    description?: string,
    notes?: string
  ) => Promise<void>;
  updateVault: (vaultId: string, updates: Partial<Vault>) => Promise<void>;
  deleteVault: (vaultId: string) => Promise<void>;
  restoreVault: (vaultId: string) => Promise<void>;
  permanentlyDeleteVault: (vaultId: string) => Promise<void>;
  loadItems: (vaultId?: string, sync?: boolean) => Promise<void>;
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

  async loadVaults(sync = true) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    set({ isLoading: true });

    try {
      // 1. Always load from IndexedDB first (Fast)
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
            itemCount: 0, // Will be updated
            isShared: v.isShared,
            sharedWith: v.sharedWith,
            notes: v.notesEncrypted
              ? await EncryptionService.decrypt(v.notesEncrypted, masterKey)
              : undefined,
            deletedAt: v.deletedAt,
          }))
      );

      // Get counts (local)
      const vaultsWithCounts = await Promise.all(
        vaults.map(async (v) => {
          // Ideally get local count. For now 0 is fine or implement getLocalCount
          const items = await IndexedDBService.getVaultItems(v.id);
          return { ...v, itemCount: items.filter((i) => !i.deletedAt).length };
        })
      );

      set({ vaults: vaultsWithCounts, isLoading: false });

      // 2. Sync with server if online and requested
      if (navigator.onLine && sync) {
        get().syncWithServer();
      }
    } catch (error) {
      console.error("Failed to load vaults:", error);
      set({ isLoading: false });
    }
  },

  async createVault(
    name: string,
    icon: string,
    description?: string,
    notes?: string
  ) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) throw new Error("Not authenticated");

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
      notes,
    };

    // 1. Update local state immediately
    set({ vaults: [...get().vaults, vault] });

    // 2. Save to IndexedDB
    const nameEncrypted = await EncryptionService.encrypt(name, masterKey);
    const descriptionEncrypted = description
      ? await EncryptionService.encrypt(description, masterKey)
      : undefined;
    const notesEncrypted = notes
      ? await EncryptionService.encrypt(notes, masterKey)
      : undefined;

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
      updatedAt: timestamp,
    });

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine) {
      try {
        await DatabaseService.createVault(
          user.id,
          name,
          icon,
          masterKey,
          description,
          notes
        );
      } catch (error) {
        console.log("Vault creation failed, queuing for sync");
        await IndexedDBService.queueChange("CREATE", "vault", vaultId, {
          name,
          icon,
          description,
          notes,
        });
      }
    } else {
      await IndexedDBService.queueChange("CREATE", "vault", vaultId, {
        name,
        icon,
        description,
        notes,
      });
    }
  },

  async updateVault(vaultId: string, updates: Partial<Vault>) {
    const { masterKey } = useAuthStore.getState();
    if (!masterKey) throw new Error("Not authenticated");

    // 1. Update local state immediately
    const vaults = get().vaults.map((v) =>
      v.id === vaultId ? { ...v, ...updates } : v
    );
    set({ vaults });

    // 2. Update IndexedDB
    const vault = vaults.find((v) => v.id === vaultId);
    if (vault) {
      const nameEncrypted = vault.name
        ? await EncryptionService.encrypt(vault.name, masterKey)
        : "";
      const descriptionEncrypted = vault.description
        ? await EncryptionService.encrypt(vault.description, masterKey)
        : undefined;
      const notesEncrypted = vault.notes
        ? await EncryptionService.encrypt(vault.notes, masterKey)
        : undefined;

      await IndexedDBService.saveVault({
        id: vaultId,
        userId: vault.isShared ? "" : vaultId,
        nameEncrypted,
        descriptionEncrypted,
        icon: vault.icon,
        isShared: vault.isShared,
        sharedWith: vault.sharedWith,
        notesEncrypted,
        createdAt: vault.createdAt,
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine) {
      try {
        await DatabaseService.updateVault(vaultId, updates, masterKey);
      } catch (error) {
        console.log("Vault update failed, queuing for sync");
        await IndexedDBService.queueChange("UPDATE", "vault", vaultId, updates);
      }
    } else {
      await IndexedDBService.queueChange("UPDATE", "vault", vaultId, updates);
    }
  },

  async deleteVault(vaultId: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!masterKey) return;

    const timestamp = new Date().toISOString();

    // 1. Update local state - remove from active vaults
    const vaults = get().vaults.filter((v) => v.id !== vaultId);
    const items = get().items.filter((i) => i.vaultId !== vaultId);
    set({ vaults, items });

    // 2. Update IndexedDB with deletedAt
    const vault = get().vaults.find((v) => v.id === vaultId);
    if (vault) {
      await IndexedDBService.saveVault({
        id: vaultId,
        userId: user?.id || "",
        nameEncrypted: await EncryptionService.encrypt(vault.name, masterKey),
        descriptionEncrypted: vault.description
          ? await EncryptionService.encrypt(vault.description, masterKey)
          : undefined,
        icon: vault.icon,
        isShared: vault.isShared,
        sharedWith: vault.sharedWith,
        notesEncrypted: vault.notes
          ? await EncryptionService.encrypt(vault.notes, masterKey)
          : undefined,
        createdAt: vault.createdAt,
        updatedAt: timestamp,
        deletedAt: timestamp,
      });
    }

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine && user) {
      try {
        await DatabaseService.deleteVault(vaultId);
        await supabase
          .from("items")
          .update({ is_deleted: true, deleted_at: timestamp })
          .eq("vault_id", vaultId);
        await DatabaseService.logActivity(
          user.id,
          "DELETE",
          "Moved vault to trash"
        );
      } catch (error) {
        console.log("Vault deletion failed, queuing for sync");
        await IndexedDBService.queueChange("DELETE", "vault", vaultId, {});
      }
    } else {
      const existingQueue = await IndexedDBService.getSyncQueue();
      const alreadyQueued = existingQueue.some(
        (q) => q.entityId === vaultId && q.action === "DELETE"
      );
      if (!alreadyQueued) {
        await IndexedDBService.queueChange("DELETE", "vault", vaultId, {});
      }
    }
  },

  async restoreVault(vaultId: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!masterKey) return;

    // 1. Update local state - restore vault
    const cachedVault = await IndexedDBService.getVault(vaultId);
    if (cachedVault) {
      const vault: Vault = {
        id: cachedVault.id,
        name: await EncryptionService.decrypt(
          cachedVault.nameEncrypted,
          masterKey
        ),
        description: cachedVault.descriptionEncrypted
          ? await EncryptionService.decrypt(
              cachedVault.descriptionEncrypted,
              masterKey
            )
          : undefined,
        icon: cachedVault.icon,
        createdAt: cachedVault.createdAt,
        itemCount: 0,
        isShared: cachedVault.isShared,
        sharedWith: cachedVault.sharedWith,
        notes: cachedVault.notesEncrypted
          ? await EncryptionService.decrypt(
              cachedVault.notesEncrypted,
              masterKey
            )
          : undefined,
      };
      set({ vaults: [...get().vaults, vault] });

      // 2. Update IndexedDB - remove deletedAt
      await IndexedDBService.saveVault({
        ...cachedVault,
        deletedAt: undefined,
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine && user) {
      try {
        await DatabaseService.restoreVault(vaultId);
        await supabase
          .from("items")
          .update({ is_deleted: false, deleted_at: null })
          .eq("vault_id", vaultId);
      } catch (error) {
        console.log("Vault restore failed, queuing for sync");
        await IndexedDBService.queueChange("UPDATE", "vault", vaultId, {
          deletedAt: null,
        });
      }
    } else {
      await IndexedDBService.queueChange("UPDATE", "vault", vaultId, {
        deletedAt: null,
      });
    }
  },

  async permanentlyDeleteVault(vaultId: string) {
    const { user } = useAuthStore.getState();

    // 1. Remove from local state
    const vaults = get().vaults.filter((v) => v.id !== vaultId);
    const items = get().items.filter((i) => i.vaultId !== vaultId);
    set({ vaults, items });

    // 2. Delete from IndexedDB
    await IndexedDBService.deleteVault(vaultId);
    // Also delete all items in this vault from IndexedDB
    const vaultItems = await IndexedDBService.getVaultItems(vaultId);
    for (const item of vaultItems) {
      await IndexedDBService.deleteItem(item.id);
    }

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine && user) {
      try {
        await DatabaseService.permanentlyDeleteVault(vaultId);
      } catch (error) {
        console.log("Vault permanent deletion failed, queuing for sync");
        await IndexedDBService.queueChange("DELETE", "vault", vaultId, {
          permanent: true,
        });
      }
    } else {
      await IndexedDBService.queueChange("DELETE", "vault", vaultId, {
        permanent: true,
      });
    }
  },

  async loadItems(vaultId?: string, sync = true) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    set({ isLoading: true, error: null });
    try {
      // 1. Always load from IndexedDB first (Fast)
      const allCachedItems = await IndexedDBService.getDB().items.toArray();
      const cachedItems = vaultId
        ? allCachedItems.filter((i) => i.vaultId === vaultId)
        : allCachedItems;

      const items = await Promise.all(
        cachedItems
          .filter((i) => i.dataEncrypted && !i.deletedAt)
          .map(async (i) => {
            const decryptedData = await EncryptionService.decryptObject(
              i.dataEncrypted,
              masterKey
            );
            return {
              id: i.id,
              vaultId: i.vaultId,
              categoryId: i.categoryId,
              type: i.type,
              isFavorite: i.isFavorite,
              folder: i.folder,
              lastUpdated: i.updatedAt,
              deletedAt: i.deletedAt,
              ...((decryptedData as object) || {}),
            } as Item;
          })
      );
      set({ items, isLoading: false });

      // 2. Sync if needed
      // Note: We don't trigger sync here if we already did in loadVaults,
      // but users might enter directly to an item list.
      // A centralized "sync loop" or "onMount" sync is better, but safe to call here.
      if (navigator.onLine && sync) {
        // We rely on the generic syncWithServer to handle everything
        // But we should be careful not to trigger it multiple times parallel.
        // SyncService handles locking.
        get().syncWithServer();
      }
    } catch (error) {
      console.error("Failed to load items:", error);
      set({ isLoading: false, error: "Failed to load items" });
    }
  },

  async loadFavoriteItems() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    try {
      const favoriteItems = await DatabaseService.getFavoriteItems(
        user.id,
        masterKey,
        10
      );
      set({ favoriteItems });
    } catch (error) {
      console.error("Failed to load favorite items:", error);
    }
  },

  async createItem(vaultId: string, itemData: Partial<Item>) {
    const { masterKey } = useAuthStore.getState();
    if (!masterKey) throw new Error("Not authenticated");

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

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine) {
      try {
        await DatabaseService.createItem(vaultId, itemData, masterKey);
      } catch (error) {
        console.log("Item creation failed, queuing for sync");
        await IndexedDBService.queueChange("CREATE", "item", itemId, {
          vaultId,
          ...itemData,
        });
      }
    } else {
      await IndexedDBService.queueChange("CREATE", "item", itemId, {
        vaultId,
        ...itemData,
      });
    }
  },

  async updateItem(itemId: string, updates: Partial<Item>) {
    const { masterKey } = useAuthStore.getState();
    if (!masterKey) throw new Error("Not authenticated");

    const timestamp = new Date().toISOString();

    // 1. Update local state immediately
    const items = get().items.map((i) =>
      i.id === itemId ? { ...i, ...updates, lastUpdated: timestamp } : i
    );
    const favoriteItems = get().favoriteItems.map((i) =>
      i.id === itemId ? { ...i, ...updates, lastUpdated: timestamp } : i
    );
    set({ items, favoriteItems });

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

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine) {
      try {
        await DatabaseService.updateItem(itemId, updates, masterKey);
      } catch (error) {
        console.log("Item update failed, queuing for sync");
        await IndexedDBService.queueChange("UPDATE", "item", itemId, updates);
      }
    } else {
      await IndexedDBService.queueChange("UPDATE", "item", itemId, updates);
    }
  },

  async toggleFavorite(itemId: string) {
    const item = get().items.find((i) => i.id === itemId);
    if (!item) return;

    await get().updateItem(itemId, { isFavorite: !item.isFavorite });
    await get().loadFavoriteItems();
  },

  async markItemAccessed(itemId: string) {
    try {
      await DatabaseService.updateLastAccessed(itemId);
    } catch (error) {
      console.error("Failed to update last accessed:", error);
    }
  },

  async deleteItem(itemId: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!masterKey) return;

    const timestamp = new Date().toISOString();

    // 1. Update local state - remove from active items
    const items = get().items.filter((i) => i.id !== itemId);
    set({ items });

    // 2. Update IndexedDB with deletedAt
    const item = get().items.find((i) => i.id === itemId);
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

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine && user) {
      try {
        await DatabaseService.deleteItem(itemId);
        await DatabaseService.logActivity(
          user.id,
          "DELETE",
          "Moved item to trash"
        );
      } catch (error) {
        console.log("Item deletion failed, queuing for sync");
        await IndexedDBService.queueChange("DELETE", "item", itemId, {});
      }
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

  async restoreItem(itemId: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!masterKey) return;

    // 1. Get item from IndexedDB and restore to local state
    const cachedItem = await IndexedDBService.getItem(itemId);
    if (cachedItem && cachedItem.dataEncrypted) {
      const decryptedData = await EncryptionService.decryptObject(
        cachedItem.dataEncrypted,
        masterKey
      );
      const item: Item = {
        id: cachedItem.id,
        vaultId: cachedItem.vaultId,
        categoryId: cachedItem.categoryId,
        type: cachedItem.type,
        isFavorite: cachedItem.isFavorite,
        folder: cachedItem.folder,
        lastUpdated: cachedItem.updatedAt,
        ...(decryptedData as Partial<Item>),
      } as Item;
      set({ items: [...get().items, item] });

      // 2. Update IndexedDB - remove deletedAt
      await IndexedDBService.saveVaultItem({
        ...cachedItem,
        deletedAt: undefined,
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine && user) {
      try {
        await DatabaseService.restoreItem(itemId);
      } catch (error) {
        console.log("Item restore failed, queuing for sync");
        await IndexedDBService.queueChange("UPDATE", "item", itemId, {
          deletedAt: null,
        });
      }
    } else {
      await IndexedDBService.queueChange("UPDATE", "item", itemId, {
        deletedAt: null,
      });
    }
  },

  async permanentlyDeleteItem(itemId: string) {
    const { user } = useAuthStore.getState();

    // 1. Remove from local state
    const items = get().items.filter((i) => i.id !== itemId);
    set({ items });

    // 2. Delete from IndexedDB
    await IndexedDBService.deleteItem(itemId);

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine && user) {
      try {
        await DatabaseService.permanentlyDeleteItem(itemId);
      } catch (error) {
        console.log("Item permanent deletion failed, queuing for sync");
        await IndexedDBService.queueChange("DELETE", "item", itemId, {
          permanent: true,
        });
      }
    } else {
      await IndexedDBService.queueChange("DELETE", "item", itemId, {
        permanent: true,
      });
    }
  },

  async loadCategories() {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    try {
      if (navigator.onLine) {
        // Online: Fetch from server and rebuild IndexedDB
        const categories = await DatabaseService.getCategories(
          user.id,
          masterKey
        );

        // Save to IndexedDB
        const categoryRecords = await Promise.all(
          categories.map(async (c) => ({
            id: c.id,
            userId: user.id,
            nameEncrypted: await EncryptionService.encrypt(c.name, masterKey),
            color: c.color,
            createdAt: new Date().toISOString(),
          }))
        );
        await IndexedDBService.bulkSaveCategories(categoryRecords);
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
      throw error;
    }
  },

  async createCategory(name: string, color: string) {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) throw new Error("Not authenticated");

    const categoryId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const category: Category = {
      id: categoryId,
      name,
      color,
    };

    // 1. Update local state immediately
    set({ categories: [...get().categories, category] });

    // 2. Save to IndexedDB
    const nameEncrypted = await EncryptionService.encrypt(name, masterKey);
    await IndexedDBService.saveCategory({
      id: categoryId,
      userId: user.id,
      nameEncrypted,
      color,
      createdAt: timestamp,
    });

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine) {
      try {
        await DatabaseService.createCategory(user.id, name, color, masterKey);
      } catch (error) {
        console.log("Category creation failed, queuing for sync");
        await IndexedDBService.queueChange("CREATE", "category", categoryId, {
          name,
          color,
        });
      }
    } else {
      await IndexedDBService.queueChange("CREATE", "category", categoryId, {
        name,
        color,
      });
    }
  },

  async deleteCategory(categoryId: string) {
    const { user } = useAuthStore.getState();

    // 1. Remove from local state
    const categories = get().categories.filter((c) => c.id !== categoryId);
    set({ categories });

    // 2. Delete from IndexedDB
    await IndexedDBService.deleteCategory(categoryId);

    // 3. Sync to server if online, otherwise queue for later
    if (navigator.onLine && user) {
      try {
        await DatabaseService.deleteCategory(categoryId);
      } catch (error) {
        console.log("Category deletion failed, queuing for sync");
        await IndexedDBService.queueChange(
          "DELETE",
          "category",
          categoryId,
          {}
        );
      }
    } else {
      await IndexedDBService.queueChange("DELETE", "category", categoryId, {});
    }
  },

  async syncWithServer() {
    if (!navigator.onLine) return;

    try {
      // Process sync queue first
      const SyncService = (await import("../services/syncService")).default;
      await SyncService.sync();

      // Then reload local data (without triggering another sync)
      await get().loadVaults(false);
      await get().loadCategories();
      await get().loadItems(undefined, false); // undefined vaultId -> load all? Logic in loadItems handles optional.
      // Actually loadItems might need arguments from current state?
      // Store doesn't verify current vault ID. It just updates `items`.
      // If we are viewing a specific vault, we should probably only load that?
      // But loadItems() replaces `items` state.
      // So yes, we should reload what was there.
      // For now, reloading all or just let the UI trigger reload?
      // Better: Don't call loadItems here if we don't know the context.
      // But `loadVaults` updates `vaults` list.
      // `loadItems` updates `items` list.
      // Let's just call both to be safe.
      await get().loadItems(undefined, false);
      await get().loadFavoriteItems();
    } catch (error) {
      console.error("Failed to sync with server:", error);
      // throw error; // Don't crash UI on sync fail
    }
  },

  setOnlineStatus(status: boolean) {
    set({ isOnline: status });
    if (status) {
      get().syncWithServer();
    }
  },
}));

// Listen for online/offline events
if (typeof window !== "undefined") {
  window.addEventListener("online", async () => {
    useVaultStore.getState().setOnlineStatus(true);
    try {
      const SyncService = (await import("../services/syncService")).default;
      await SyncService.processSyncQueue();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  });

  window.addEventListener("offline", () => {
    useVaultStore.getState().setOnlineStatus(false);
  });
}
