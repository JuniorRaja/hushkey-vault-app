import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useItemStore } from '../src/stores/itemStore';
import { useAuthStore } from '../src/stores/authStore';
import { useData } from '../App';
import FileStorageService from '../src/services/fileStorage';
import { Item, ItemType, FileAttachment } from '../types';
import { ArrowLeft, Save, Trash2, Eye, EyeOff, Copy, RefreshCw, Edit2, Share2, X, ExternalLink, ShieldAlert, ShieldCheck, Shield, ChevronDown, QrCode, AlertCircle, Clock, Upload, Image as ImageIcon, Camera, Database, Server, Terminal, IdCard, FileText, Download, Paperclip, File, Bell, Globe, CreditCard, Wifi, User, Landmark, RectangleHorizontal, Plus, Layers, Lock, Check, Copy as CopyIcon } from 'lucide-react';
import { generatePassword, generateTOTP } from '../services/passwordGenerator';
import ShareModal from '../components/ShareModal';
import ConfirmationModal from '../components/ConfirmationModal';
import MoveToVaultModal from '../components/MoveToVaultModal';

interface ItemDetailProps {
  isNew?: boolean;
}

const getFaviconUrl = (url?: string) => {
    if (!url) return null;
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (e) {
        return null;
    }
}

const FaviconImage = ({ url }: { url?: string }) => {
    const faviconUrl = getFaviconUrl(url);
    if (!faviconUrl) return null;
    return <img src={faviconUrl} alt="" className="w-full h-full object-cover rounded-full" />;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Simple Provider Logos Components
const VisaLogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 36 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M15.183 23.337H9.764L13.149 2.163H18.568L15.183 23.337ZM26.269 2.163L22.454 20.916L21.897 18.156C21.196 15.657 18.96 14.332 16.945 14.332H16.892L16.202 11.137C18.669 11.666 22.216 12.83 24.364 16.7L25.027 19.82L29.351 2.163H26.269ZM33.743 14.226C33.796 9.086 26.693 8.795 26.799 6.411C26.826 5.696 27.515 4.954 28.972 4.848C29.688 4.795 31.675 4.769 33.796 5.749L34.485 2.508C33.584 2.19 32.418 1.872 30.988 1.872C27.276 1.872 24.627 3.832 24.574 6.702C24.521 8.821 26.455 10.013 27.938 10.755C29.475 11.523 29.978 12.0 29.978 12.689C29.952 13.748 28.707 14.225 27.567 14.225C26.481 14.225 24.495 13.907 23.515 13.457L22.799 16.742C23.7 17.165 25.37 17.536 27.17 17.563C31.117 17.563 33.69 15.602 33.743 14.226ZM11.699 2.163H7.726C7.223 2.163 6.799 2.454 6.613 2.931L0.203 18.024L5.607 23.337C6.216 23.337 6.826 22.86 7.037 21.906L11.699 2.163Z" fill="currentColor"/>
    </svg>
);
const MastercardLogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 36 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#EB001B" fillOpacity="0.8"/>
        <circle cx="24" cy="12" r="10" fill="#F79E1B" fillOpacity="0.8"/>
        <path d="M18 19.9497C19.7892 18.5529 20.9497 15.6358 20.9497 12C20.9497 8.36421 19.7892 5.44713 18 4.05029C16.2108 5.44713 15.0503 8.36421 15.0503 12C15.0503 15.6358 16.2108 18.5529 18 19.9497Z" fill="#FF5F00"/>
    </svg>
);
const AmexLogo = ({ className }: { className?: string }) => (
    <div className={`flex items-center justify-center bg-[#006FCF] text-white font-bold text-[8px] tracking-tighter ${className}`} style={{ borderRadius: '2px' }}>
        AMEX
    </div>
);
const RupayLogo = ({ className }: { className?: string }) => (
    <div className={`flex items-center justify-center bg-white text-[#1C1B1F] font-bold text-[8px] border border-gray-200 ${className}`} style={{ borderRadius: '2px' }}>
        <span className="text-[#E67817]">Ru</span><span className="text-[#0C3D82]">Pay</span>
    </div>
);

// DB Icons
const DBIcon = ({ type }: { type: string }) => {
    const textMap: any = {
        'mysql': 'MySQL', 'postgres': 'PG', 'oracle': 'ORA', 'mssql': 'SQL', 'mongo': 'MDB', 'redis': 'RDS'
    };
    return (
        <div className="w-8 h-8 rounded bg-gray-800 text-[10px] font-bold text-gray-400 flex items-center justify-center border border-gray-700">
            {textMap[type] || 'DB'}
        </div>
    )
}


// Collapsible Section Component
const FormSection = ({ title, isOpen, onToggle, children }: { title: string, isOpen: boolean, onToggle: () => void, children?: React.ReactNode }) => (
    <div className="border border-gray-800 rounded-xl overflow-hidden transition-all duration-300">
        <button 
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 bg-gray-900 hover:bg-gray-800/80 transition-colors text-left"
        >
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</span>
            <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 bg-gray-950/30 border-t border-gray-800 space-y-4">
                {children}
            </div>
        </div>
    </div>
);

