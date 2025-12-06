import { create } from 'zustand'
import { Share } from '../../types'
import { supabase } from '../supabaseClient'
import ShareEncryptionService from '../services/shareEncryption'

interface ShareState {
  shares: Share[]
  isLoading: boolean
}

interface ShareActions {
  createShare: (
    userId: string,
    shareType: 'item' | 'vault',
    data: any,
    options: {
      itemId?: string
      vaultId?: string
      shareMethod: 'in_app' | 'qr' | 'url'
      expiresAt?: string
      maxViews?: number
      oneTimeAccess?: boolean
      passwordProtected?: boolean
      password?: string
      recipientEmail?: string
    }
  ) => Promise<{ token: string; key: string }>
  fetchShares: (userId: string) => Promise<void>
  revokeShare: (shareId: string) => Promise<void>
  accessShare: (token: string, key: string, password?: string) => Promise<any>
}

export const useShareStore = create<ShareState & ShareActions>((set, get) => ({
  shares: [],
  isLoading: false,

  createShare: async (userId, shareType, data, options) => {
    const token = await ShareEncryptionService.generateShareToken()
    const shareKey = await ShareEncryptionService.generateShareKey()
    const encryptedData = await ShareEncryptionService.encryptForShare(data, shareKey)
    
    const shareRecord: any = {
      user_id: userId,
      share_type: shareType,
      item_id: options.itemId || null,
      vault_id: options.vaultId || null,
      share_method: options.shareMethod,
      share_token: token,
      encrypted_data: encryptedData,
      expires_at: options.expiresAt || null,
      max_views: options.maxViews || null,
      one_time_access: options.oneTimeAccess || false,
      password_protected: options.passwordProtected || false,
      recipient_email: options.recipientEmail || null,
      created_at: new Date().toISOString()
    }

    if (options.password) {
      shareRecord.password_hash = await ShareEncryptionService.hashPassword(options.password)
    }

    const { error } = await supabase.from('shares').insert(shareRecord)
    if (error) throw error

    return {
      token,
      key: ShareEncryptionService.shareKeyToString(shareKey)
    }
  },

  fetchShares: async (userId) => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('shares')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    set({
      shares: data.map(s => ({
        id: s.id,
        userId: s.user_id,
        shareType: s.share_type,
        itemId: s.item_id,
        vaultId: s.vault_id,
        shareMethod: s.share_method,
        shareToken: s.share_token,
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
        revokedAt: s.revoked_at
      })),
      isLoading: false
    })
  },

  revokeShare: async (shareId) => {
    const { error } = await supabase
      .from('shares')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString()
      })
      .eq('id', shareId)

    if (error) throw error
    
    const { shares } = get()
    set({
      shares: shares.map(s => s.id === shareId ? { ...s, revoked: true, revokedAt: new Date().toISOString() } : s)
    })
  },

  accessShare: async (token, key, password) => {
    const { data: shares, error } = await supabase
      .from('shares')
      .select('*')
      .eq('share_token', token)

    if (error) throw error
    if (!shares || shares.length === 0) throw new Error('Share not found')
    
    const share = shares[0]
    if (share.revoked) throw new Error('Share has been revoked')
    if (share.expires_at && new Date(share.expires_at) < new Date()) throw new Error('Share has expired')
    if (share.max_views && share.view_count >= share.max_views) throw new Error('Maximum views reached')

    if (share.password_protected && password) {
      const passwordHash = await ShareEncryptionService.hashPassword(password)
      if (passwordHash !== share.password_hash) throw new Error('Incorrect password')
    }

    const shareKey = ShareEncryptionService.stringToShareKey(key)
    const decryptedData = await ShareEncryptionService.decryptShare(share.encrypted_data, shareKey)

    await supabase
      .from('shares')
      .update({
        view_count: share.view_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', share.id)

    if (share.one_time_access) {
      await supabase
        .from('shares')
        .update({ revoked: true, revoked_at: new Date().toISOString() })
        .eq('id', share.id)
    }

    return decryptedData
  }
}))
