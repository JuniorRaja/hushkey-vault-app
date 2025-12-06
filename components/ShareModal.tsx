import React, { useState, useEffect } from 'react';
import { X, Copy, Clock, Check, QrCode, ShieldCheck, Scan, Lock, AlertCircle, Eye } from 'lucide-react';
import { Item, Vault } from '../types';
import { useShareStore } from '../src/stores/shareStore';
import { useAuthStore } from '../src/stores/authStore';
import { QRCodeSVG } from 'qrcode.react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | Vault | null; // Can share an Item or a Vault
  type: 'item' | 'vault';
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item, type }) => {
  const { createShare } = useShareStore()
  const { user } = useAuthStore()
  
  const [shareUrl, setShareUrl] = useState('')
  const [shareKey, setShareKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [expiry, setExpiry] = useState('24h')
  const [maxViews, setMaxViews] = useState<number | undefined>(undefined)
  const [oneTimeAccess, setOneTimeAccess] = useState(false)
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [password, setPassword] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setShareUrl('')
      setShareKey('')
      setError('')
      setPasswordProtected(false)
      setPassword('')
      setOneTimeAccess(false)
    }
  }, [isOpen])

  const getExpiryDate = () => {
    const now = new Date()
    switch (expiry) {
      case '1h': return new Date(now.getTime() + 60 * 60 * 1000).toISOString()
      case '24h': return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      case '7d': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      case '30d': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      default: return undefined
    }
  }

  const generateLink = async () => {
    if (!user || !item) return
    
    if (passwordProtected && !password) {
      setError('Please enter a password')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const { token, key } = await createShare(
        user.id,
        type,
        item,
        {
          itemId: type === 'item' ? item.id : undefined,
          vaultId: type === 'vault' ? item.id : undefined,
          shareMethod: 'url',
          expiresAt: getExpiryDate(),
          maxViews,
          oneTimeAccess,
          passwordProtected,
          password: passwordProtected ? password : undefined
        }
      )

      const url = `${window.location.origin}/#/share/${token}?key=${key}`
      setShareUrl(url)
      setShareKey(key)
    } catch (err) {
      setError('Failed to create share')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <QrCode size={20} className="text-primary-500" />
              Share {type === 'vault' ? 'Vault' : 'Item'}
            </h3>
            <p className="text-xs text-gray-500 line-clamp-1">{item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors bg-gray-800/50 rounded-lg p-1.5">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!shareUrl ? (
            <>
              <div className="bg-primary-900/20 border border-primary-500/20 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="text-primary-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-bold text-primary-200">Secure Sharing</h4>
                  <p className="text-xs text-primary-300/70 mt-1">Generate an encrypted link to share this {type} securely with anyone.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expires In</label>
                    <div className="relative mt-1">
                      <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white appearance-none focus:border-primary-500 outline-none">
                        <option value="1h">1 Hour</option>
                        <option value="24h">24 Hours</option>
                        <option value="7d">7 Days</option>
                        <option value="30d">30 Days</option>
                      </select>
                      <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Max Views</label>
                    <select value={maxViews || ''} onChange={(e) => setMaxViews(e.target.value ? Number(e.target.value) : undefined)} className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white focus:border-primary-500 outline-none">
                      <option value="">Unlimited</option>
                      <option value="1">1 View</option>
                      <option value="5">5 Views</option>
                      <option value="10">10 Views</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                    <input type="checkbox" checked={oneTimeAccess} onChange={(e) => setOneTimeAccess(e.target.checked)} className="w-4 h-4 accent-primary-500" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-200">One-time access</span>
                      <p className="text-xs text-gray-500">Link expires after first view</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                    <input type="checkbox" checked={passwordProtected} onChange={(e) => setPasswordProtected(e.target.checked)} className="w-4 h-4 accent-primary-500" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-200">Password protect</span>
                      <p className="text-xs text-gray-500">Require password to access</p>
                    </div>
                  </label>
                </div>

                {passwordProtected && (
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-3 py-2.5 text-white focus:border-primary-500 outline-none" />
                  </div>
                )}
              </div>

              <button onClick={generateLink} disabled={isGenerating} className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg font-medium shadow-lg shadow-primary-900/30 transition-all active:scale-95">
                {isGenerating ? 'Generating...' : 'Generate Share Link'}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-xl border-4 border-white">
                <QRCodeSVG value={shareUrl} size={200} />
                <div className="text-black text-[10px] font-bold mt-4 uppercase tracking-wider flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
                  <Scan size={14} /> Scan to Access
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Secure URL</label>
                  <span className="text-[10px] text-green-500 flex items-center gap-1"><ShieldCheck size={10}/> Encrypted</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-300 truncate font-mono select-all">
                    {shareUrl}
                  </div>
                  <button onClick={handleCopy} className={`p-2.5 rounded-xl border transition-all ${copied ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'}`}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 space-y-1.5 text-xs text-gray-400">
                <p className="flex items-center gap-2"><Clock size={12} className="text-primary-500" /> Expires: {new Date(getExpiryDate()!).toLocaleString()}</p>
                {maxViews && <p className="flex items-center gap-2"><span className="text-primary-500">•</span> Max views: {maxViews}</p>}
                {oneTimeAccess && <p className="flex items-center gap-2"><AlertCircle size={12} className="text-amber-500" /> One-time access enabled</p>}
                {passwordProtected && <p className="flex items-center gap-2"><Lock size={12} className="text-primary-500" /> Password protected</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;