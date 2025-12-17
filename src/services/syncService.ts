/**
 * Sync Service for offline/online data synchronization
 * Implements Delta Sync pattern
 */

import IndexedDBService from "./indexedDB";
import DatabaseService from "./database";
import EncryptionService from "./encryption";
import { useAuthStore } from "../stores/authStore";
import type { Vault, Item } from "../../types";

class SyncService {
  private isSyncing = false;
  private retryAttempts = new Map<string, number>();
  private conflicts: any[] = []; // In-memory conflict queue
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  /**
   * Process sync queue (PUSH) and then Pull changes
   */
  async sync(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;
    try {
      await this.processSyncQueue();
      await this.pullChanges();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process sync queue when coming back online
   */
  async processSyncQueue(): Promise<void> {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    try {
      const queue = await IndexedDBService.getSyncQueue();
      if (queue.length === 0) return;

      console.log(`Processing ${queue.length} queued changes...`);

      for (const item of queue) {
        const retries = this.retryAttempts.get(item.id) || 0;

        if (retries >= this.maxRetries) {
          console.error(
            `Max retries reached for ${item.entityType} ${item.entityId}`
          );
          await IndexedDBService.clearSyncQueueItem(item.id);
          this.retryAttempts.delete(item.id);
          continue;
        }

        try {
          switch (item.entityType) {
            case "vault":
              await this.pushVault(item, masterKey);
              break;
            case "item":
              await this.pushItem(item, masterKey);
              break;
            case "category":
              await this.pushCategory(item, masterKey);
              break;
          }

          await IndexedDBService.clearSyncQueueItem(item.id);
          this.retryAttempts.delete(item.id);
          console.log(`Synced ${item.entityType} ${item.entityId}`);
        } catch (error) {
          console.error(
            `Failed to sync ${item.entityType} ${item.entityId}:`,
            error
          );
          this.retryAttempts.set(item.id, retries + 1);

          // Exponential backoff
          const delay = this.baseDelay * Math.pow(2, retries);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error("Error processing sync queue:", error);
      throw error;
    }
  }

  /**
   * Pull changes from server (Delta Sync)
   */
  async pullChanges(): Promise<void> {
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    try {
      // 1. Get last sync time
      const syncStatus = await IndexedDBService.getSyncStatus("sub_sync");
      const lastSynced = syncStatus?.lastSynced; // ISO string

      console.log("Pulling changes since:", lastSynced || "Beginning of time");

      // 2. Fetch changes
      // Vaults
      const vaults = await DatabaseService.getVaults(
        user.id,
        masterKey,
        lastSynced
      );
      // Items
      const items = await DatabaseService.getAllItems(
        user.id,
        masterKey,
        lastSynced
      );

      // 3. Update Local DB (with conflict detection)
      await this.updateLocalVaults(vaults, masterKey);
      await this.updateLocalItems(items, masterKey);

      this.notifyConflicts();

      // 4. Update sync status
      await IndexedDBService.updateSyncStatus(
        "sub_sync",
        new Date().toISOString(),
        0
      );

      console.log(`Pulled ${vaults.length} vaults and ${items.length} items.`);
    } catch (error) {
      console.error("Pull changes failed:", error);
      throw error;
    }
  }

  private async updateLocalVaults(
    vaults: Vault[],
    masterKey: Uint8Array
  ): Promise<void> {
    const queue = await IndexedDBService.getSyncQueue();

    for (const vault of vaults) {
      // Check for conflict: Item is in sync queue AND server has newer version
      const localChange = queue.find(
        (q) => q.entityId === vault.id && q.entityType === "vault"
      );

      if (localChange) {
        console.log(`Conflict detected for vault ${vault.id}`);
        this.addConflict("vault", vault.id, localChange, vault);
        continue; // Skip update, let user resolve
      }

      if (vault.deletedAt) {
        await IndexedDBService.deleteVault(vault.id);
      } else {
        const nameEncrypted = await EncryptionService.encrypt(
          vault.name,
          masterKey
        );
        const descriptionEncrypted = vault.description
          ? await EncryptionService.encrypt(vault.description, masterKey)
          : undefined;
        const notesEncrypted = vault.notes
          ? await EncryptionService.encrypt(vault.notes, masterKey)
          : undefined;

        await IndexedDBService.saveVault({
          id: vault.id,
          // Wait, IDB schema says 'userId', logic in store said: userId: vault.isShared ? '' : vaultId??
          // Store line 190 involved a trick for shared vaults? NO, line 146 in store uses `user.id`.
          // I should use `user.id` or the owner ID. Data fetched has `user_id` which defines owner.
          // But `Vault` type might not have `userId` explicitly? `Vault` type (line 210 db serve) doesn't have userId.
          // But `getVaults` filters by `user_id`, so these are MINE.
          userId: useAuthStore.getState().user!.id,
          nameEncrypted,
          descriptionEncrypted,
          icon: vault.icon,
          isShared: vault.isShared,
          sharedWith: vault.sharedWith,
          notesEncrypted,
          createdAt: vault.createdAt,
          updatedAt: new Date().toISOString(), // Local touch
          deletedAt: undefined,
        });
      }
    }
  }

  private async updateLocalItems(
    items: Item[],
    masterKey: Uint8Array
  ): Promise<void> {
    const queue = await IndexedDBService.getSyncQueue();

    for (const item of items) {
      // Check for conflict
      const localChange = queue.find(
        (q) => q.entityId === item.id && q.entityType === "item"
      );

      if (localChange) {
        console.log(`Conflict detected for item ${item.id}`);
        this.addConflict("item", item.id, localChange, item);
        continue;
      }

      if (item.deletedAt) {
        await IndexedDBService.deleteItem(item.id);
      } else {
        const dataEncrypted = await EncryptionService.encryptObject(
          item,
          masterKey
        );

        await IndexedDBService.saveVaultItem({
          id: item.id,
          vaultId: item.vaultId,
          categoryId: item.categoryId,
          type: item.type,
          dataEncrypted,
          isFavorite: item.isFavorite,
          folder: item.folder,
          createdAt: item.lastUpdated, // Approximate
          updatedAt: item.lastUpdated,
        });
      }
    }
  }

  // Conflict Management
  private addConflict(
    type: "vault" | "item" | "category",
    id: string,
    local: any,
    remote: any
  ) {
    const existingIndex = this.conflicts.findIndex((c) => c.id === id);
    if (existingIndex >= 0) {
      this.conflicts[existingIndex] = {
        type,
        id,
        local,
        remote,
        timestamp: new Date(),
      };
    } else {
      this.conflicts.push({ type, id, local, remote, timestamp: new Date() });
    }
  }

  getConflicts() {
    return this.conflicts;
  }

  async resolveConflict(
    id: string,
    resolution: "local" | "remote"
  ): Promise<void> {
    const conflict = this.conflicts.find((c) => c.id === id);
    if (!conflict) return;

    if (resolution === "local") {
      // Keep local: Do nothing here, it will be pushed in next sync queue processing.
      // But we need to update the base "updated_at" in local DB to strictly > server time if needed?
      // Actually simply keeping it in queue is enough. PUSH logic will overwrite server.
      // We might want to touch the local timestamp to ensure it wins.
      // For now, just remove from conflict list.
    } else {
      // Keep remote:
      // 1. Remove from sync queue (undo local change)
      await IndexedDBService.clearSyncQueueItem(conflict.local.id);

      // 2. Apply remote change to local DB
      const { masterKey } = useAuthStore.getState();
      if (masterKey) {
        // We need to re-run the specific update logic.
        // Hacky reuse of updateLocalItems logic or just call it directly.
        if (conflict.type === "item") {
          await this.updateLocalItems([conflict.remote], masterKey);
        } else if (conflict.type === "vault") {
          await this.updateLocalVaults([conflict.remote], masterKey);
        }
      }
    }

    this.conflicts = this.conflicts.filter((c) => c.id !== id);
    this.notifyConflicts();
  }

  async ignoreConflict(id: string): Promise<void> {
    this.conflicts = this.conflicts.filter((c) => c.id !== id);
    this.notifyConflicts();
  }

  private notifyConflicts() {
    // Dispatch event or update store?
    // For simplicity, we can use a custom event or let the UI poll getConflicts().
    window.dispatchEvent(
      new CustomEvent("sync-conflicts-updated", {
        detail: this.conflicts.length,
      })
    );
  }

  private async pushVault(item: any, masterKey: Uint8Array): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) return;

    switch (item.action) {
      case "CREATE":
        await DatabaseService.createVault(
          user.id,
          item.data.name,
          item.data.icon,
          masterKey,
          item.data.description,
          item.data.notes
        );
        break;
      case "UPDATE":
        await DatabaseService.updateVault(item.entityId, item.data, masterKey);
        break;
      case "DELETE":
        await DatabaseService.deleteVault(item.entityId);
        break;
    }
  }

  private async pushItem(item: any, masterKey: Uint8Array): Promise<void> {
    switch (item.action) {
      case "CREATE":
        await DatabaseService.createItem(
          item.data.vaultId,
          item.data,
          masterKey
        );
        break;
      case "UPDATE":
        await DatabaseService.updateItem(item.entityId, item.data, masterKey);
        break;
      case "DELETE":
        await DatabaseService.deleteItem(item.entityId);
        break;
    }
  }

  private async pushCategory(item: any, masterKey: Uint8Array): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) return;

    switch (item.action) {
      case "CREATE":
        await DatabaseService.createCategory(
          user.id,
          item.data.name,
          item.data.color,
          masterKey
        );
        break;
      case "DELETE":
        await DatabaseService.deleteCategory(item.entityId);
        break;
    }
  }

  /**
   * Get sync status with conflicts
   */
  async getSyncStatus(): Promise<{
    pending: number;
    syncing: boolean;
    conflicts: number;
    queue?: any[];
  }> {
    const pending = await IndexedDBService.getPendingChangesCount();
    const queue = pending > 0 ? await IndexedDBService.getSyncQueue() : [];
    return {
      pending,
      syncing: this.isSyncing,
      conflicts: this.conflicts.length,
      queue,
    };
  }

  /**
   * Force sync now
   */
  async forceSyncNow(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error("Cannot sync while offline");
    }
    await this.sync();
  }

  /**
   * Clear retry attempts
   */
  clearRetries(): void {
    this.retryAttempts.clear();
  }
}

export default new SyncService();
