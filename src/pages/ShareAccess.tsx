import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, Copy, Check, Shield, Clock, User, CreditCard, Wifi, Globe, StickyNote, Landmark, Database, Server, Terminal, IdCard, FileText } from 'lucide-react'
import { useShareStore } from '../stores/shareStore'
import { Item, ItemType } from '../../types'

const getDetailedError = (error: string): { title: string; message: string } => {
  const lowerError = error.toLowerCase()
  
  if (lowerError.includes('not found')) {
    return {
      title: 'Share Not Found',
      message: 'This share link is invalid or no longer exists. Please verify the link you\'re using and try again, or contact the person who shared this with you.'
    }
  }
  
  if (lowerError.includes('expired')) {
    return {
      title: 'Share Expired',
      message: 'This share link has expired and is no longer accessible. Please contact the person who shared this with you to request a new share link.'
    }
  }
  
  if (lowerError.includes('maximum views') || lowerError.includes('view limit')) {
    return {
      title: 'Access Limit Exceeded',
      message: 'This share was set to be accessed a limited number of times, and that limit has been reached. Please contact the share creator for a new share link.'
    }
  }
  
  if (lowerError.includes('revoked')) {
    return {
      title: 'Share Revoked',
      message: 'This share has been revoked by the person who created it. The content is no longer available. Please contact the share creator for a new link.'
    }
  }
  
  if (lowerError.includes('encryption key')) {
    return {
      title: 'Invalid Share Link',
      message: 'The link you\'re using appears to be corrupted or incomplete. Make sure you copied the entire link including everything after the # symbol.'
    }
  }
  
  if (lowerError.includes('missing token')) {
    return {
      title: 'Invalid Share Link',
      message: 'This share link is missing required information. Please request a new share link from the person who shared this with you.'
    }
  }
  
  return {
    title: 'Access Denied',
    message: error || 'An unexpected error occurred while trying to access this share. Please try again or contact the share creator.'
  }
}

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

const formatExpiryTime = (dateString: string): { text: string; isUrgent: boolean } => {
  const expiryDate = new Date(dateString)
  const now = new Date()
  const diffMs = expiryDate.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMs < 0) return { text: 'Expired', isUrgent: true }
  if (diffHours < 1) return { text: 'Expires in a few minutes', isUrgent: true }
  if (diffHours < 24) return { text: `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`, isUrgent: true }
  if (diffDays <= 7) return { text: `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`, isUrgent: diffDays <= 2 }
  return { text: `Expires ${expiryDate.toLocaleDateString()}`, isUrgent: false }
}

