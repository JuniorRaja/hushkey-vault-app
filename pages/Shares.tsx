import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, Eye, Clock, Trash2, Copy, Check, AlertCircle, Lock, Calendar, ExternalLink, ArrowLeft, Filter } from 'lucide-react'
import { useShareStore } from '../src/stores/shareStore'
import { useAuthStore } from '../src/stores/authStore'

const Shares: React.FC = () => {
  const navigate = useNavigate()
  const { shares, fetchShares, revokeShare, isLoading } = useShareStore()
  const { user } = useAuthStore()
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [selectedShare, setSelectedShare] = useState<any>(null)

  useEffect(() => {
    if (user) fetchShares(user.id)
  }, [user])

  const copyShareUrl = async (shareId: string) => {
    try {
      const { getShareUrl } = useShareStore.getState()
      const { masterKey } = useAuthStore.getState()
      if (!masterKey) throw new Error('Master key not available')
      
      const url = await getShareUrl(shareId, masterKey)
      await navigator.clipboard.writeText(url)
      setCopied(shareId)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy share URL:', error)
      alert('Failed to copy share URL')
    }
  }

  const handleRevoke = async (shareId: string) => {
    if (confirm('Revoke this share? The link will stop working immediately.')) {
      await revokeShare(shareId)
      if (user) fetchShares(user.id)
      setSelectedShare(null)
    }
  }

  const getStatusBadge = (share: any) => {
    if (share.revoked) return { text: 'Revoked', class: 'bg-red-900/30 text-red-400' }
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) return { text: 'Expired', class: 'bg-gray-700 text-gray-400' }
    if (share.maxViews && share.viewCount >= share.maxViews) return { text: 'Max Views', class: 'bg-gray-700 text-gray-400' }
    return { text: 'Active', class: 'bg-green-900/30 text-green-400' }
  }

  const filteredShares = shares.filter(s => {
    if (filter === 'active') return !s.revoked && (!s.expiresAt || new Date(s.expiresAt) > new Date())
    if (filter === 'expired') return s.revoked || (s.expiresAt && new Date(s.expiresAt) <= new Date())
    return true
  })

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/vaults')} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">My Shares</h2>
            <p className="text-gray-400 text-sm">{shares.length} total shares</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            All
          </button>
          <button onClick={() => setFilter('active')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === 'active' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            Active
          </button>
          <button onClick={() => setFilter('expired')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === 'expired' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            Expired
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-800 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
          <Link2 size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium text-gray-300">No shares found</p>
          <p className="text-sm">Create shares from items or vaults</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShares.map(share => {
            const status = getStatusBadge(share)
            return (
              <div key={share.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">Share #{share.shareToken.substring(0, 12)}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${status.class}`}>{status.text}</span>
                    </div>
                    <p className="text-xs text-gray-500">Created {new Date(share.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Eye size={14} />
                    <span>{share.viewCount} / {share.maxViews || '∞'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Clock size={14} />
                    <span>{share.expiresAt ? new Date(share.expiresAt).toLocaleDateString() : 'No expiry'}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto pt-3 border-t border-gray-800">
                  <button
                    onClick={() => copyShareUrl(share.id)}
                    className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copied === share.id ? <Check size={14} /> : <Copy size={14} />}
                    Copy
                  </button>
                  {!share.revoked && (
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="px-3 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Shares
