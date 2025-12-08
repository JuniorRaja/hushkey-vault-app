import { create } from "zustand";
import { Share } from "../../types";
import { supabase } from "../supabaseClient";
import ShareEncryptionService from "../services/shareEncryption";
import EncryptionService from "../services/encryption";

interface ShareState {
  shares: Share[];
  isLoading: boolean;
}

interface ShareActions {
  createShare: (
    userId: string,
    shareType: "item" | "vault",
    data: any,
    masterKey: Uint8Array,
    options: {
      itemId?: string;
      vaultId?: string;
      shareMethod: "in_app" | "qr" | "url";
      expiresAt?: string;
      maxViews?: number;
      oneTimeAccess?: boolean;
      passwordProtected?: boolean;
      password?: string;
      recipientEmail?: string;
    }
  ) => Promise<{ token: string; key: string }>;
  fetchShares: (userId: string) => Promise<void>;
  revokeShare: (shareId: string) => Promise<void>;
  accessShare: (token: string, key: string, password?: string) => Promise<any>;
  getShareUrl: (shareId: string, masterKey: Uint8Array) => Promise<string>;
}

export const useShareStore = create<ShareState & ShareActions>((set, get) => ({
  shares: [],
  isLoading: false,

  createShare: async (userId, shareType, data, masterKey, options) => {
    const token = await ShareEncryptionService.generateShareToken();
    const shareKey = await ShareEncryptionService.generateShareKey();
    const encryptedData = await ShareEncryptionService.encryptForShare(
      data,
      shareKey
    );

    const shareKeyString = ShareEncryptionService.shareKeyToString(shareKey);

    // Encrypt the share key with user's master key
    const encryptedShareKey = await EncryptionService.encrypt(
      shareKeyString,
      masterKey
    );

    const shareRecord: any = {
      user_id: userId,
      share_type: shareType,
      item_id: options.itemId || null,
      vault_id: options.vaultId || null,
      share_method: options.shareMethod,
      share_token: token,
      encrypted_share_key: encryptedShareKey,
      encrypted_data: encryptedData,
      expires_at: options.expiresAt || null,
      max_views: options.maxViews || null,
      one_time_access: options.oneTimeAccess || false,
      password_protected: options.passwordProtected || false,
      recipient_email: options.recipientEmail || null,
      created_at: new Date().toISOString(),
    };

    if (options.password) {
      shareRecord.password_hash = await ShareEncryptionService.hashPassword(
        options.password
      );
    }

    const { error } = await supabase.from("shares").insert(shareRecord);
    if (error) throw error;

    return {
      token,
      key: shareKeyString,
    };
  },

  fetchShares: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from("shares")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    set({
      shares: data.map((s) => ({
        id: s.id,
        userId: s.user_id,
        shareType: s.share_type,
        itemId: s.item_id,
        vaultId: s.vault_id,
        shareMethod: s.share_method,
        shareToken: s.share_token,
        encryptedShareKey: s.encrypted_share_key,
        encryptedData: s.encrypted_data,
        expiresAt: s.expires_at,
        maxViews: s.max_views,
        viewCount: s.view_count,
        oneTimeAccess: s.one_time_access,
        passwordProtected: s.password_protected,
        recipientEmail: s.recipient_email,
        createdAt: s.created_at,
        lastAccessedAt: s.last_accessed_at,
        revoked: s.revoked,
        revokedAt: s.revoked_at,
      })),
      isLoading: false,
    });
  },

  revokeShare: async (shareId) => {
    const { error } = await supabase
      .from("shares")
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", shareId);

    if (error) throw error;

    const { shares } = get();
    set({
      shares: shares.map((s) =>
        s.id === shareId
          ? { ...s, revoked: true, revokedAt: new Date().toISOString() }
          : s
      ),
    });
  },

  accessShare: async (token, key, password) => {
    const { data: shares, error } = await supabase
      .from("shares")
      .select("*")
      .eq("share_token", token);

    if (error) throw error;
    if (!shares || shares.length === 0) throw new Error("Share not found");

    const share = shares[0];
    if (share.revoked) throw new Error("Share has been revoked");
    if (share.expires_at && new Date(share.expires_at) < new Date())
      throw new Error("Share has expired");
    if (share.max_views && share.view_count >= share.max_views)
      throw new Error("Maximum views reached");

    if (share.password_protected && password) {
      const passwordHash = await ShareEncryptionService.hashPassword(password);
      if (passwordHash !== share.password_hash)
        throw new Error("Incorrect password");
    }

    const shareKey = ShareEncryptionService.stringToShareKey(key);
    const decryptedData = await ShareEncryptionService.decryptShare(
      share.encrypted_data,
      shareKey
    );

    const now = new Date().toISOString();
    const updateData: any = {
      view_count: (share.view_count || 0) + 1,
      last_accessed_at: now,
    };

    if (share.one_time_access) {
      updateData.revoked = true;
      updateData.revoked_at = now;
    }

    await supabase.from("shares").update(updateData).eq("id", share.id);

    await supabase.from("share_access_logs").insert({
      share_id: share.id,
      accessed_at: now,
      access_granted: true,
    });

    return decryptedData;
  },

  getShareUrl: async (shareId, masterKey) => {
    const { shares } = get();
    const share = shares.find((s) => s.id === shareId);
    if (!share) throw new Error("Share not found");

    // Decrypt the share key using master key
    const shareKeyString = await EncryptionService.decrypt(
      share.encryptedShareKey,
      masterKey
    );

    // Construct the URL
    return `${window.location.origin}/#/share/${share.shareToken}#${shareKeyString}`;
  },
}));
