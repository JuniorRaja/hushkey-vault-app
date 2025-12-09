/**
 * Sync Service for offline/online data synchronization
 */

import IndexedDBService from './indexedDB';
import DatabaseService from './database';
import { useAuthStore } from '../stores/authStore';

class SyncService {
  private isSyncing = false;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  /**
   * Process sync queue when coming back online
   */
  async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return;
    
    const { user, masterKey } = useAuthStore.getState();
    if (!user || !masterKey) return;

    this.isSyncing = true;

    try {
      const queue = await IndexedDBService.getSyncQueue();
      console.log(`Processing ${queue.length} queued changes...`);
      
      for (const item of queue) {
        const retries = this.retryAttempts.get(item.id) || 0;
        
        if (retries >= this.maxRetries) {
          console.error(`Max retries reached for ${item.entityType} ${item.entityId}`);
          await IndexedDBService.clearSyncQueueItem(item.id);
          this.retryAttempts.delete(item.id);
          continue;
        }

        try {
          switch (item.entityType) {
            case 'vault':
              await this.syncVault(item, masterKey);
              break;
            case 'item':
              await this.syncItem(item, masterKey);
              break;
            case 'category':
              await this.syncCategory(item, masterKey);
              break;
          }
          
          await IndexedDBService.clearSyncQueueItem(item.id);
          this.retryAttempts.delete(item.id);
          console.log(`Synced ${item.entityType} ${item.entityId}`);
        } catch (error) {
          console.error(`Failed to sync ${item.entityType} ${item.entityId}:`, error);
          this.retryAttempts.set(item.id, retries + 1);
          
          // Exponential backoff
          const delay = this.baseDelay * Math.pow(2, retries);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncVault(item: any, masterKey: Uint8Array): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) return;

    switch (item.action) {
      case 'CREATE':
        await DatabaseService.createVault(
          user.id,
          item.data.name,
          item.data.icon,
          masterKey,
          item.data.description,
          item.data.notes
        );
        break;
      case 'UPDATE':
        await DatabaseService.updateVault(item.entityId, item.data, masterKey);
        break;
      case 'DELETE':
        await DatabaseService.deleteVault(item.entityId);
        break;
    }
  }

  private async syncItem(item: any, masterKey: Uint8Array): Promise<void> {
    switch (item.action) {
      case 'CREATE':
        await DatabaseService.createItem(item.data.vaultId, item.data, masterKey);
        break;
      case 'UPDATE':
        await DatabaseService.updateItem(item.entityId, item.data, masterKey);
        break;
      case 'DELETE':
        await DatabaseService.deleteItem(item.entityId);
        break;
    }
  }

  private async syncCategory(item: any, masterKey: Uint8Array): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) return;

    switch (item.action) {
      case 'CREATE':
        await DatabaseService.createCategory(user.id, item.data.name, item.data.color, masterKey);
        break;
      case 'DELETE':
        await DatabaseService.deleteCategory(item.entityId);
        break;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{ pending: number; syncing: boolean }> {
    const pending = await IndexedDBService.getPendingChangesCount();
    return { pending, syncing: this.isSyncing };
  }

  /**
   * Force sync now
   */
  async forceSyncNow(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }
    await this.processSyncQueue();
  }

  /**
   * Clear retry attempts
   */
  clearRetries(): void {
    this.retryAttempts.clear();
  }
}

export default new SyncService();
