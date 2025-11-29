import React, { useState, useEffect } from 'react';
import { X, Copy, Clock, Check, QrCode, Globe, ShieldCheck, Scan, Users, Plus, Trash2, Link as LinkIcon, Lock } from 'lucide-react';
import { Item, Vault } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | Vault | null; // Can share an Item or a Vault
  type: 'item' | 'vault';
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item, type }) => {
  const [activeTab, setActiveTab] = useState<'link' | 'access'>('link');
  
  // Link State
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiry, setExpiry] = useState('1h');
  const [permission, setPermission] = useState('read'); // 'read' | 'write'
  const [shareUrl, setShareUrl] = useState('');
  
  // Grant Access State
  const [emailInput, setEmailInput] = useState('');
  const [accessList, setAccessList] = useState<string[]>([]); // Mock list

  useEffect(() => {
    if(isOpen) {
        setLinkEnabled(false);
        setShareUrl('');
        setAccessList(type === 'vault' ? (item as Vault).sharedWith || [] : []);
        setActiveTab('link');
    }
  }, [isOpen, item, type]);

  const generateLink = () => {
      try {
          setLinkEnabled(true);
          setShareUrl(`https://hushkey.app/share/${type}/${Math.random().toString(36).substring(7)}`);
      } catch (error) {
          console.error('Failed to generate link:', error);
      }
  };

  const revokeLink = () => {
      const confirmMessage = 'Are you sure? The existing link and QR code will stop working immediately.';
      if(window.confirm(confirmMessage)) {
          setLinkEnabled(false);
          setShareUrl('');
      }
  };

  const getQRCodeUrl = () => {
      try {
          return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
      } catch (error) {
          console.error('Failed to encode QR code URL:', error);
          return '';
      }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const grantAccess = () => {
      try {
          if(emailInput && emailInput.includes('@')) {
              setAccessList([...accessList, emailInput]);
              setEmailInput('');
          }
      } catch (error) {
          console.error('Failed to grant access:', error);
      }
  };

  const revokeAccess = (email: string) => {
      try {
          setAccessList(accessList.filter(e => e !== email));
      } catch (error) {
          console.error('Failed to revoke access:', error);
      }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
           <div>
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   Share {type === 'vault' ? 'Vault' : 'Item'}
               </h3>
               <p className="text-xs text-gray-500 line-clamp-1">{item.name}</p>
           </div>
           <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors bg-gray-800/50 rounded-lg p-1"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button 
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'link' ? 'border-primary-500 text-white bg-gray-800/30' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            <QrCode size={16} /> Link & QR
          </button>
          <button 
            onClick={() => setActiveTab('access')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'access' ? 'border-primary-500 text-white bg-gray-800/30' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            <Users size={16} /> Manage Access
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
            {activeTab === 'link' && (
                <div className="space-y-6 animate-fade-in">
                    {!linkEnabled ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-500">
                                <LinkIcon size={32} />
                            </div>
                            <div>
                                <h4 className="text-white font-medium">Create a Public Link</h4>
                                <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">Generate a secure URL and QR code to share this {type} with anyone.</p>
                            </div>
                            <button 
                                onClick={generateLink}
                                className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-primary-900/30 transition-all active:scale-95"
                            >
                                Generate Link
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* QR Display */}
                            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-xl border-4 border-white">
                                <img 
                                    src={getQRCodeUrl()} 
                                    alt="QR Code" 
                                    className="w-48 h-48 mix-blend-multiply" 
                                    onError={(e) => {
                                        console.error('Failed to load QR code');
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <div className="text-black text-[10px] font-bold mt-4 uppercase tracking-wider flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
                                    <Scan size={14} /> Scan to {type === 'vault' ? 'Access' : 'View'}
                                </div>
                            </div>

                            {/* URL Input */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Secure URL</label>
                                    <span className="text-[10px] text-green-500 flex items-center gap-1"><ShieldCheck size={10}/> Encrypted</span>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-300 truncate font-mono select-all">
                                        {shareUrl}
                                    </div>
                                    <button 
                                        onClick={handleCopy}
                                        className={`p-2.5 rounded-xl border transition-all ${copied ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'}`}
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Settings */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expires In</label>
                                    <div className="relative">
                                        <select 
                                            value={expiry} 
                                            onChange={(e) => setExpiry(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:border-primary-500 outline-none"
                                        >
                                            <option value="1h">1 Hour</option>
                                            <option value="24h">24 Hours</option>
                                            <option value="7d">7 Days</option>
                                            <option value="30d">30 Days</option>
                                        </select>
                                        <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                    </div>
                                </div>

                                {type === 'vault' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Permission</label>
                                        <div className="relative">
                                            <select 
                                                value={permission} 
                                                onChange={(e) => setPermission(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white appearance-none focus:border-primary-500 outline-none"
                                            >
                                                <option value="read">View Only</option>
                                                <option value="write">Can Edit</option>
                                            </select>
                                            <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={revokeLink}
                                className="w-full py-3 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-colors"
                            >
                                Revoke Link & QR
                            </button>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'access' && (
                <div className="space-y-6 animate-fade-in">
                     <div className="bg-primary-900/20 border border-primary-500/20 rounded-xl p-4 flex items-start gap-3">
                        <Users className="text-primary-400 shrink-0 mt-0.5" size={18} />
                        <div>
                            <h4 className="text-sm font-bold text-primary-200">Grant Access</h4>
                            <p className="text-xs text-primary-300/70 mt-1">People added here will have permanent access until revoked.</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <input 
                            type="email" 
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="user@example.com"
                            className="flex-1 bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-primary-500 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && grantAccess()}
                        />
                        <button 
                            onClick={grantAccess}
                            disabled={!emailInput}
                            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white px-4 rounded-xl transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">People with access ({accessList.length})</label>
                        {accessList.length === 0 ? (
                            <div className="text-center py-8 text-gray-600 text-sm border border-dashed border-gray-800 rounded-xl bg-gray-900/30">
                                No one has been invited yet.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {accessList.map(email => (
                                    <div key={email} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                                                {email.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm text-gray-200">{email}</span>
                                        </div>
                                        <button onClick={() => revokeAccess(email)} className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Revoke Access">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;