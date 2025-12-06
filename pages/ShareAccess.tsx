import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, Copy, Check, Shield, Clock, User } from 'lucide-react'
import { useShareStore } from '../src/stores/shareStore'
import { Item } from '../types'

const ShareAccess: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const { accessShare } = useShareStore()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSharedPassword, setShowSharedPassword] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    loadShare()
  }, [token])

  const loadShare = async () => {
    if (!token) return

    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    const key = queryStart > -1 ? new URLSearchParams(hash.substring(queryStart)).get('key') : null

    if (!key) {
      setError('Invalid share link')
      setLoading(false)
      return
    }

    try {
      const shareData = await accessShare(token, key, password || undefined)
      setData(shareData)
      setLoading(false)
    } catch (err: any) {
      if (err.message.includes('password')) {
        setRequiresPassword(true)
        setLoading(false)
      } else {
        setError(err.message || 'Failed to access share')
        setLoading(false)
      }
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await loadShare()
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Shield size={48} className="text-primary-500 animate-pulse" />
          <div className="text-white text-lg">Loading secure share...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
        <header className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Shield size={32} className="text-primary-500" />
            <div>
              <h1 className="text-xl font-bold text-white">HushKey Vault</h1>
              <p className="text-xs text-gray-500">Secure Password Manager</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
        <footer className="p-6 border-t border-gray-800 text-center text-sm text-gray-500">
          <p>Secured by HushKey Vault • End-to-End Encrypted</p>
        </footer>
      </div>
    )
  }

  if (requiresPassword && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
        <header className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Shield size={32} className="text-primary-500" />
            <div>
              <h1 className="text-xl font-bold text-white">HushKey Vault</h1>
              <p className="text-xs text-gray-500">Secure Password Manager</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
            <Lock size={48} className="text-primary-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2 text-center">Password Required</h2>
            <p className="text-gray-400 text-center mb-6">This share is password protected</p>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white pr-12"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              <button
                type="submit"
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
              >
                Access Share
              </button>
            </form>
          </div>
        </div>
        <footer className="p-6 border-t border-gray-800 text-center text-sm text-gray-500">
          <p>Secured by HushKey Vault • End-to-End Encrypted</p>
        </footer>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      <header className="p-6 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={32} className="text-primary-500" />
            <div>
              <h1 className="text-xl font-bold text-white">HushKey Vault</h1>
              <p className="text-xs text-gray-500">Secure Password Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Lock size={14} />
            <span>End-to-End Encrypted</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
          <div className="bg-gradient-to-r from-primary-900/20 to-primary-800/20 border-b border-gray-800 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{data.name}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <User size={14} />
                    Shared {data.type}
                  </span>
                  {data.createdAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(data.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {data.data?.username && (
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Username</label>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-white text-lg">{data.data.username}</p>
                  <button
                    onClick={() => copyToClipboard(data.data.username, 'username')}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                  >
                    {copied === 'username' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            )}

            {data.data?.password && (
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                <div className="flex items-center justify-between mt-2 gap-3">
                  <p className="text-white text-lg font-mono flex-1">
                    {showSharedPassword ? data.data.password : '••••••••••••'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSharedPassword(!showSharedPassword)}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                      {showSharedPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(data.data.password, 'password')}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                      {copied === 'password' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {data.data?.url && (
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Website URL</label>
                <div className="flex items-center justify-between mt-2">
                  <a href={data.data.url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 hover:underline text-lg truncate flex-1">
                    {data.data.url}
                  </a>
                  <button
                    onClick={() => copyToClipboard(data.data.url, 'url')}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white ml-2"
                  >
                    {copied === 'url' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            )}

            {data.notes && (
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</label>
                <p className="text-white mt-2 whitespace-pre-wrap leading-relaxed">{data.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-gray-950/50 border-t border-gray-800 p-4 text-center">
            <p className="text-xs text-gray-500">This share is encrypted and secure. Only you can view this content.</p>
          </div>
        </div>
      </div>

      <footer className="p-6 border-t border-gray-800 bg-gray-950/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <p className="text-sm text-gray-400 font-medium">Secured by HushKey Vault</p>
          <p className="text-xs text-gray-600">End-to-End Encrypted • Zero-Knowledge Architecture • Open Source</p>
        </div>
      </footer>
    </div>
  )
}

export default ShareAccess