const ShareAccess: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const { fetchShareMetadata, verifyPasswordAndDecrypt, recordShareAccess } = useShareStore()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSharedPassword, setShowSharedPassword] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [shareMetadata, setShareMetadata] = useState<any>(null)
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null)

  useEffect(() => {
    loadShareMetadata()
  }, [token])

  const loadShareMetadata = async () => {
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

    setEncryptionKey(key)

    try {
      const share = await fetchShareMetadata(token)
      setShareMetadata(share)
      
      if (share.password_protected) {
        setRequiresPassword(true)
        setLoading(false)
      } else {
        // No password required, decrypt immediately
        await decryptAndDisplayShare(share, key)
      }
    } catch (err: any) {
      if (err.message.includes('encryption key')) {
        setError('Invalid or corrupted share link')
      } else {
        setError(err.message || 'Failed to access share')
      }
      setLoading(false)
    }
  }

  const decryptAndDisplayShare = async (share: any, key: string, pwd?: string) => {
    try {
      const decryptedData = await verifyPasswordAndDecrypt(share, key, pwd)
      setData(decryptedData)
      setLoading(false)
      
      // Record the access after successful decryption
      await recordShareAccess(share.id, share.one_time_access)
    } catch (err: any) {
      if (err.message.toLowerCase().includes('incorrect password')) {
        setPasswordError('Incorrect password')
        setLoading(false)
      } else if (err.message.includes('encryption key')) {
        setError('Invalid or corrupted share link')
        setLoading(false)
      } else {
        setError(err.message || 'Failed to decrypt share')
        setLoading(false)
      }
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPasswordError('')
    
    if (shareMetadata && encryptionKey) {
      await decryptAndDisplayShare(shareMetadata, encryptionKey, password)
    }
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
          <Shield size={32} className="text-primary-500 animate-pulse sm:w-12 sm:h-12" />
          <div className="text-white text-sm sm:text-lg">Loading secure share...</div>
        </div>
      </div>
    )
  }

  if (error) {
    const errorDetails = getDetailedError(error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
        <header className="p-3 sm:p-6 border-b border-gray-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <Shield size={24} className="text-primary-500 sm:w-8 sm:h-8" />
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white">HushKey Vault</h1>
              <p className="text-xs text-gray-500">Secure Password Manager</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-8 max-w-md w-full text-center">
            <AlertCircle size={36} className="text-red-500 mx-auto mb-3 sm:mb-4 sm:w-12 sm:h-12" />
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{errorDetails.title}</h2>
            <p className="text-sm sm:text-base text-gray-400">{errorDetails.message}</p>
          </div>
        </div>
        <footer className="p-3 sm:p-6 border-t border-gray-800 text-center text-xs sm:text-sm text-gray-500">
          <p>Secured by HushKey Vault • End-to-End Encrypted</p>
        </footer>
      </div>
    )
  }

  if (requiresPassword && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
        <header className="p-3 sm:p-6 border-b border-gray-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <Shield size={24} className="text-primary-500 sm:w-8 sm:h-8" />
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white">HushKey Vault</h1>
              <p className="text-xs text-gray-500">Secure Password Manager</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-8 max-w-md w-full">
            <Lock size={36} className="text-primary-500 mx-auto mb-3 sm:mb-4 sm:w-12 sm:h-12" />
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2 text-center">Password Required</h2>
            <p className="text-sm sm:text-base text-gray-400 text-center mb-4 sm:mb-6">This share is password protected</p>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-3 sm:space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} className="sm:w-5 sm:h-5" /> : <Eye size={16} className="sm:w-5 sm:h-5" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-500 text-xs sm:text-sm">{passwordError}</p>
              )}
              
              <button
                type="submit"
                className="w-full py-2 sm:py-3 bg-primary-600 hover:bg-primary-500 text-sm sm:text-base text-white rounded-lg font-medium transition-colors"
              >
                Access Share
              </button>
            </form>
          </div>
        </div>
        <footer className="p-3 sm:p-6 border-t border-gray-800 text-center text-xs sm:text-sm text-gray-500">
          <p>Secured by HushKey Vault • End-to-End Encrypted</p>
        </footer>
      </div>
    )
  }

  if (!data) return null

  const FieldDisplay = ({ label, value, field, multiline = false }: { label: string; value: string; field: string; multiline?: boolean }) => (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 sm:p-4">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center justify-between mt-2 gap-2">
        <p className={`text-white ${multiline ? 'text-xs sm:text-sm font-mono whitespace-pre-wrap' : 'text-sm sm:text-lg'} flex-1 break-all`}>{value}</p>
        <button
          onClick={() => copyToClipboard(value, field)}
          className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white shrink-0"
        >
          {copied === field ? <Check size={16} className="text-green-500 sm:w-4.5 sm:h-4.5" /> : <Copy size={16} className="sm:w-4.5 sm:h-4.5" />}
        </button>
      </div>
    </div>
  )

  const PasswordField = ({ label, value, field, multiline = false }: { label: string; value: string; field: string; multiline?: boolean }) => {
    const [show, setShow] = useState(false)
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 sm:p-4">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        <div className="flex items-center justify-between mt-2 gap-2">
          <p className={`text-white ${multiline ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg'} font-mono flex-1 break-all ${multiline ? 'whitespace-pre-wrap' : ''}`}>
            {show ? value : '••••••••••••'}
          </p>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setShow(!show)}
              className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              {show ? <EyeOff size={16} className="sm:w-4.5 sm:h-4.5" /> : <Eye size={16} className="sm:w-4.5 sm:h-4.5" />}
            </button>
            <button
              onClick={() => copyToClipboard(value, field)}
              className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              {copied === field ? <Check size={16} className="text-green-500 sm:w-4.5 sm:h-4.5" /> : <Copy size={16} className="sm:w-4.5 sm:h-4.5" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const LinkField = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 sm:p-4">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center justify-between mt-2 gap-2">
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 hover:underline text-sm sm:text-lg truncate flex-1">
          {value}
        </a>
        <button
          onClick={() => copyToClipboard(value, field)}
          className="p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white shrink-0"
        >
          {copied === field ? <Check size={16} className="text-green-500 sm:w-4.5 sm:h-4.5" /> : <Copy size={16} className="sm:w-4.5 sm:h-4.5" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      <header className="p-3 sm:p-6 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Shield size={24} className="text-primary-500 sm:w-8 sm:h-8 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white truncate">HushKey Vault</h1>
              <p className="text-xs text-gray-500">Secure Password Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500 shrink-0">
            <Lock size={12} className="sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">End-to-End Encrypted</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
          <div className="bg-gradient-to-r from-primary-900/20 to-primary-800/20 border-b border-gray-800 p-4 sm:p-6">
            <div className="flex flex-row gap-3 justify-between">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 truncate">{data.name}</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1 text-xs sm:text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <User size={12} className="sm:w-3.5 sm:h-3.5" />
                      Shared {data.type}
                    </span>
                    {data.createdAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                        {formatRelativeTime(data.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Metadata Badges */}
              <div className="flex flex-wrap gap-2">
                {shareMetadata?.password_protected && (
                  <span className="inline-flex items-center gap-1 px-1 py-1 h-[50%] rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                    <Lock size={12} />
                    Password Protected
                  </span>
                )}
                {shareMetadata?.one_time_access && (
                  <span className="inline-flex items-center gap-1 px-1 py-1 h-[50%] rounded-md bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
                    <FileText size={12} />
                    One-time Access
                  </span>
                )}
                {shareMetadata?.expires_at && (() => {
                  const expiry = formatExpiryTime(shareMetadata.expires_at)
                  return (
                    <span className={`inline-flex items-center gap-1 px-1 py-1 h-[50%] rounded-md text-xs font-medium border ${
                      expiry.isUrgent 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      <Clock size={12} />
                      {expiry.text}
                    </span>
                  )
                })()}
                {shareMetadata?.max_views && (
                  <span className="inline-flex items-center gap-1 px-1 py-1 h-[50%] rounded-md bg-gray-800 text-gray-400 text-xs font-medium border border-gray-700">
                    <User size={12} />
                    {shareMetadata.view_count || 0} / {shareMetadata.max_views} views
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
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
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 sm:p-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content</label>
                <p className="text-white mt-2 whitespace-pre-wrap leading-relaxed font-mono text-xs sm:text-sm">{data.data.content}</p>
              </div>
            )}
            
            {/* Common notes field */}
            {data.notes && (
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 sm:p-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</label>
                <p className="text-white mt-2 whitespace-pre-wrap leading-relaxed text-sm">{data.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-gray-950/50 border-t border-gray-800 p-3 sm:p-4 text-center">
            <p className="text-xs text-gray-500">This share is encrypted and secure. Only you can view this content.</p>
          </div>
        </div>
      </div>

      <footer className="p-3 sm:p-6 border-t border-gray-800 bg-gray-950/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center space-y-1 sm:space-y-2">
          <p className="text-xs sm:text-sm text-gray-400 font-medium">Secured by HushKey Vault</p>
          <p className="text-xs text-gray-600">End-to-End Encrypted • Zero-Knowledge Architecture • Open Source</p>
        </div>
      </footer>
    </div>
  )
}

export default ShareAccess
