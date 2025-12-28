/**
 * Database Service for Supabase operations
 * All data is encrypted client-side before storage
 */

import { supabase } from "../supabaseClient";
import EncryptionService from "./encryption";
import type { Vault, Item, Category, AppNotification } from "../../types";

interface UserProfile {
  user_id: string;
  salt: string;
  pin_verification?: string;
  name_encrypted?: string;
  public_key?: string;
  private_key_encrypted?: string;
  recovery_email_encrypted?: string;
  created_at: string;
  updated_at: string;
}

class DatabaseService {
  /**
   * Save user profile (salt for key derivation)
   */
  async saveUserProfile(userId: string, salt: string): Promise<void> {
    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        salt: salt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) throw error;
  }

  /**
   * Update PIN verification hash
   */
  async updatePinVerification(
    userId: string,
    pinVerification: string
  ): Promise<void> {
    const { error } = await supabase
      .from("user_profiles")
      .update({
        pin_verification: pinVerification,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Update user profile name (encrypted)
   */
  async updateUserProfileName(
    userId: string,
    name: string,
    masterKey: Uint8Array
  ): Promise<void> {
    const nameEncrypted = await EncryptionService.encrypt(name, masterKey);
    const { error } = await supabase
      .from("user_profiles")
      .update({
        name_encrypted: nameEncrypted,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Create initial user profile (for signup only)
   */
  async createUserProfile(userId: string, salt: string): Promise<void> {
    // Verify we have an active session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error(
        "No active session - user must be authenticated to create profile"
      );
    }
    const { data, error } = await supabase
      .from("user_profiles")
      .insert({
        user_id: userId,
        salt: salt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("Profile creation error:", error);
      throw error;
    }
  }

  /**
   * Get user profile (to retrieve salt)
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
    return data;
  }

  /**
   * Get user profile name (decrypted)
   */
  async getUserProfileName(
    userId: string,
    masterKey: Uint8Array
  ): Promise<string | null> {
    const profile = await this.getUserProfile(userId);
    if (!profile?.name_encrypted) return null;
    return await EncryptionService.decrypt(profile.name_encrypted, masterKey);
  }

  /**
   * Create a vault (encrypt name and description)
   */
  async createVault(
    userId: string,
    name: string,
    icon: string,
    masterKey: Uint8Array,
    description?: string,
    notes?: string,
    id?: string
  ): Promise<Vault> {
    const nameEncrypted = await EncryptionService.encrypt(name, masterKey);
    const descriptionEncrypted = description
      ? await EncryptionService.encrypt(description, masterKey)
      : undefined;
    const notesEncrypted = notes
      ? await EncryptionService.encrypt(notes, masterKey)
      : undefined;

    const payload: any = {
      user_id: userId,
      name_encrypted: nameEncrypted,
      description_encrypted: descriptionEncrypted,
      icon: icon,
      is_shared: false,
      shared_with: [],
      notes_encrypted: notesEncrypted,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (id) {
      payload.id = id;
    }

    const { data, error } = await supabase
      .from("vaults")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // Decrypt for return
    return {
      id: data.id,
      name: await EncryptionService.decrypt(data.name_encrypted, masterKey),
      description: data.description_encrypted
        ? await EncryptionService.decrypt(data.description_encrypted, masterKey)
        : undefined,
      icon: data.icon,
      createdAt: data.created_at,
      itemCount: 0,
      isShared: data.is_shared,
      sharedWith: data.shared_with || [],
      notes: data.notes_encrypted
        ? await EncryptionService.decrypt(data.notes_encrypted, masterKey)
        : undefined,
      deletedAt: data.deleted_at,
    };
  }

  /**
   * Get all vaults for a user (decrypt names)
   */
  async getVaults(userId: string, masterKey: Uint8Array): Promise<Vault[]> {
    const { data, error } = await supabase
      .from("vaults")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    // Decrypt vault names
    const vaults = await Promise.all(
      data.map(async (vault) => ({
        id: vault.id,
        name: await EncryptionService.decrypt(vault.name_encrypted, masterKey),
        description: vault.description_encrypted
          ? await EncryptionService.decrypt(
              vault.description_encrypted,
              masterKey
            )
          : undefined,
        icon: vault.icon,
        createdAt: vault.created_at,
        itemCount: 0, // Will be populated separately
        isShared: vault.is_shared,
        sharedWith: vault.shared_with || [],
        notes: vault.notes_encrypted
          ? await EncryptionService.decrypt(vault.notes_encrypted, masterKey)
          : undefined,
      }))
    );

    return vaults;
  }

  /**
   * Update a vault
   */
  async updateVault(
    vaultId: string,
    updates: Partial<Vault>,
    masterKey: Uint8Array
  ): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name) {
      updateData.name_encrypted = await EncryptionService.encrypt(
        updates.name,
        masterKey
      );
    }
    if (updates.description !== undefined) {
      updateData.description_encrypted = updates.description
        ? await EncryptionService.encrypt(updates.description, masterKey)
        : null;
    }
    if (updates.icon) {
      updateData.icon = updates.icon;
    }
    if (updates.notes !== undefined) {
      updateData.notes_encrypted = updates.notes
        ? await EncryptionService.encrypt(updates.notes, masterKey)
        : null;
    }
    if (updates.isShared !== undefined) {
      updateData.is_shared = updates.isShared;
    }
    if (updates.sharedWith) {
      updateData.shared_with = updates.sharedWith;
    }

    const { error } = await supabase
      .from("vaults")
      .update(updateData)
      .eq("id", vaultId);

    if (error) throw error;
  }

  /**
   * Delete vault (soft delete)
   */
  async deleteVault(vaultId: string): Promise<void> {
    const { error } = await supabase
      .from("vaults")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", vaultId);

    if (error) throw error;
  }

  /**
   * Restore vault
   */
  async restoreVault(vaultId: string): Promise<void> {
    const { error } = await supabase
      .from("vaults")
      .update({
        is_deleted: false,
        deleted_at: null,
      })
      .eq("id", vaultId);

    if (error) throw error;
  }

  /**
   * Permanently delete vault
   */
  async permanentlyDeleteVault(vaultId: string): Promise<void> {
    const { error } = await supabase.from("vaults").delete().eq("id", vaultId);

    if (error) throw error;
  }

  /**
   * Create an item (encrypt all data as JSON blob)
   */
  async createItem(
    vaultId: string,
    itemData: Partial<Item>,
    masterKey: Uint8Array,
    id?: string
  ): Promise<Item> {
    // Encrypt the entire item data as JSON
    const dataEncrypted = await EncryptionService.encryptObject(
      itemData,
      masterKey
    );

    const payload: any = {
      vault_id: vaultId,
      category_id: itemData.categoryId || null,
      type: itemData.type,
      data_encrypted: dataEncrypted,
      is_favorite: itemData.isFavorite || false,
      folder: itemData.folder || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (id) {
      payload.id = id;
    }

    const { data, error } = await supabase
      .from("items")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // Decrypt for return
    const decryptedData = await EncryptionService.decryptObject<Partial<Item>>(
      data.data_encrypted,
      masterKey
    );

    return {
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
  }

  /**
   * Get all items for a vault (decrypt data)
   */
  async getItems(vaultId: string, masterKey: Uint8Array): Promise<Item[]> {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("vault_id", vaultId)
      .eq("is_deleted", false)
      .is("deleted_at", null);

    if (error) throw error;

    // Decrypt item data
    const items = await Promise.all(
      data.map(async (item) => {
        const decryptedData = await EncryptionService.decryptObject<
          Partial<Item>
        >(item.data_encrypted, masterKey);

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
        } as Item;
      })
    );

    // Sort: favorites first (alphabetically), then non-favorites (alphabetically)
    return items.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
      });
    });
  }

  /**
   * Get all items across all vaults for a user
   */
  async getAllItems(userId: string, masterKey: Uint8Array): Promise<Item[]> {
    const { data, error } = await supabase
      .from("items")
      .select("*, vaults!inner(user_id)")
      .eq("vaults.user_id", userId)
      .eq("is_deleted", false)
      .is("deleted_at", null);

    if (error) throw error;

    const items = await Promise.all(
      data.map(async (item) => {
        const decryptedData = await EncryptionService.decryptObject<
          Partial<Item>
        >(item.data_encrypted, masterKey);

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
        } as Item;
      })
    );

    // Sort: favorites first (alphabetically), then non-favorites (alphabetically)
    return items.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
      });
    });
  }

  /**
   * Get favorite items for quick access
   */
  async getFavoriteItems(
    userId: string,
    masterKey: Uint8Array,
    limit: number = 10
  ): Promise<Item[]> {
    const { data, error } = await supabase
      .from("items")
      .select(
        "id, vault_id, type, is_favorite, category_id, folder, deleted_at, updated_at, data_encrypted, vaults!inner(user_id)"
      )
      .eq("vaults.user_id", userId)
      .eq("is_favorite", true)
      .eq("is_deleted", false)
      .is("deleted_at", null)
      .order("last_accessed_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;

    const items = await Promise.all(
      data.map(async (item) => {
        const decryptedData = await EncryptionService.decryptObject<
          Partial<Item>
        >(item.data_encrypted, masterKey);

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
        } as Item;
      })
    );

    return items;
  }

  /**
   * Update last accessed timestamp for an item
   */
  async updateLastAccessed(itemId: string): Promise<void> {
    const { error } = await supabase
      .from("items")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", itemId);

    if (error) throw error;
  }

  /**
   * Get vault item count
   */
  async getVaultItemCount(vaultId: string): Promise<number> {
    const { count, error } = await supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("vault_id", vaultId)
      .eq("is_deleted", false)
      .is("deleted_at", null);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Get item counts for all vaults in a single query
   * Returns a map of vaultId -> count
   */
  async getVaultItemCounts(userId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from("items")
      .select("vault_id, vaults!inner(user_id)")
      .eq("vaults.user_id", userId)
      .eq("is_deleted", false)
      .is("deleted_at", null);

    if (error) throw error;

    const counts: Record<string, number> = {};
    data.forEach((item) => {
      counts[item.vault_id] = (counts[item.vault_id] || 0) + 1;
    });

    return counts;
  }

  /**
   * Update an item
   */
  async updateItem(
    itemId: string,
    updates: Partial<Item>,
    masterKey: Uint8Array
  ): Promise<void> {
    // Fetch existing item to merge with updates
    const { data: existingItem, error: fetchError } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (fetchError) throw fetchError;

    // Decrypt existing data
    const existingData = await EncryptionService.decryptObject<Partial<Item>>(
      existingItem.data_encrypted,
      masterKey
    );

    // Merge existing data with updates
    const mergedData = { ...existingData, ...updates };

    // Encrypt the complete merged data
    const dataEncrypted = await EncryptionService.encryptObject(
      mergedData,
      masterKey
    );

    const updateData: any = {
      data_encrypted: dataEncrypted,
      updated_at: new Date().toISOString(),
    };

    if (updates.vaultId !== undefined) {
      updateData.vault_id = updates.vaultId;
    }
    if (updates.categoryId !== undefined) {
      updateData.category_id = updates.categoryId || null;
    }
    if (updates.isFavorite !== undefined) {
      updateData.is_favorite = updates.isFavorite;
    }
    if (updates.folder !== undefined) {
      updateData.folder = updates.folder || null;
    }

    const { error } = await supabase
      .from("items")
      .update(updateData)
      .eq("id", itemId);

    if (error) throw error;
  }

  /**
   * Delete item (soft delete)
   */
  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from("items")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (error) throw error;
  }

  /**
   * Restore item
   */
  async restoreItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from("items")
      .update({
        is_deleted: false,
        deleted_at: null,
      })
      .eq("id", itemId);

    if (error) throw error;
  }

  /**
   * Permanently delete item
   */
  async permanentlyDeleteItem(itemId: string): Promise<void> {
    const { error } = await supabase.from("items").delete().eq("id", itemId);

    if (error) throw error;
  }

  /**
   * Create a category (encrypt name)
   */
  async createCategory(
    userId: string,
    name: string,
    color: string,
    masterKey: Uint8Array,
    id?: string
  ): Promise<Category> {
    const nameEncrypted = await EncryptionService.encrypt(name, masterKey);

    const payload: any = {
      user_id: userId,
      name_encrypted: nameEncrypted,
      color: color,
      created_at: new Date().toISOString(),
    };

    if (id) {
      payload.id = id;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: await EncryptionService.decrypt(data.name_encrypted, masterKey),
      color: data.color,
    };
  }

  /**
   * Get all categories for a user (decrypt names)
   */
  async getCategories(
    userId: string,
    masterKey: Uint8Array
  ): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    // Decrypt category names
    const categories = await Promise.all(
      data.map(async (category) => ({
        id: category.id,
        name: await EncryptionService.decrypt(
          category.name_encrypted,
          masterKey
        ),
        color: category.color,
      }))
    );

    return categories;
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) throw error;
  }

  /**
   * Save device info (upsert)
   * Enhanced with fingerprinting support
   */
  async saveDevice(
    userId: string,
    deviceId: string,
    deviceName: string = "Unknown Device",
    metadata: {
      fingerprint?: string;
      userAgent?: string;
      ipAddress?: string;
    } = {}
  ): Promise<void> {
    const { error } = await supabase.from("devices").upsert(
      {
        user_id: userId,
        device_id: deviceId,
        device_name: deviceName,
        fingerprint: metadata.fingerprint || "unknown",
        user_agent: metadata.userAgent || navigator.userAgent,
        ip_address: metadata.ipAddress,
        last_active: new Date().toISOString(), // Standardized to last_active
      },
      {
        onConflict: "device_id",
      }
    );

    if (error) throw error;
  }

  /**
   * Get active devices for user
   */
  async getDevices(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("devices")
      .select("*")
      .eq("user_id", userId)
      .order("last_active", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Check if a fingerprint is trusted/known for this user
   */
  async isFingerprintKnown(
    userId: string,
    fingerprint: string
  ): Promise<boolean> {
    const { count, error } = await supabase
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("fingerprint", fingerprint);

    if (error) {
      console.warn("Failed to check fingerprint:", error);
      return false;
    }
    return (count || 0) > 0;
  }

  /**
   * Get device count for user
   */
  async getDeviceCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Log activity
   */
  async logActivity(
    userId: string,
    action: string,
    details: string
  ): Promise<void> {
    const { error } = await supabase.from("activity_logs").insert({
      user_id: userId,
      action: action,
      details: details,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  /**
   * Get activity logs
   */
  async getActivityLogs(userId: string, limit: number = 100): Promise<any[]> {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  /**
   * Get auto-delete days setting
   */
  async getAutoDeleteDays(userId: string): Promise<number> {
    const settings = await this.getUserSettings(userId);
    return settings?.auto_delete_days ?? 30;
  }

  /**
   * Save user settings
   */
  async saveUserSettings(userId: string, settings: any): Promise<void> {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) throw error;
  }

  /**
   * Delete user account and all data
   */
  async deleteUserAccount(userId: string): Promise<void> {
    // Delete all user data from tables
    await supabase.from("items").delete().eq("vault_id", userId);
    await supabase.from("vaults").delete().eq("user_id", userId);
    await supabase.from("categories").delete().eq("user_id", userId);
    await supabase.from("activity_logs").delete().eq("user_id", userId);
    await supabase.from("devices").delete().eq("user_id", userId);
    await supabase.from("user_settings").delete().eq("user_id", userId);
    await supabase.from("user_profiles").delete().eq("user_id", userId);

    // Delete the auth user account
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  /**
   * Clear all user data except auth and profile
   */
  async clearAllUserData(userId: string): Promise<void> {
    // Get all vaults to find items
    const { data: vaults } = await supabase
      .from("vaults")
      .select("id")
      .eq("user_id", userId);
    const vaultIds = vaults?.map((v) => v.id) || [];

    // Delete file attachments from storage
    if (vaultIds.length > 0) {
      const { data: items } = await supabase
        .from("items")
        .select("id")
        .in("vault_id", vaultIds);
      const itemIds = items?.map((i) => i.id) || [];

      if (itemIds.length > 0) {
        const { data: files } = await supabase
          .from("file_attachments")
          .select("id")
          .in("item_id", itemIds);
        if (files && files.length > 0) {
          await supabase.storage.from("hushkey-vault").remove([`${userId}/*`]);
          await supabase
            .from("file_attachments")
            .delete()
            .in("item_id", itemIds);
        }
      }

      await supabase.from("items").delete().in("vault_id", vaultIds);
    }

    await supabase.from("vaults").delete().eq("user_id", userId);
    await supabase.from("categories").delete().eq("user_id", userId);
    await supabase.from("user_settings").delete().eq("user_id", userId);
    await supabase.from("devices").delete().eq("user_id", userId);
    await supabase.from("activity_logs").delete().eq("user_id", userId);
    await supabase.from("app_notifications").delete().eq("user_id", userId);
  }

  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    notification: Partial<AppNotification>
  ): Promise<AppNotification> {
    const { data, error } = await supabase
      .from("app_notifications")
      .insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read || false,
        created_at: new Date().toISOString(),
        metadata: {}, // Can start empty
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      message: data.message,
      type: data.type as any,
      timestamp: data.created_at,
      read: data.read,
    };
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    limit: number = 50
  ): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from("app_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as any,
      timestamp: n.created_at,
      read: n.read,
    }));
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from("app_notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) throw error;
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from("app_notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw error;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from("app_notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
  }

  /**
   * Clear all notifications
   */
  async clearNotifications(userId: string): Promise<void> {
    const { error } = await supabase
      .from("app_notifications")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
  }
}

export default new DatabaseService();
