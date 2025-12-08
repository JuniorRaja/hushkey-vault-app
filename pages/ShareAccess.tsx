import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, Copy, Check, Shield, Clock, User, CreditCard, Wifi, Globe, StickyNote, Landmark, Database, Server, Terminal, IdCard, FileText } from 'lucide-react'
import { useShareStore } from '../src/stores/shareStore'
import { Item, ItemType } from '../types'

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
    if (!token) {
      setError('Invalid share link - missing token')
      setLoading(false)
      return
    }

    const fullHash = window.location.href
    const secondHashIndex = fullHash.indexOf('#', fullHash.indexOf('#') + 1)
    const key = secondHashIndex > -1 ? fullHash.substring(secondHashIndex + 1) : null

    if (!key) {
      setError('Invalid share link - missing encryption key')
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
      } else if (err.message.includes('encryption key')) {
        setError('Invalid or corrupted share link')
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

  const FieldDisplay = ({ label, value, field, multiline = false }: { label: string; value: string; field: string; multiline?: boolean }) => (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center justify-between mt-2">
        <p className={`text-white ${multiline ? 'text-sm font-mono whitespace-pre-wrap' : 'text-lg'} flex-1 break-all`}>{value}</p>
        <button
          onClick={() => copyToClipboard(value, field)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white ml-2 shrink-0"
        >
          {copied === field ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
        </button>
      </div>
    </div>
  )

  const PasswordField = ({ label, value, field, multiline = false }: { label: string; value: string; field: string; multiline?: boolean }) => {
    const [show, setShow] = useState(false)
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        <div className="flex items-center justify-between mt-2 gap-3">
          <p className={`text-white ${multiline ? 'text-sm' : 'text-lg'} font-mono flex-1 break-all ${multiline ? 'whitespace-pre-wrap' : ''}`}>
            {show ? value : '••••••••••••'}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShow(!show)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={() => copyToClipboard(value, field)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              {copied === field ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const LinkField = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center justify-between mt-2">
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 hover:underline text-lg truncate flex-1">
          {value}
        </a>
        <button
          onClick={() => copyToClipboard(value, field)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white ml-2"
        >
          {copied === field ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
        </button>
      </div>
    </div>
  )

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
            {/* LOGIN fields */}
            {data.data?.username && <FieldDisplay label="Username" value={data.data.username} field="username" />}
            {data.data?.password && <PasswordField label="Password" value={data.data.password} field="password" />}
            {data.data?.url && <LinkField label="Website URL" value={data.data.url} field="url" />}
            
            {/* CARD fields */}
            {data.data?.holderName && <FieldDisplay label="Cardholder Name" value={data.data.holderName} field="holderName" />}
            {data.data?.number && <FieldDisplay label="Card Number" value={data.data.number} field="number" />}
            {data.data?.expiry && <FieldDisplay label="Expiry" value={data.data.expiry} field="expiry" />}
            {data.data?.cvv && <PasswordField label="CVV" value={data.data.cvv} field="cvv" />}
            {data.data?.pin && <PasswordField label="PIN" value={data.data.pin} field="pin" />}
            
            {/* WIFI fields */}
            {data.data?.ssid && <FieldDisplay label="Network Name (SSID)" value={data.data.ssid} field="ssid" />}
            {data.data?.securityType && <FieldDisplay label="Security Type" value={data.data.securityType} field="securityType" />}
            
            {/* BANK fields */}
            {data.data?.bankName && <FieldDisplay label="Bank Name" value={data.data.bankName} field="bankName" />}
            {data.data?.accountNumber && <FieldDisplay label="Account Number" value={data.data.accountNumber} field="accountNumber" />}
            {data.data?.ifsc && <FieldDisplay label="IFSC/IBAN" value={data.data.ifsc} field="ifsc" />}
            {data.data?.swift && <FieldDisplay label="SWIFT/BIC" value={data.data.swift} field="swift" />}
            
            {/* DATABASE fields */}
            {data.data?.host && <FieldDisplay label="Host" value={data.data.host} field="host" />}
            {data.data?.port && <FieldDisplay label="Port" value={data.data.port} field="port" />}
            {data.data?.databaseName && <FieldDisplay label="Database Name" value={data.data.databaseName} field="databaseName" />}
            
            {/* SERVER fields */}
            {data.data?.ip && <FieldDisplay label="IP Address" value={data.data.ip} field="ip" />}
            {data.data?.hostname && <FieldDisplay label="Hostname" value={data.data.hostname} field="hostname" />}
            
            {/* SSH_KEY fields */}
            {data.data?.publicKey && <FieldDisplay label="Public Key" value={data.data.publicKey} field="publicKey" multiline />}
            {data.data?.privateKey && <PasswordField label="Private Key" value={data.data.privateKey} field="privateKey" multiline />}
            {data.data?.passphrase && <PasswordField label="Passphrase" value={data.data.passphrase} field="passphrase" />}
            
            {/* ID_CARD fields */}
            {data.data?.idName && <FieldDisplay label="ID Name" value={data.data.idName} field="idName" />}
            {data.data?.fullName && <FieldDisplay label="Full Name" value={data.data.fullName} field="fullName" />}
            {data.data?.validTill && <FieldDisplay label="Valid Till" value={data.data.validTill} field="validTill" />}
            
            {/* IDENTITY fields */}
            {data.data?.firstName && <FieldDisplay label="First Name" value={data.data.firstName} field="firstName" />}
            {data.data?.lastName && <FieldDisplay label="Last Name" value={data.data.lastName} field="lastName" />}
            {data.data?.email && <FieldDisplay label="Email" value={data.data.email} field="email" />}
            {data.data?.phone && <FieldDisplay label="Phone" value={data.data.phone} field="phone" />}
            {data.data?.address1 && <FieldDisplay label="Address" value={data.data.address1} field="address1" />}
            
            {/* NOTE fields */}
            {data.data?.content && (
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content</label>
                <p className="text-white mt-2 whitespace-pre-wrap leading-relaxed font-mono text-sm">{data.data.content}</p>
              </div>
            )}
            
            {/* Common notes field */}
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
