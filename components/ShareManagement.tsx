import React, { useEffect, useState } from 'react'
import { Link2, Eye, Clock, Trash2, RotateCcw, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react'
import { useShareStore } from '../src/stores/shareStore'
import { useAuthStore } from '../src/stores/authStore'

const ShareManagement: React.FC = () => {
  const { shares, fetchShares, revokeShare, isLoading } = useShareStore()
  const { user } = useAuthStore()
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchShares(user.id)
    }
  }, [user])

  const copyShareUrl = async (token: string, key: string) => {
    const url = `${window.location.origin}/#/share/${token}?key=${key}`
    await navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRevoke = async (shareId: string) => {
    if (confirm('Revoke this share? The link will stop working immediately.')) {
      await revokeShare(shareId)
      if (user) fetchShares(user.id)
    }
  }

  const getStatusBadge = (share: any) => {
    if (share.revoked) return <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded-full">Revoked</span>
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) return <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">Expired</span>
    if (share.maxViews && share.viewCount >= share.maxViews) return <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">Max Views</span>
    return <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-full">Active</span>
  }

  const activeShares = shares.filter(s => !s.revoked && (!s.expiresAt || new Date(s.expiresAt) > new Date()))
  const inactiveShares = shares.filter(s => s.revoked || (s.expiresAt && new Date(s.expiresAt) <= new Date()))

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-800 rounded w-1/4"></div>
          <div className="h-20 bg-gray-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (shares.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <Link2 size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No shares created yet</p>
        <p className="text-gray-600 text-xs mt-1">Share items or vaults to see them here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeShares.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-950/50">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Shares ({activeShares.length})</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {activeShares.map(share => (
              <div key={share.id} className="p-4 hover:bg-gray-850 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-medium truncate">Share #{share.shareToken.substring(0, 8)}</h4>
                      {getStatusBadge(share)}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye size={12} />
                        <span>{share.viewCount} / {share.maxViews || '∞'} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{share.expiresAt ? new Date(share.expiresAt).toLocaleDateString() : 'No expiry'}</span>
                      </div>
                      {share.oneTimeAccess && (
                        <div className="flex items-center gap-1 text-amber-500">
                          <AlertCircle size={12} />
                          <span>One-time</span>
                        </div>
                      )}
                      {share.passwordProtected && (
                        <div className="flex items-center gap-1 text-primary-400">
                          <span>🔒 Protected</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyShareUrl(share.shareToken, share.encryptedData)}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                      title="Copy link"
                    >
                      {copied === share.shareToken ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="p-2 hover:bg-red-900/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                      title="Revoke"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {inactiveShares.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-950/50">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Inactive Shares ({inactiveShares.length})</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {inactiveShares.map(share => (
              <div key={share.id} className="p-4 opacity-60">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-gray-400 font-medium text-sm">Share #{share.shareToken.substring(0, 8)}</h4>
                      {getStatusBadge(share)}
                    </div>
                    <p className="text-xs text-gray-600">
                      {share.revoked ? `Revoked on ${new Date(share.revokedAt!).toLocaleDateString()}` : 'Expired'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ShareManagement