const DecryptedText = ({ text, show }: { text: string; show: boolean }) => {
  const [displayText, setDisplayText] = useState('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  
  useEffect(() => {
    if (!show) {
      setDisplayText('•'.repeat(text.length));
      return;
    }
    
    let frame = 0;
    const maxFrames = 15;
    const interval = setInterval(() => {
      if (frame >= maxFrames) {
        setDisplayText(text);
        clearInterval(interval);
        return;
      }
      
      const progress = frame / maxFrames;
      const revealed = Math.floor(text.length * progress);
      
      setDisplayText(
        text.split('').map((char, i) => {
          if (i < revealed) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('')
      );
      
      frame++;
    }, 40);
    
    return () => clearInterval(interval);
  }, [text, show]);
  
  return <span>{displayText}</span>;
};

const ItemDetail: React.FC<ItemDetailProps> = ({ isNew }) => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type') as ItemType;
  const { items, vaults, categories, getItem, createItem, updateItem, deleteItem } = useItemStore();
  const { masterKey } = useAuthStore();
  const { settings } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multipleFileInputRef = useRef<HTMLInputElement>(null);
  const [fileAttachments, setFileAttachments] = useState<Array<{ id: string; name: string; size: number; mimeType: string }>>([]);

  const [isEditing, setIsEditing] = useState(!!isNew);
  const [formData, setFormData] = useState<Partial<Item>>({
    type: ItemType.LOGIN,
    vaultId: vaults[0]?.id || '',
    categoryId: '',
    name: '',
    data: { passwordExpiryInterval: 0 } as any // Default to Never
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpSecret, setShowTotpSecret] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copyTimer, setCopyTimer] = useState<number>(0);
  
  // Validation State
  const [urlError, setUrlError] = useState('');
  
  // TOTP State
  const [totpInputMode, setTotpInputMode] = useState<'MANUAL' | 'QR'>('MANUAL');
  const [totpCode, setTotpCode] = useState('');
  const [totpTimer, setTotpTimer] = useState(30);

  // Identity Form State
  const [identitySections, setIdentitySections] = useState({
      personal: true,
      address: true,
      contact: true,
      additional: false
  });

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  const toggleIdentitySection = (key: keyof typeof identitySections) => {
      setIdentitySections(prev => ({...prev, [key]: !prev[key]}));
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (isNew) {
        setIsEditing(true);
        const initialVaultId = vaults[0]?.id || '';
        
        // Check if duplicating from another item
        if (location.state && (location.state as any).duplicateData) {
          const duplicateData = (location.state as any).duplicateData;
          setFormData({
            ...duplicateData,
            vaultId: duplicateData.vaultId || initialVaultId
          });
        } else {
          setFormData({
            type: typeParam || ItemType.LOGIN,
            vaultId: initialVaultId,
            categoryId: '',
            name: '',
            data: { passwordExpiryInterval: 0 } as any
          });
        }
      } else if (itemId) {
        const existing = await getItem(itemId);
        if (existing) {
          setFormData(JSON.parse(JSON.stringify(existing)));
          
          // Load file attachments if available
          if (masterKey) {
            try {
              const attachments = await FileStorageService.getItemAttachments(itemId, masterKey);
              setFileAttachments(attachments);
            } catch (error) {
              console.error('Failed to load attachments:', error);
            }
          }
          
          if (location.state && (location.state as any).isEditing) {
            setIsEditing(true);
          } else {
            setIsEditing(false);
          }
        } else {
          navigate('/items');
        }
      }
    };
    
    loadData();
  }, [itemId, isNew, vaults, typeParam, location.state]);

  // Live TOTP Update
  useEffect(() => {
    let interval: any;
    const hasTotp = formData.data?.totp;
    if (!isEditing && (formData.type === ItemType.LOGIN || formData.type === ItemType.SSH_KEY) && hasTotp) {
        const updateTotp = async () => {
             const code = await generateTOTP(hasTotp);
             setTotpCode(code);
             const epoch = Math.floor(Date.now() / 1000);
             setTotpTimer(30 - (epoch % 30));
        };
        updateTotp();
        interval = setInterval(updateTotp, 1000);
    } else {
        setTotpCode('');
    }
    return () => clearInterval(interval);
  }, [isEditing, formData.data?.totp, formData.type]);

  const validateUrl = (url: string) => {
      if (!url) {
          setUrlError('');
          return true;
      }
      try {
          // Prepend https if missing
          const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
          new URL(urlToCheck);
          setUrlError('');
          return true;
      } catch (e) {
          setUrlError('Please enter a valid URL');
          return false;
      }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.vaultId) {
        alert("Please enter a name and select a vault.");
        return;
    }

    if (formData.type === ItemType.LOGIN && formData.data?.url && !validateUrl(formData.data.url)) {
        alert("Please fix the URL error before saving.");
        return;
    }

    const now = new Date().toISOString();
    let finalData = { ...formData.data };

    // Check if password changed to update modification date
    if (isNew) {
        if (finalData.password) {
            finalData.passwordLastModified = now;
        }
    } else {
        const existing = items.find(i => i.id === itemId);
        if (existing && existing.data.password !== finalData.password) {
            finalData.passwordLastModified = now;
        }
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const newItem = await createItem(formData.vaultId!, {
          ...formData,
          name: formData.name!,
          type: formData.type || ItemType.LOGIN,
          isFavorite: false,
          data: finalData as any
        });
        await new Promise(resolve => setTimeout(resolve, 800));
        navigate(-1);
      } else {
        await updateItem(itemId!, { ...formData, data: finalData });
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (isNew) {
        navigate(-1);
    } else {
        // Revert data
        const existing = await getItem(itemId!);
        if (existing) {
            setFormData(JSON.parse(JSON.stringify(existing)));
        }
        setIsEditing(false);
        setUrlError('');
    }
  };

  const confirmDelete = () => {
      setDeleteConfirmationOpen(true);
  };

  const handleDelete = async () => {
    if (itemId) {
      try {
        await deleteItem(itemId);
        navigate('/items');
      } catch (error) {
        console.error('Failed to delete item:', error);
        alert('Failed to delete item. Please try again.');
      }
    }
  };

  const handleShare = () => {
      setIsShareModalOpen(true);
  };

  const handleMoveToVault = async (newVaultId: string) => {
    try {
      await updateItem(itemId!, { vaultId: newVaultId });
      setIsMoveModalOpen(false);
      navigate('/items');
    } catch (error) {
      console.error('Failed to move item:', error);
      alert('Failed to move item. Please try again.');
    }
  };

  const handleDuplicate = () => {
      navigate('/items/new?type=' + formData.type, {
          state: {
              duplicateData: {
                  ...formData,
                  name: `${formData.name} (Copy)`,
                  id: undefined,
                  createdAt: undefined,
                  lastUpdated: undefined
              }
          }
      });
  };

  const updateDataField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value }
    }));
    
    if (field === 'url') {
        validateUrl(value);
    }
  };

  const generateAndSetPassword = () => {
      const newPass = generatePassword(20, { uppercase: true, numbers: true, symbols: true });
      updateDataField('password', newPass);
  };

  const copyToClipboard = (text: string, fieldId: string) => {
      if(!text) return;
      
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      
      const clearSeconds = settings?.clipboardClearSeconds || 30;
      setCopyTimer(clearSeconds);
      
      const interval = setInterval(() => {
          setCopyTimer(prev => {
              if (prev <= 1) {
                  clearInterval(interval);
                  navigator.clipboard.writeText('');
                  setCopiedField(null);
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
  };
  
  const simulateQrScan = () => {
      // Mock scan result
      const mockKey = "JBSWY3DPEHPK3PXP";
      updateDataField('totp', mockKey);
      setTotpInputMode('MANUAL'); // Switch back to manual to show the key
      alert(`QR Code Scanned! Key: ${mockKey}`);
  };

  const getPasswordStrength = (pass: string) => {
      if (!pass) return { text: '', color: '', icon: null };
      if (pass.length < 8) return { text: 'Vulnerable', color: 'text-red-500', icon: ShieldAlert };
      if (pass.length < 12) return { text: 'Weak', color: 'text-orange-500', icon: ShieldAlert };
      if (pass.length < 16) return { text: 'Good', color: 'text-yellow-500', icon: Shield };
      return { text: 'Strong', color: 'text-green-500', icon: ShieldCheck };
  };

  const getExpiryText = () => {
      const interval = formData.data?.passwordExpiryInterval;
      if (!interval || interval === 0) return null;
      
      const lastModifiedStr = formData.data?.passwordLastModified || formData.lastUpdated;
      if (!lastModifiedStr) return null;

      const last = new Date(lastModifiedStr).getTime();
      const expiry = last + (interval * 24 * 60 * 60 * 1000);
      const now = new Date().getTime();
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 0) return { text: `Password expired ${Math.abs(daysLeft)} days ago`, color: 'text-red-500' };
      if (daysLeft <= 7) return { text: `Password expires in ${daysLeft} days`, color: 'text-orange-500' };
      return { text: `Password expires in ${daysLeft} days`, color: 'text-gray-400' };
  }

  const handlePinChange = (index: number, val: string) => {
      if (val.length > 1) return;
      const currentPin = formData.data?.pin || '';
      let pinArray = currentPin.padEnd(4, ' ').split('').slice(0, 4);
      if (index >= pinArray.length) {
           while(pinArray.length <= index) pinArray.push(' ');
      }
      pinArray[index] = val || ' ';
      
      const newPin = pinArray.join('').trim();
      updateDataField('pin', newPin);

      if (val && index < 3) {
          const nextInput = document.getElementById(`pin-input-${index + 1}`);
          if (nextInput) nextInput.focus();
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              updateDataField('cardImage', reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !itemId || !masterKey) return;

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          await FileStorageService.uploadFile(itemId, file, masterKey);
        }
        
        // Reload attachments
        const attachments = await FileStorageService.getItemAttachments(itemId, masterKey);
        setFileAttachments(attachments);
        
        if(multipleFileInputRef.current) multipleFileInputRef.current.value = '';
      } catch (error) {
        console.error('Failed to upload files:', error);
        alert('Failed to upload files. Please try again.');
      }
  };

  const removeAttachment = async (id: string) => {
      try {
        await FileStorageService.deleteFile(id);
        setFileAttachments(prev => prev.filter(f => f.id !== id));
      } catch (error) {
        console.error('Failed to delete attachment:', error);
        alert('Failed to delete attachment. Please try again.');
      }
  };

  const downloadAttachment = async (fileId: string, fileName: string) => {
      if (!masterKey) return;
      
      try {
        const { data, mimeType } = await FileStorageService.downloadFile(fileId, masterKey);
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download attachment:', error);
        alert('Failed to download attachment. Please try again.');
      }
  };

  // --- Field Components based on Type ---
  const autoCompleteProps = { autoComplete: 'off', 'data-form-type': 'other', 'data-lpignore': 'true', 'data-1p-ignore': 'true', name: `field_${Math.random().toString(36)}` };
  const passwordAutoCompleteProps = { autoComplete: 'new-password', 'data-form-type': 'other', 'data-lpignore': 'true', 'data-1p-ignore': 'true', name: `pass_${Math.random().toString(36)}` };

  const renderFields = () => {
    // Styles change based on mode
    const inputBaseClass = isEditing 
        ? "w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors"
        : "w-full bg-transparent border border-transparent px-0 py-2 text-white font-medium text-lg focus:outline-none cursor-text";
    
    const labelClass = "text-xs text-gray-400 font-medium ml-1 uppercase tracking-wider";
    const hasValue = (...values: any[]) => isEditing || values.some(v => v !== undefined && v !== null && v !== '');

    // Expiry Dropdown Component
    const renderExpiryDropdown = () => (
        <div className="space-y-1 group pt-2 mt-2 border-t border-gray-800/50">
            <label className={labelClass}>Password Expiry</label>
            {isEditing ? (
                 <select 
                    className={inputBaseClass}
                    value={formData.data?.passwordExpiryInterval || 0}
                    onChange={(e) => updateDataField('passwordExpiryInterval', parseInt(e.target.value))}
                >
                    <option value={0}>Never (Default)</option>
                    <option value={30}>1 Month (30 Days)</option>
                    <option value={90}>3 Months (90 Days)</option>
                    <option value={180}>6 Months (180 Days)</option>
                </select>
            ) : (
                <div className="flex items-center gap-2 text-gray-300 py-2">
                     <Clock size={16} className="text-gray-500" />
                     {(() => {
                         const val = formData.data?.passwordExpiryInterval;
                         if (!val) return 'Never';
                         if (val === 30) return 'Every 1 Month';
                         if (val === 90) return 'Every 3 Months';
                         if (val === 180) return 'Every 6 Months';
                         return `Every ${val} Days`;
                     })()}
                </div>
            )}
        </div>
    );

    switch (formData.type) {
      case ItemType.LOGIN:
        const strength = getPasswordStrength(formData.data?.password || '');
        const StrengthIcon = strength.icon;

        return (
          <>
            {hasValue(formData.data?.username) && <div className="space-y-1 group">
              <label className={labelClass}>Username / Email</label>
              <div className="relative flex items-center">
                <input 
                    type="text" 
                    {...autoCompleteProps}
                    readOnly={!isEditing}
                    className={inputBaseClass}
                    value={formData.data?.username || ''}
                    onChange={(e) => updateDataField('username', e.target.value)}
                    placeholder={isEditing ? "e.g. user@example.com" : "—"}
                />
                {!isEditing && formData.data?.username && (
                    <button 
                        className="text-gray-600 hover:text-white p-2 transition-opacity flex items-center gap-1 shrink-0" 
                        onClick={() => copyToClipboard(formData.data?.username || '', 'username')}
                    >
                        {copiedField === 'username' ? (
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 32 32">
                                    <circle cx="16" cy="16" r="14" fill="none" stroke="#1f2937" strokeWidth="2"/>
                                    <circle cx="16" cy="16" r="14" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="87.96" strokeDashoffset={87.96 * (1 - copyTimer / (settings.clipboardClearSeconds || 30))} className="transition-all duration-1000 linear"/>
                                </svg>
                                <span className="text-[10px] font-bold text-green-500">{copyTimer}</span>
                            </div>
                        ) : (
                            <Copy size={16}/>
                        )}
                    </button>
                )}
              </div>
            </div>}

            {hasValue(formData.data?.password) && <div className="space-y-1 group">
              <label className={labelClass}>Password</label>
              <div className="relative flex items-center">
                {isEditing ? (
                  <input 
                      type={showPassword ? "text" : "password"} 
                      {...autoCompleteProps}
                      className={`${inputBaseClass} font-mono pr-12`}
                      value={formData.data?.password || ''}
                      onChange={(e) => updateDataField('password', e.target.value)}
                      placeholder="••••••••••••"
                  />
                ) : (
                  <div className={`${inputBaseClass} font-mono pr-12`}>
                    <DecryptedText text={formData.data?.password || ''} show={showPassword} />
                  </div>
                )}
                <div className="flex items-center gap-1 ml-2">
                    {!isEditing && formData.data?.password && (
                        <>
                            <button className="p-2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                            <button 
                                className="p-2 text-gray-500 hover:text-white transition-opacity flex items-center gap-1 shrink-0" 
                                onClick={() => copyToClipboard(formData.data?.password || '', 'password')}
                            >
                                {copiedField === 'password' ? (
                                    <div className="relative w-9 h-9 flex items-center justify-center">
                                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="16" fill="none" stroke="#1f2937" strokeWidth="2"/>
                                            <circle cx="18" cy="18" r="16" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="100.53" strokeDashoffset={100.53 * (1 - copyTimer / (settings.clipboardClearSeconds || 30))} className="transition-all duration-1000 linear"/>
                                        </svg>
                                        <span className="text-[10px] font-bold text-green-500">{copyTimer}</span>
                                    </div>
                                ) : (
                                    <Copy size={18}/>
                                )}
                            </button>
                        </>
                    )}
                    
                    {isEditing && (
                        <>
                             <button className="p-2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                            <button className="p-2 text-gray-500 hover:text-primary-400" onClick={generateAndSetPassword} title="Generate">
                                <RefreshCw size={18}/>
                            </button>
                        </>
                    )}
                 </div>
              </div>
              {isEditing && formData.data?.password && (
                  <div className="flex items-center justify-end mt-1 px-1 gap-3">
                      <div className="flex gap-1 flex-1 max-w-[120px]">
                          <div className={`h-1 flex-1 rounded-full ${(formData.data.password.length > 5) ? 'bg-red-500' : 'bg-gray-800'}`}></div>
                          <div className={`h-1 flex-1 rounded-full ${(formData.data.password.length > 10) ? 'bg-yellow-500' : 'bg-gray-800'}`}></div>
                          <div className={`h-1 flex-1 rounded-full ${(formData.data.password.length > 15) ? 'bg-green-500' : 'bg-gray-800'}`}></div>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.color}`}>
                          {StrengthIcon && <StrengthIcon size={14} />}
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                              {strength.text}
                          </span>
                      </div>
                  </div>
              )}
            </div>}

            {hasValue(formData.data?.passwordExpiryInterval) && renderExpiryDropdown()}
            
            {hasValue(formData.data?.totp) && <div className={`space-y-1 group pt-2 mt-2 ${!isEditing && formData.data?.totp && 'border-t border-gray-800/50'}`}>
                 <label className={labelClass}>{isEditing ? "TOTP Secret" : "One-Time Password (TOTP)"}</label>
                 
                 {isEditing ? (
                     <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                         <div className="flex gap-2 mb-3">
                            <button 
                                onClick={() => setTotpInputMode('MANUAL')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${totpInputMode === 'MANUAL' ? 'bg-primary-900/30 text-primary-300 border border-primary-500/20' : 'bg-gray-800 text-gray-500 hover:text-gray-300 border border-transparent'}`}
                            >
                                Enter Key
                            </button>
                            <button 
                                onClick={() => setTotpInputMode('QR')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${totpInputMode === 'QR' ? 'bg-primary-900/30 text-primary-300 border border-primary-500/20' : 'bg-gray-800 text-gray-500 hover:text-gray-300 border border-transparent'}`}
                            >
                                Scan QR
                            </button>
                         </div>
                         
                         {totpInputMode === 'MANUAL' ? (
                            <div className="relative flex items-center">
                                <input 
                                    type={showTotpSecret ? "text" : "password"}
                                    {...autoCompleteProps}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors font-mono text-sm"
                                    value={formData.data?.totp || ''}
                                    onChange={(e) => updateDataField('totp', e.target.value)}
                                    placeholder="JBSW Y3DP EHPK 3PXP"
                                />
                                <div className="absolute right-3 flex items-center">
                                     <button className="text-gray-500 hover:text-white" onClick={() => setShowTotpSecret(!showTotpSecret)}>
                                        {showTotpSecret ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                            </div>
                         ) : (
                             <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-700 rounded-lg bg-gray-950">
                                 <QrCode size={32} className="text-gray-600 mb-2" />
                                 <p className="text-xs text-gray-500 mb-3 text-center">Camera access required to scan QR codes.</p>
                                 <button onClick={simulateQrScan} className="bg-primary-600 hover:bg-primary-500 text-white px-3 py-1.5 rounded text-xs font-medium">
                                     Simulate Scan
                                 </button>
                             </div>
                         )}
                     </div>
                 ) : (
                     formData.data?.totp ? (
                        <div className="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                            <div>
                                <div className="text-3xl font-mono font-bold text-primary-400 tracking-widest">
                                    {totpCode ? `${totpCode.slice(0,3)} ${totpCode.slice(3)}` : 'Loading...'}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-20 h-1 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ease-linear ${totpTimer < 5 ? 'bg-red-500' : 'bg-primary-500'}`}
                                            style={{ width: `${(totpTimer / 30) * 100}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-medium ${totpTimer < 5 ? 'text-red-500' : 'text-gray-500'}`}>{totpTimer}s</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => copyToClipboard(totpCode, 'totp')}
                                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                                title="Copy OTP"
                            >
                                {copiedField === 'totp' ? (
                                    <div className="relative w-10 h-10 flex items-center justify-center">
                                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
                                            <circle cx="20" cy="20" r="18" fill="none" stroke="#1f2937" strokeWidth="2"/>
                                            <circle cx="20" cy="20" r="18" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="113.1" strokeDashoffset={113.1 * (1 - copyTimer / (settings.clipboardClearSeconds || 30))} className="transition-all duration-1000 linear"/>
                                        </svg>
                                        <span className="text-xs font-bold text-green-500">{copyTimer}</span>
                                    </div>
                                ) : (
                                    <Copy size={20} />
                                )}
                            </button>
                        </div>
                     ) : null
                 )}
            </div>}

            {hasValue(formData.data?.url) && <div className="space-y-1 group mt-2">
              <label className={labelClass}>Website URL</label>
              <div className="relative flex items-center">
                <input 
                    type="url" 
                    {...autoCompleteProps}
                    readOnly={!isEditing}
                    className={`${inputBaseClass} ${urlError ? 'border-red-500 focus:border-red-500' : ''} text-primary-400`}
                    value={formData.data?.url || ''}
                    onChange={(e) => updateDataField('url', e.target.value)}
                    placeholder={isEditing ? "https://" : "—"}
                />
                 {!isEditing && formData.data?.url && (
                    <a href={formData.data.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink size={18} />
                    </a>
                )}
              </div>
              {isEditing && urlError && (
                  <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                      <AlertCircle size={12} />
                      <span>{urlError}</span>
                  </div>
              )}
            </div>}
          </>
        );
      case ItemType.ID_CARD:
          return (
              <>
                 <div className="space-y-1">
                    <label className={labelClass}>Title</label>
                    <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.cardTitle || ''}
                        onChange={(e) => updateDataField('cardTitle', e.target.value)}
                        placeholder={!isEditing ? "—" : "e.g. Work ID"}
                    />
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>ID Name</label>
                    <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.idName || ''}
                        onChange={(e) => updateDataField('idName', e.target.value)}
                        placeholder={!isEditing ? "—" : "e.g. National ID"}
                    />
                </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Full Name</label>
                    <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.fullName || ''}
                        onChange={(e) => updateDataField('fullName', e.target.value)}
                        placeholder={!isEditing ? "—" : "Name on ID"}
                    />
                </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Valid Till</label>
                    <input 
                        type={isEditing ? "date" : "text"}
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.validTill || ''}
                        onChange={(e) => updateDataField('validTill', e.target.value)}
                        placeholder={!isEditing ? "—" : ""}
                    />
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>Father/Husband Name</label>
                    <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.relationName || ''}
                        onChange={(e) => updateDataField('relationName', e.target.value)}
                        placeholder={!isEditing ? "—" : ""}
                    />
                </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Address</label>
                     {isEditing ? (
                         <textarea
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors min-h-[80px]"
                            value={formData.data?.address || ''}
                            onChange={(e) => updateDataField('address', e.target.value)}
                            placeholder="Full address as per ID"
                        />
                     ) : (
                         <div className="text-white text-lg font-medium py-2 whitespace-pre-wrap">{formData.data?.address || '—'}</div>
                     )}
                </div>
              </>
          )
      case ItemType.FILE:
          return (
              <>
                 <div className="space-y-1">
                    <label className={labelClass}>File Name</label>
                    <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.fileName || ''}
                        onChange={(e) => updateDataField('fileName', e.target.value)}
                        placeholder={!isEditing ? "—" : "e.g. Tax Documents 2024"}
                    />
                </div>
                
                <div className="space-y-2 mt-4">
                     <label className={labelClass}>Files ({formData.data?.attachments?.length || 0})</label>
                     
                     {isEditing && (
                        <div 
                            onClick={() => multipleFileInputRef.current?.click()}
                            className="w-full h-24 border-2 border-dashed border-gray-800 hover:border-primary-500/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-900/20 group"
                        >
                            <input 
                                type="file" 
                                multiple
                                ref={multipleFileInputRef} 
                                className="hidden" 
                                onChange={handleMultiFileUpload} 
                            />
                            <div className="flex items-center gap-2 text-gray-500 group-hover:text-primary-400">
                                <Upload size={20} />
                                <span className="text-sm font-medium">Click to Upload Files</span>
                            </div>
                        </div>
                     )}

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                         {fileAttachments.map((file) => (
                             <div key={file.id} className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-center justify-between group">
                                 <div className="flex items-center gap-3 overflow-hidden">
                                     <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center shrink-0 text-gray-400">
                                         {file.mimeType.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
                                     </div>
                                     <div className="min-w-0">
                                         <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                         <p className="text-xs text-gray-500">{formatBytes(file.size)} • {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                                     </div>
                                 </div>
                                 
                                 <div className="flex items-center gap-1">
                                     {isEditing ? (
                                         <button 
                                            onClick={() => removeAttachment(file.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                         >
                                             <Trash2 size={16} />
                                         </button>
                                     ) : (
                                          <button 
                                            onClick={() => downloadAttachment(file.id, file.name)}
                                            className="p-2 text-gray-500 hover:text-primary-400 transition-colors"
                                            title="Download"
                                         >
                                             <Download size={16} />
                                         </button>
                                     )}
                                 </div>
                             </div>
                         ))}
                         
                         {fileAttachments.length === 0 && !isEditing && (
                             <div className="col-span-full text-center py-4 text-gray-500 text-sm">
                                 No files attached.
                             </div>
                         )}
                     </div>
                </div>
              </>
          )
      case ItemType.BANK:
        return (
            <>
                <div className="space-y-1">
                    <label className={labelClass}>Bank Name</label>
                    <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.bankName || ''}
                        onChange={(e) => updateDataField('bankName', e.target.value)}
                        placeholder={!isEditing ? "—" : "e.g. Chase Bank"}
                    />
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>Bank Website (for logo)</label>
                    <div className="relative flex items-center">
                        <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={inputBaseClass}
                            value={formData.data?.website || ''}
                            onChange={(e) => updateDataField('website', e.target.value)}
                            placeholder={!isEditing ? "—" : "e.g. chase.com"}
                        />
                        {!isEditing && formData.data?.website && (
                             <a href={formData.data.website.startsWith('http') ? formData.data.website : `https://${formData.data.website}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-white">
                                <ExternalLink size={18} />
                            </a>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className={labelClass}>Branch</label>
                        <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={inputBaseClass}
                            value={formData.data?.branch || ''}
                            onChange={(e) => updateDataField('branch', e.target.value)}
                            placeholder={!isEditing ? "—" : "Main St Branch"}
                        />
                     </div>
                     <div className="space-y-1">
                        <label className={labelClass}>Account Type</label>
                        {isEditing ? (
                             <select
                                className={inputBaseClass}
                                value={formData.data?.accountType || ''}
                                onChange={(e) => updateDataField('accountType', e.target.value)}
                             >
                                 <option value="">Select Type</option>
                                 <option value="Checking">Checking</option>
                                 <option value="Savings">Savings</option>
                                 <option value="Business">Business</option>
                                 <option value="Loan">Loan</option>
                             </select>
                        ) : (
                             <input 
                                readOnly
                                className={inputBaseClass}
                                value={formData.data?.accountType || '—'}
                            />
                        )}
                     </div>
                </div>
                <div className="space-y-1 group">
                    <label className={labelClass}>Account Number</label>
                    <div className="flex items-center">
                         <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={`${inputBaseClass} font-mono`}
                            value={formData.data?.accountNumber || ''}
                            onChange={(e) => updateDataField('accountNumber', e.target.value)}
                            placeholder="000000000"
                        />
                        {!isEditing && (
                             <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.accountNumber || '')}>
                                <Copy size={16}/>
                            </button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1 group">
                        <label className={labelClass}>IFSC / IBAN</label>
                        <div className="flex items-center">
                             <input 
                                {...autoCompleteProps}
                                readOnly={!isEditing}
                                className={inputBaseClass}
                                value={formData.data?.ifsc || ''}
                                onChange={(e) => updateDataField('ifsc', e.target.value)}
                            />
                            {!isEditing && (
                                <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.ifsc || '')}>
                                    <Copy size={16}/>
                                </button>
                            )}
                        </div>
                     </div>
                     <div className="space-y-1 group">
                        <label className={labelClass}>SWIFT / BIC</label>
                        <div className="flex items-center">
                             <input 
                                {...autoCompleteProps}
                                readOnly={!isEditing}
                                className={inputBaseClass}
                                value={formData.data?.swift || ''}
                                onChange={(e) => updateDataField('swift', e.target.value)}
                            />
                            {!isEditing && (
                                <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.swift || '')}>
                                    <Copy size={16}/>
                                </button>
                            )}
                        </div>
                     </div>
                </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Account Holder</label>
                    <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.holderName || ''}
                        onChange={(e) => updateDataField('holderName', e.target.value)}
                        placeholder={!isEditing ? "—" : ""}
                    />
                </div>
            </>
        )
      case ItemType.DATABASE:
          return (
              <>
                 <div className="space-y-1">
                    <label className={labelClass}>Database Type</label>
                    {isEditing ? (
                         <div className="flex flex-wrap gap-2">
                             {['mysql', 'postgres', 'oracle', 'mssql', 'mongo', 'redis', 'other'].map(type => (
                                 <button
                                    key={type}
                                    onClick={() => updateDataField('dbType', type)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${formData.data?.dbType === type ? 'bg-primary-900/30 border-primary-500 text-primary-300' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                                 >
                                     {type}
                                 </button>
                             ))}
                         </div>
                    ) : (
                         <div className="flex items-center gap-2">
                             {formData.data?.dbType && <DBIcon type={formData.data.dbType} />}
                             <span className="text-white text-lg font-medium">{formData.data?.dbType?.toUpperCase() || '—'}</span>
                         </div>
                    )}
                 </div>
                 
                 <div className="grid grid-cols-3 gap-4">
                     <div className="col-span-2 space-y-1 group">
                        <label className={labelClass}>Host</label>
                        <div className="flex items-center">
                            <input 
                                {...autoCompleteProps}
                                readOnly={!isEditing}
                                className={`${inputBaseClass} font-mono`}
                                value={formData.data?.host || ''}
                                onChange={(e) => updateDataField('host', e.target.value)}
                                placeholder="localhost"
                            />
                             {!isEditing && (
                                <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.host || '')}>
                                    <Copy size={16}/>
                                </button>
                            )}
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className={labelClass}>Port</label>
                        <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={`${inputBaseClass} font-mono`}
                            value={formData.data?.port || ''}
                            onChange={(e) => updateDataField('port', e.target.value)}
                            placeholder="3306"
                        />
                     </div>
                 </div>

                 <div className="space-y-1">
                    <label className={labelClass}>Database Name</label>
                    <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.databaseName || ''}
                        onChange={(e) => updateDataField('databaseName', e.target.value)}
                        placeholder="my_app_db"
                    />
                 </div>

                 <div className="space-y-1 group">
                    <label className={labelClass}>Username</label>
                    <div className="flex items-center">
                         <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={inputBaseClass}
                            value={formData.data?.username || ''}
                            onChange={(e) => updateDataField('username', e.target.value)}
                            placeholder="root"
                        />
                        {!isEditing && (
                             <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.username || '')}>
                                <Copy size={16}/>
                            </button>
                        )}
                    </div>
                 </div>

                 <div className="space-y-1 group">
                    <label className={labelClass}>Password</label>
                    <div className="relative flex items-center">
                         <input 
                            type={showPassword || isEditing ? "text" : "password"} 
                            {...passwordAutoCompleteProps}
                            readOnly={!isEditing}
                            className={`${inputBaseClass} font-mono`}
                            value={formData.data?.password || ''}
                            onChange={(e) => updateDataField('password', e.target.value)}
                        />
                         <div className="flex items-center gap-1 ml-2">
                             <button className="p-2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                             {!isEditing && (
                                <button className="p-2 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.password || '')}>
                                    <Copy size={18}/>
                                </button>
                            )}
                         </div>
                    </div>
                 </div>
                 {renderExpiryDropdown()}
              </>
          )
      case ItemType.SERVER:
          return (
              <>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1 group">
                        <label className={labelClass}>IP Address</label>
                        <div className="flex items-center">
                             <input 
                                {...autoCompleteProps}
                                readOnly={!isEditing}
                                className={`${inputBaseClass} font-mono`}
                                value={formData.data?.ip || ''}
                                onChange={(e) => updateDataField('ip', e.target.value)}
                                placeholder="192.168.1.1"
                            />
                            {!isEditing && (
                                <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.ip || '')}>
                                    <Copy size={16}/>
                                </button>
                            )}
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className={labelClass}>OS / Distro</label>
                        <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={inputBaseClass}
                            value={formData.data?.os || ''}
                            onChange={(e) => updateDataField('os', e.target.value)}
                            placeholder="Ubuntu 22.04"
                        />
                     </div>
                </div>

                <div className="space-y-1">
                    <label className={labelClass}>Hostname</label>
                    <div className="flex items-center">
                         <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={inputBaseClass}
                            value={formData.data?.hostname || ''}
                            onChange={(e) => updateDataField('hostname', e.target.value)}
                            placeholder="web-server-01"
                        />
                         {!isEditing && (
                             <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.hostname || '')}>
                                <Copy size={16}/>
                            </button>
                        )}
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className={labelClass}>Hosting Provider</label>
                    <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={inputBaseClass}
                        value={formData.data?.hostingProvider || ''}
                        onChange={(e) => updateDataField('hostingProvider', e.target.value)}
                        placeholder="AWS / DigitalOcean"
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1 group">
                        <label className={labelClass}>Username</label>
                        <div className="flex items-center">
                             <input 
                                {...autoCompleteProps}
                                readOnly={!isEditing}
                                className={inputBaseClass}
                                value={formData.data?.username || ''}
                                onChange={(e) => updateDataField('username', e.target.value)}
                                placeholder="root"
                            />
                            {!isEditing && (
                                <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.username || '')}>
                                    <Copy size={16}/>
                                </button>
                            )}
                        </div>
                     </div>
                     <div className="space-y-1 group">
                        <label className={labelClass}>Password</label>
                         <div className="relative flex items-center">
                            <input 
                                type={showPassword || isEditing ? "text" : "password"} 
                                {...passwordAutoCompleteProps}
                                readOnly={!isEditing}
                                className={`${inputBaseClass} font-mono`}
                                value={formData.data?.password || ''}
                                onChange={(e) => updateDataField('password', e.target.value)}
                            />
                            <div className="flex items-center gap-1 ml-2">
                                <button className="p-2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                                {!isEditing && (
                                    <button className="p-2 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.password || '')}>
                                        <Copy size={18}/>
                                    </button>
                                )}
                            </div>
                        </div>
                     </div>
                 </div>
                 {renderExpiryDropdown()}
              </>
          );
      case ItemType.SSH_KEY:
        return (
            <>
                <div className="space-y-1 group">
                    <label className={labelClass}>Host</label>
                    <div className="flex items-center">
                         <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={`${inputBaseClass} font-mono`}
                            value={formData.data?.host || ''}
                            onChange={(e) => updateDataField('host', e.target.value)}
                            placeholder="hostname or IP"
                        />
                         {!isEditing && (
                            <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.host || '')}>
                                <Copy size={16}/>
                            </button>
                        )}
                    </div>
                </div>
                <div className="space-y-1 group">
                    <label className={labelClass}>Username</label>
                    <div className="flex items-center">
                         <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={inputBaseClass}
                            value={formData.data?.username || ''}
                            onChange={(e) => updateDataField('username', e.target.value)}
                            placeholder="root"
                        />
                         {!isEditing && (
                            <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.username || '')}>
                                <Copy size={16}/>
                            </button>
                        )}
                    </div>
                </div>
                <div className="space-y-1 group">
                    <label className={labelClass}>Passphrase</label>
                    <div className="relative flex items-center">
                        <input 
                            type={showPassword || isEditing ? "text" : "password"} 
                            {...passwordAutoCompleteProps}
                            readOnly={!isEditing}
                            className={`${inputBaseClass} font-mono`}
                            value={formData.data?.passphrase || ''}
                            onChange={(e) => updateDataField('passphrase', e.target.value)}
                        />
                         <div className="flex items-center gap-1 ml-2">
                             <button className="p-2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                             {!isEditing && (
                                <button className="p-2 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.passphrase || '')}>
                                    <Copy size={18}/>
                                </button>
                            )}
                         </div>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>Private Key</label>
                    <textarea 
                         readOnly={!isEditing}
                         className={`${inputBaseClass} font-mono text-xs`}
                         rows={8}
                         value={formData.data?.privateKey || ''}
                         onChange={(e) => updateDataField('privateKey', e.target.value)}
                         placeholder="-----BEGIN RSA PRIVATE KEY-----"
                    />
                </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Public Key</label>
                    <textarea 
                         readOnly={!isEditing}
                         className={`${inputBaseClass} font-mono text-xs`}
                         rows={4}
                         value={formData.data?.publicKey || ''}
                         onChange={(e) => updateDataField('publicKey', e.target.value)}
                         placeholder="ssh-rsa AAAA..."
                    />
                </div>
                {renderExpiryDropdown()}
            </>
        );
      case ItemType.WIFI:
          return (
              <>
                 <div className="space-y-1 group">
                    <label className={labelClass}>SSID (Network Name)</label>
                    <div className="flex items-center">
                         <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={inputBaseClass}
                            value={formData.data?.ssid || ''}
                            onChange={(e) => updateDataField('ssid', e.target.value)}
                            placeholder="MyWifi"
                        />
                         {!isEditing && (
                            <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.ssid || '')}>
                                <Copy size={16}/>
                            </button>
                        )}
                    </div>
                </div>
                <div className="space-y-1 group">
                    <label className={labelClass}>Password</label>
                     <div className="relative flex items-center">
                        <input 
                            type={showPassword || isEditing ? "text" : "password"} 
                            {...passwordAutoCompleteProps}
                            readOnly={!isEditing}
                            className={`${inputBaseClass} font-mono`}
                            value={formData.data?.password || ''}
                            onChange={(e) => updateDataField('password', e.target.value)}
                        />
                         <div className="flex items-center gap-1 ml-2">
                             <button className="p-2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                             {!isEditing && (
                                <button className="p-2 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.password || '')}>
                                    <Copy size={18}/>
                                </button>
                            )}
                         </div>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>Security Type</label>
                    {isEditing ? (
                         <select 
                            className={inputBaseClass}
                            value={formData.data?.securityType || ''}
                            onChange={(e) => updateDataField('securityType', e.target.value)}
                        >
                            <option value="WPA2">WPA2</option>
                            <option value="WPA3">WPA3</option>
                            <option value="WEP">WEP</option>
                            <option value="Open">Open</option>
                        </select>
                    ) : (
                         <input 
                            readOnly
                            className={inputBaseClass}
                            value={formData.data?.securityType || 'WPA2'}
                        />
                    )}
                </div>
                 {/* QR Code for WiFi */}
                 {!isEditing && formData.data?.ssid && formData.data?.password && (
                     <div className="mt-6 flex flex-col items-center p-4 bg-white rounded-xl w-fit mx-auto">
                         <QrCode size={128} className="text-black" />
                         <p className="text-black text-xs font-bold mt-2 uppercase tracking-wider">Scan to Join</p>
                     </div>
                 )}
              </>
          );
      case ItemType.LICENSE:
          return (
              <>
                 <div className="space-y-1 group">
                    <label className={labelClass}>License Number</label>
                    <div className="flex items-center">
                         <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={`${inputBaseClass} font-mono`}
                            value={formData.data?.licenseNumber || ''}
                            onChange={(e) => updateDataField('licenseNumber', e.target.value)}
                        />
                         {!isEditing && (
                            <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.licenseNumber || '')}>
                                <Copy size={16}/>
                            </button>
                        )}
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className={labelClass}>State / Country</label>
                        <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={inputBaseClass}
                            value={formData.data?.state || ''}
                            onChange={(e) => updateDataField('state', e.target.value)}
                            placeholder="CA"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className={labelClass}>Expiry Date</label>
                        <input 
                            type={isEditing ? "date" : "text"}
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={inputBaseClass}
                            value={formData.data?.expiryDate || ''}
                            onChange={(e) => updateDataField('expiryDate', e.target.value)}
                        />
                     </div>
                 </div>
              </>
          );
      case ItemType.CARD:
          return (
              <>
                <div className="space-y-1">
                    <label className={labelClass}>Cardholder Name</label>
                     <input 
                        {...autoCompleteProps}
                        readOnly={!isEditing}
                        className={`${inputBaseClass} uppercase`}
                        value={formData.data?.holderName || ''}
                        onChange={(e) => updateDataField('holderName', e.target.value)}
                        placeholder="ALEX STERLING"
                    />
                </div>
                 <div className="space-y-1 group">
                    <label className={labelClass}>Card Number</label>
                    <div className="flex items-center">
                         <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={`${inputBaseClass} font-mono text-lg tracking-widest`}
                            value={formData.data?.number || ''}
                            onChange={(e) => updateDataField('number', e.target.value)}
                            placeholder="0000 0000 0000 0000"
                        />
                        {!isEditing && (
                            <button className="text-gray-600 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(formData.data?.number || '')}>
                                <Copy size={16}/>
                            </button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-1">
                        <label className={labelClass}>Expiry</label>
                        <input 
                            {...autoCompleteProps}
                            readOnly={!isEditing}
                            className={`${inputBaseClass} font-mono`}
                            value={formData.data?.expiry || ''}
                            onChange={(e) => updateDataField('expiry', e.target.value)}
                            placeholder="MM/YY"
                        />
                     </div>
                      <div className="space-y-1">
                        <label className={labelClass}>CVV</label>
                         <div className="relative flex items-center">
                            <input 
                                type={showPassword || isEditing ? "text" : "password"}
                                {...passwordAutoCompleteProps}
                                readOnly={!isEditing}
                                className={`${inputBaseClass} font-mono`}
                                value={formData.data?.cvv || ''}
                                onChange={(e) => updateDataField('cvv', e.target.value)}
                                placeholder="123"
                            />
                            {!isEditing && (
                                <button className="absolute right-2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            )}
                         </div>
                     </div>
                     <div className="space-y-1">
                        <label className={labelClass}>PIN</label>
                         <div className="relative flex items-center">
                            <input 
                                type={showPin || isEditing ? "text" : "password"}
                                {...passwordAutoCompleteProps}
                                readOnly={!isEditing}
                                className={`${inputBaseClass} font-mono`}
                                value={formData.data?.pin || ''}
                                onChange={(e) => updateDataField('pin', e.target.value)}
                                placeholder="****"
                            />
                            {!isEditing && (
                                <button className="absolute right-2 text-gray-500 hover:text-white" onClick={() => setShowPin(!showPin)}>
                                    {showPin ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            )}
                         </div>
                     </div>
                </div>
                 {/* Visual Card Preview (Mock) */}
                 {!isEditing && (
                     <div className="mt-4 p-6 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 shadow-xl relative overflow-hidden h-48 flex flex-col justify-between select-none">
                         <div className="absolute top-0 right-0 p-4 opacity-20">
                             <CreditCard size={100} />
                         </div>
                         <div className="flex justify-between items-start z-10">
                             <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sentinel Card</div>
                             {formData.data?.provider === 'visa' && <VisaLogo className="h-8 w-auto text-white" />}
                             {formData.data?.provider === 'mastercard' && <MastercardLogo className="h-8 w-auto" />}
                         </div>
                         <div className="z-10 text-2xl font-mono text-white tracking-widest shadow-black drop-shadow-md">
                             {formData.data?.number ? formData.data.number.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                         </div>
                         <div className="flex justify-between z-10">
                             <div>
                                 <div className="text-[8px] text-gray-400 uppercase font-bold">Card Holder</div>
                                 <div className="text-sm font-medium text-gray-200 uppercase">{formData.data?.holderName || 'NAME'}</div>
                             </div>
                             <div>
                                 <div className="text-[8px] text-gray-400 uppercase font-bold text-right">Expires</div>
                                 <div className="text-sm font-medium text-gray-200">{formData.data?.expiry || 'MM/YY'}</div>
                             </div>
                         </div>
                     </div>
                 )}
              </>
          );
      case ItemType.NOTE:
          return (
             <div className="space-y-1">
                <label className={labelClass}>Secure Note Content</label>
                <textarea 
                    readOnly={!isEditing}
                    className={`${inputBaseClass} font-mono text-sm leading-relaxed`}
                    rows={12}
                    value={formData.data?.content || ''}
                    onChange={(e) => updateDataField('content', e.target.value)}
                    placeholder="Write anything..."
                />
            </div>
          );
      case ItemType.IDENTITY:
          return (
              <div className="space-y-4">
                  <FormSection title="Personal Information" isOpen={identitySections.personal} onToggle={() => toggleIdentitySection('personal')}>
                        <div className="grid grid-cols-3 gap-4">
                             <div className="col-span-1 space-y-1">
                                <label className={labelClass}>Title</label>
                                <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.title || ''} onChange={(e) => updateDataField('title', e.target.value)} placeholder="Mr/Ms" />
                             </div>
                             <div className="col-span-1 space-y-1">
                                <label className={labelClass}>First Name</label>
                                <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.firstName || ''} onChange={(e) => updateDataField('firstName', e.target.value)} />
                             </div>
                              <div className="col-span-1 space-y-1">
                                <label className={labelClass}>Last Name</label>
                                <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.lastName || ''} onChange={(e) => updateDataField('lastName', e.target.value)} />
                             </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={labelClass}>Date of Birth</label>
                                <input type={isEditing ? "date" : "text"} {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.dob || ''} onChange={(e) => updateDataField('dob', e.target.value)} />
                            </div>
                             <div className="space-y-1">
                                <label className={labelClass}>Gender</label>
                                <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.gender || ''} onChange={(e) => updateDataField('gender', e.target.value)} />
                            </div>
                        </div>
                  </FormSection>

                  <FormSection title="Address" isOpen={identitySections.address} onToggle={() => toggleIdentitySection('address')}>
                        <div className="space-y-1">
                            <label className={labelClass}>Address Line 1</label>
                            <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.address1 || ''} onChange={(e) => updateDataField('address1', e.target.value)} />
                        </div>
                         <div className="space-y-1">
                            <label className={labelClass}>Address Line 2</label>
                            <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.address2 || ''} onChange={(e) => updateDataField('address2', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className={labelClass}>City</label>
                                <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.city || ''} onChange={(e) => updateDataField('city', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>State</label>
                                <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.state || ''} onChange={(e) => updateDataField('state', e.target.value)} />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className={labelClass}>Postal Code</label>
                                <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.postalCode || ''} onChange={(e) => updateDataField('postalCode', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>Country</label>
                                <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.country || ''} onChange={(e) => updateDataField('country', e.target.value)} />
                            </div>
                        </div>
                  </FormSection>

                  <FormSection title="Contact" isOpen={identitySections.contact} onToggle={() => toggleIdentitySection('contact')}>
                        <div className="space-y-1">
                            <label className={labelClass}>Email</label>
                            <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.email || ''} onChange={(e) => updateDataField('email', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Phone</label>
                            <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.phone || ''} onChange={(e) => updateDataField('phone', e.target.value)} />
                        </div>
                  </FormSection>

                  <FormSection title="IDs" isOpen={identitySections.additional} onToggle={() => toggleIdentitySection('additional')}>
                       <div className="space-y-1">
                            <label className={labelClass}>Passport Number</label>
                            <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.passportNumber || ''} onChange={(e) => updateDataField('passportNumber', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Driver License</label>
                            <input {...autoCompleteProps} readOnly={!isEditing} className={inputBaseClass} value={formData.data?.licenseNumber || ''} onChange={(e) => updateDataField('licenseNumber', e.target.value)} />
                        </div>
                  </FormSection>
              </div>
          );
      default:
        return (
            <div className="p-4 bg-gray-800 rounded-lg text-gray-400 text-center">
                Fields for this item type are not yet implemented.
            </div>
        );
    }
  };

  const getHeaderIcon = () => {
       const map: any = {
            [ItemType.LOGIN]: <Globe size={24} />,
            [ItemType.CARD]: <CreditCard size={24} />,
            [ItemType.NOTE]: <FileText size={24} />,
            [ItemType.WIFI]: <Wifi size={24} />,
            [ItemType.IDENTITY]: <User size={24} />,
            [ItemType.BANK]: <Landmark size={24} />,
            [ItemType.SERVER]: <Server size={24} />,
            [ItemType.SSH_KEY]: <Terminal size={24} />,
            [ItemType.LICENSE]: <RectangleHorizontal size={24} />,
            [ItemType.FILE]: <Paperclip size={24} />,
            [ItemType.DATABASE]: <Database size={24} />,
            [ItemType.ID_CARD]: <IdCard size={24} />,
       }
       return map[formData.type || ItemType.LOGIN] || <FileText size={24} />;
  }

  const expiryStatus = getExpiryText();

  return (
    <div className="max-w-4xl mx-auto pb-20">
      
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        item={formData as Item}
        type="item"
      />

      <ConfirmationModal
        isOpen={deleteConfirmationOpen}
        onClose={() => setDeleteConfirmationOpen(false)}
        onConfirm={handleDelete}
        title="Delete Item?"
        message="This item will be moved to Trash. You can restore it later."
        confirmText="Move to Trash"
        type="warning"
      />

      <MoveToVaultModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={handleMoveToVault}
        currentVaultId={formData.vaultId || ''}
        vaults={vaults}
      />

      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
        
        <div className="flex items-center gap-2">
            {!isEditing ? (
                <>
                    <button onClick={() => setIsMoveModalOpen(true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Move to">
                        <Layers size={20} />
                    </button>
                    <button onClick={handleDuplicate} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Duplicate">
                        <CopyIcon size={20} />
                    </button>
                    <button onClick={handleShare} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Share">
                        <Share2 size={20} />
                    </button>
                    <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Edit">
                        <Edit2 size={20} />
                    </button>
                    <button onClick={confirmDelete} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={20} />
                    </button>
                </>
            ) : (
                <>
                     <button onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium shadow-lg shadow-primary-900/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                        {isSaving ? (
                            <>
                                <Lock size={18} className="animate-[wiggle_0.8s_ease-in-out_infinite]" />
                                <span>Securing...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Save Item</span>
                            </>
                        )}
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Form */}
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 relative overflow-hidden">
                   {/* Background Gradient */}
                   <div className="absolute top-0 right-0 w-64 h-64 bg-primary-900/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
                   
                   <div className="relative z-10 space-y-6">
                       {/* Header */}
                       <div className="flex items-start gap-4 mb-8">
                           <div className="p-3 bg-gray-800 rounded-2xl text-primary-400 shadow-inner relative overflow-hidden">
                               {formData.type === ItemType.LOGIN && formData.data?.url ? (
                                   <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                                       <FaviconImage url={formData.data.url} />
                                   </div>
                               ) : (
                                   getHeaderIcon()
                               )}
                           </div>
                           <div className="flex-1">
                               {isEditing ? (
                                   <input 
                                        type="text" 
                                        {...autoCompleteProps}
                                        className="w-full bg-transparent border-b border-gray-700 focus:border-primary-500 text-2xl font-bold text-white placeholder-gray-600 focus:outline-none transition-colors pb-1"
                                        placeholder="Description"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        autoFocus={!isMobile}
                                   />
                               ) : (
                                   <h1 className="text-2xl font-bold text-white">{formData.name}</h1>
                               )}
                               
                               <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {isEditing ? (
                                        <>
                                            <select 
                                                value={formData.vaultId} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, vaultId: e.target.value }))}
                                                className="bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-primary-500"
                                            >
                                                {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                            
                                            <div className="flex items-center gap-1 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1">
                                                <Layers size={12} className="text-gray-500" />
                                                <select 
                                                    value={formData.categoryId || ''} 
                                                    onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                                                    className="bg-gray-950 text-gray-300 text-xs focus:outline-none [&>option]:bg-gray-950 [&>option]:text-white"
                                                >
                                                    <option value="">No Category</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-xs text-gray-500 bg-gray-950/50 px-2 py-1 rounded-lg border border-gray-800/50">
                                                {vaults.find(v => v.id === formData.vaultId)?.name || 'Unknown Vault'}
                                            </div>
                                            {formData.categoryId && categories.find(c => c.id === formData.categoryId) && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-950/50 px-2 py-1 rounded-lg border border-gray-800/50">
                                                    <div className={`w-2 h-2 rounded-full ${categories.find(c => c.id === formData.categoryId)?.color}`} />
                                                    {categories.find(c => c.id === formData.categoryId)?.name}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {!isEditing && formData.lastUpdated && (
                                        <span className="text-xs text-gray-600 flex items-center gap-1">
                                            <Clock size={12} /> Updated {new Date(formData.lastUpdated).toLocaleDateString()}
                                        </span>
                                    )}
                               </div>
                           </div>
                       </div>
                        
                       {/* Expiry Alert */}
                       {expiryStatus && !isEditing && (
                           <div className={`p-3 rounded-lg flex items-center gap-3 text-sm font-medium border ${expiryStatus.color.includes('red') ? 'bg-red-900/20 border-red-900/30 text-red-400' : 'bg-orange-900/20 border-orange-900/30 text-orange-400'}`}>
                               <Bell size={16} />
                               {expiryStatus.text}
                           </div>
                       )}

                       {/* Dynamic Fields */}
                       <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                           <input type="text" name="fakeusername" autoComplete="off" style={{position: 'absolute', left: '-9999px'}} tabIndex={-1} />
                           <input type="password" name="fakepassword" autoComplete="new-password" style={{position: 'absolute', left: '-9999px'}} tabIndex={-1} />
                           <div className="space-y-6">
                               {renderFields()}
                           </div>
                       </form>

                       {/* Notes Section (Common) */}
                       {formData.type !== ItemType.NOTE && (
                           <div className="pt-6 border-t border-gray-800">
                               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
                               <textarea 
                                    readOnly={!isEditing}
                                    className={`${isEditing ? 'bg-gray-950 border-gray-800' : 'bg-transparent border-transparent px-0'} w-full border rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors text-sm leading-relaxed`}
                                    rows={4}
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder={isEditing ? "Add any additional details here..." : "No notes."}
                               />
                           </div>
                       )}
                   </div>
              </div>
          </div>

          {/* Sidebar / Metadata */}
          <div className="space-y-6">
              {/* Image Preview (Card/ID) */}
              {(formData.type === ItemType.CARD || formData.type === ItemType.ID_CARD) && isEditing && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Card Image</label>
                      <div className="relative w-full aspect-video bg-gray-950 rounded-xl border-2 border-dashed border-gray-800 hover:border-primary-500/50 transition-colors flex flex-col items-center justify-center group overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          {formData.data?.cardImage ? (
                              <img src={formData.data.cardImage} alt="Card" className="w-full h-full object-cover" />
                          ) : (
                              <div className="flex flex-col items-center text-gray-600 group-hover:text-primary-400">
                                  <Camera size={24} className="mb-2" />
                                  <span className="text-xs font-bold">Upload Photo</span>
                              </div>
                          )}
                          <input 
                             type="file" 
                             ref={fileInputRef} 
                             className="hidden" 
                             accept="image/*"
                             onChange={handleFileChange} 
                          />
                      </div>
                      {formData.data?.cardImage && (
                          <button onClick={() => updateDataField('cardImage', undefined)} className="mt-2 text-xs text-red-400 hover:underline w-full text-center">Remove Image</button>
                      )}
                  </div>
              )}

              {/* Attachments (Common for all except FILE which has main view) */}
              {formData.type !== ItemType.FILE && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attachments</label>
                          {isEditing && (
                              <button onClick={() => multipleFileInputRef.current?.click()} className="p-1 hover:bg-gray-800 rounded text-primary-400">
                                  <Plus size={16} />
                              </button>
                          )}
                      </div>
                      
                      {isEditing && <input type="file" multiple ref={multipleFileInputRef} className="hidden" onChange={handleMultiFileUpload} />}

                      <div className="space-y-2">
                          {fileAttachments.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-2 bg-gray-950 rounded-lg border border-gray-800 group">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      <File size={16} className="text-gray-500 shrink-0" />
                                      <span className="text-sm text-gray-300 truncate">{file.name}</span>
                                  </div>
                                  <div className="flex items-center">
                                      {isEditing ? (
                                           <button onClick={() => removeAttachment(file.id)} className="p-1 text-gray-500 hover:text-red-400"><X size={14}/></button>
                                      ) : (
                                           <button onClick={() => downloadAttachment(file.id, file.name)} className="p-1 text-gray-500 hover:text-white"><Download size={14}/></button>
                                      )}
                                  </div>
                              </div>
                          ))}
                          {fileAttachments.length === 0 && (
                              <div className="text-xs text-gray-600 text-center py-4">No attachments</div>
                          )}
                      </div>
                  </div>
              )}
              
              {/* History / Meta */}
              {!isEditing && (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item History</label>
                      <div className="text-xs text-gray-400 space-y-2">
                          <div className="flex justify-between">
                              <span>Created</span>
                              <span>{new Date().toLocaleDateString()}</span> 
                              {/* Mock date, ideally from item.createdAt */}
                          </div>
                          <div className="flex justify-between">
                              <span>Last Password Change</span>
                              <span>{formData.data?.passwordLastModified ? new Date(formData.data.passwordLastModified).toLocaleDateString() : 'Never'}</span>
                          </div>
                          <div className="flex justify-between">
                              <span>Times Viewed</span>
                              <span>12</span>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default ItemDetail;