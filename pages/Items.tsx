import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useItemStore } from '../src/stores/itemStore';
import { useVaultStore } from '../src/stores/vaultStore';
import { useData } from '../App';
import { Plus, Search, Filter, Globe, CreditCard, StickyNote, Wifi, FileText, User, ArrowUpRight, Edit2, Share2, MoreVertical, Trash2, X, Landmark, RectangleHorizontal, Check, ChevronDown, Copy, Star, Files, FolderInput, Database, Server, Terminal, IdCard } from 'lucide-react';
import { Item, ItemType, Vault, Category } from '../types';
import VaultModal from '../components/VaultModal';
import ShareModal from '../components/ShareModal';
import ConfirmationModal from '../components/ConfirmationModal';
import MoveToVaultModal from '../components/MoveToVaultModal';

const getFaviconUrl = (url?: string) => {
    if (!url) return null;
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
        return null;
    }
}

const ItemIcon = ({ item }: { item: Item }) => {
    const Icon = ({ type }: { type: ItemType }) => {
        switch(type) {
            case ItemType.LOGIN: return <Globe className="text-blue-400" size={20} />;
            case ItemType.CARD: return <CreditCard className="text-green-400" size={20} />;
            case ItemType.NOTE: return <StickyNote className="text-yellow-400" size={20} />;
            case ItemType.WIFI: return <Wifi className="text-purple-400" size={20} />;
            case ItemType.IDENTITY: return <User className="text-pink-400" size={20} />;
            case ItemType.BANK: return <Landmark className="text-emerald-400" size={20} />;
            case ItemType.LICENSE: return <RectangleHorizontal className="text-orange-400" size={20} />;
            case ItemType.DATABASE: return <Database className="text-cyan-400" size={20} />;
            case ItemType.SERVER: return <Server className="text-indigo-400" size={20} />;
            case ItemType.SSH_KEY: return <Terminal className="text-slate-400" size={20} />;
            case ItemType.ID_CARD: return <IdCard className="text-teal-400" size={20} />;
            case ItemType.FILE: return <FileText className="text-rose-400" size={20} />;
            default: return <FileText className="text-gray-400" size={20} />;
        }
    };

    if (item.type === ItemType.LOGIN && item.data?.url) {
        const favicon = getFaviconUrl(item.data.url);
        if (favicon) {
            return (
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden p-1 shrink-0">
                    <img 
                        src={favicon} 
                        alt="" 
                        className="w-full h-full object-contain rounded-full" 
                        onError={(e) => {
                             e.currentTarget.style.display = 'none';
                             e.currentTarget.parentElement?.classList.remove('p-2'); // Reset padding if hiding
                        }}
                    />
                    <div className="hidden absolute inset-0 flex items-center justify-center">
                         <Icon type={item.type} />
                    </div>
                </div>
            )
        }
    }
    
    // Attempt to show bank logo if website is present
    if (item.type === ItemType.BANK && item.data?.website) {
         const favicon = getFaviconUrl(item.data.website?.startsWith('http') ? item.data.website : `https://${item.data.website}`);
         if (favicon) {
            return (
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden p-1 shrink-0">
                    <img 
                        src={favicon} 
                        alt="" 
                        className="w-full h-full object-contain rounded-full" 
                        onError={(e) => {
                             e.currentTarget.style.display = 'none';
                             e.currentTarget.parentElement?.classList.remove('p-2'); 
                        }}
                    />
                     <div className="hidden absolute inset-0 flex items-center justify-center">
                         <Icon type={item.type} />
                    </div>
                </div>
            )
         }
    }

    return (
         <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
             <Icon type={item.type} />
         </div>
    );
}

const ITEM_TYPE_OPTIONS = [
    { type: ItemType.LOGIN, label: 'Login', description: 'Save usernames and passwords for websites.', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { type: ItemType.CARD, label: 'Card', description: 'Securely store credit and debit card details.', icon: CreditCard, color: 'text-green-400', bg: 'bg-green-400/10' },
    { type: ItemType.NOTE, label: 'Secure Note', description: 'Keep sensitive information and codes safe.', icon: StickyNote, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { type: ItemType.IDENTITY, label: 'Identity', description: 'Store personal details for filling forms.', icon: User, color: 'text-pink-400', bg: 'bg-pink-400/10' },
    { type: ItemType.WIFI, label: 'WiFi', description: 'Save WiFi network names and passwords.', icon: Wifi, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { type: ItemType.BANK, label: 'Bank Account', description: 'Keep bank account numbers and IFSC codes.', icon: Landmark, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { type: ItemType.DATABASE, label: 'Database', description: 'Store database connection strings and creds.', icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { type: ItemType.SERVER, label: 'Server', description: 'Manage server credentials and IP addresses.', icon: Server, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { type: ItemType.SSH_KEY, label: 'SSH Key', description: 'Store SSH keys and passphrases securely.', icon: Terminal, color: 'text-slate-400', bg: 'bg-slate-400/10' },
    { type: ItemType.LICENSE, label: 'License', description: 'Store driving license details.', icon: RectangleHorizontal, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { type: ItemType.ID_CARD, label: 'ID Card', description: 'Government IDs, Passports, Employee IDs.', icon: IdCard, color: 'text-teal-400', bg: 'bg-teal-400/10' },
    { type: ItemType.FILE, label: 'Files', description: 'Securely store documents and files.', icon: FileText, color: 'text-rose-400', bg: 'bg-rose-400/10' },
];

const Items: React.FC = () => {
  const { items, vaults, categories, loadItems, loadVaults, loadCategories, updateItem, deleteItem, toggleFavorite, isLoading } = useItemStore();
  const { deleteVault } = useVaultStore();
  const { settings } = useData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vaultFilter = searchParams.get('vault');

  useEffect(() => {
    loadVaults();
    loadCategories();
    loadItems(vaultFilter || undefined);
  }, [vaultFilter, loadVaults, loadCategories, loadItems]);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal & Menu State
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Sharing
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ item: Item | Vault | null, type: 'item' | 'vault' }>({ item: null, type: 'item' });

  // Move to Vault
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveItemId, setMoveItemId] = useState<string | null>(null);

  // Delete Confirmations
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'item' | 'vault' } | null>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number, right: number, bottom?: number } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copyTimer, setCopyTimer] = useState<number>(0);

  const filteredItems = useMemo(() => {
    let res = items.filter(i => !i.deletedAt); // Ensure no deleted items
    if (vaultFilter) {
      res = res.filter(i => i.vaultId === vaultFilter);
    }
    if (typeFilter !== 'ALL') {
        res = res.filter(i => i.type === typeFilter);
    }
    return res;
  }, [items, vaultFilter, typeFilter]);

  const activeMenuItem = useMemo(() => items.find(i => i.id === menuOpenId), [items, menuOpenId]);

  const groupedItems = useMemo(() => {
      if (!settings.groupItemsByCategory) return { 'All Items': filteredItems };
      
      const groups: Record<string, Item[]> = {};
      const uncategorized: Item[] = [];

      filteredItems.forEach(item => {
          if (item.categoryId) {
              const cat = categories.find(c => c.id === item.categoryId);
              const key = cat ? cat.name : 'Uncategorized';
              if (!groups[key]) groups[key] = [];
              groups[key].push(item);
          } else {
              uncategorized.push(item);
          }
      });

      // Sort keys logic if needed, but simply returning object
      const result: Record<string, Item[]> = {};
      
      // Add existing categories in order defined in categories to maintain sort order
      categories.forEach(cat => {
          if (groups[cat.name]) {
              result[cat.name] = groups[cat.name];
          }
      });

      // Add dynamic categories (if any existed that weren't in categories)
      Object.keys(groups).forEach(key => {
          if (!result[key] && key !== 'Uncategorized') result[key] = groups[key];
      });

      if (uncategorized.length > 0) {
          result['Uncategorized'] = uncategorized;
      }

      return result;

  }, [filteredItems, settings.groupItemsByCategory, categories]);

  const currentVault = vaultFilter ? vaults.find(v => v.id === vaultFilter) : null;
  const currentVaultName = currentVault ? currentVault.name : 'All Items';

  const openVaultModal = () => {
      setIsVaultModalOpen(true);
  };

  const openVaultShare = () => {
      if(currentVault) {
          setShareTarget({ item: currentVault, type: 'vault' });
          setIsShareModalOpen(true);
      }
  }

  const confirmDeleteVault = () => {
      if (vaultFilter) {
          setDeleteTarget({ id: vaultFilter, type: 'vault' });
      }
  };

  const handleConfirmDelete = () => {
      if (!deleteTarget) return;

      if (deleteTarget.type === 'vault') {
          deleteVault(deleteTarget.id);
          navigate('/vaults');
      } else {
          deleteItem(deleteTarget.id);
      }
      setDeleteTarget(null);
  };

  const handleAddItem = () => {
      setIsTypeModalOpen(true);
  };

  const selectItemType = (type: ItemType) => {
      setIsTypeModalOpen(false);
      navigate(`/items/new?type=${type}`);
  };

  const handleFilterSelect = (type: string) => {
      setTypeFilter(type);
      setIsFilterOpen(false);
  };
  
  const toggleMenu = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (menuOpenId === id) {
          closeMenu();
      } else {
          const rect = e.currentTarget.getBoundingClientRect();
          setMenuOpenId(id);
          
          const menuHeight = 350;
          const spaceBelow = window.innerHeight - rect.bottom;
          const shouldOpenUpward = spaceBelow < menuHeight;
          
          setMenuPosition({ 
              top: shouldOpenUpward ? undefined : rect.bottom + 8,
              bottom: shouldOpenUpward ? window.innerHeight - rect.top + 8 : undefined,
              right: window.innerWidth - rect.right 
          });
      }
  };

  const closeMenu = () => {
      setMenuOpenId(null);
      setMenuPosition(null);
  }
  
  const handleCopy = (e: React.MouseEvent, text: string, fieldId: string) => {
      e.stopPropagation();
      if(!text) return;
      
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      
      const clearSeconds = settings.clipboardClearSeconds || 30;
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
      
      closeMenu();
  };

  const handleDuplicate = (e: React.MouseEvent, item: Item) => {
      e.stopPropagation();
      navigate('/items/new?type=' + item.type, {
          state: {
              duplicateData: {
                  ...item,
                  name: `${item.name} (Copy)`,
                  id: undefined,
                  createdAt: undefined,
                  lastUpdated: undefined
              }
          }
      });
      closeMenu();
  };
  
  const handleToggleFavorite = async (e: React.MouseEvent, item: Item) => {
      e.stopPropagation();
      try {
          await toggleFavorite(item.id);
      } catch (error) {
          console.error('Failed to toggle favorite:', error);
      }
      closeMenu();
  };

  const confirmDeleteItem = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeleteTarget({ id, type: 'item' });
      closeMenu();
  };
  
  const handleEdit = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      navigate(`/items/${id}`, { state: { isEditing: true } });
      closeMenu();
  };

  const handleShareItem = (e: React.MouseEvent, item: Item) => {
      e.stopPropagation();
      setShareTarget({ item, type: 'item' });
      setIsShareModalOpen(true);
      closeMenu();
  }

  const handleMoveItem = (e: React.MouseEvent, itemId: string) => {
      e.stopPropagation();
      setMoveItemId(itemId);
      setIsMoveModalOpen(true);
      closeMenu();
  }

  const handleMoveToVault = async (newVaultId: string) => {
      if (!moveItemId) return;
      try {
          await updateItem(moveItemId, { vaultId: newVaultId });
          await loadItems(vaultFilter || undefined);
          setIsMoveModalOpen(false);
          setMoveItemId(null);
      } catch (error) {
          console.error('Failed to move item:', error);
          alert('Failed to move item. Please try again.');
      }
  }

  const renderItemRow = (item: Item, idx: number, total: number) => (
      <div 
        key={item.id} 
        onClick={() => navigate(`/items/${item.id}`)}
        className="p-4 flex items-center justify-between hover:bg-gray-800/50 cursor-pointer transition-colors group relative border-b border-gray-800/50"
        >
        <div className="flex items-center gap-4">
            <ItemIcon item={item} />
            <div>
                <h4 className="text-white font-medium text-sm md:text-base flex items-center gap-2">
                    {item.name}
                    {item.isFavorite && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                </h4>
                <div className="text-gray-500 text-xs md:text-sm flex items-center gap-2">
                    <span>
                        {item.type === ItemType.NOTE ? (item.data?.content?.slice(0, 30) || 'No content') :
                         item.type === ItemType.LOGIN ? item.data?.username :
                         item.type === ItemType.WIFI ? item.data?.ssid :
                         item.type === ItemType.DATABASE ? item.data?.databaseName :
                         item.type === ItemType.SERVER ? (item.data?.hostname || item.data?.ip) :
                         item.type === ItemType.SSH_KEY ? item.data?.host :
                         item.type === ItemType.BANK ? item.data?.accountNumber :
                         item.type === ItemType.FILE ? item.data?.fileName :
                         item.data?.username || '****'}
                    </span>
                    {item.folder && (
                        <>
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <span>{item.folder}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2">
            {/* Action Buttons - Visible on Mobile by default, hover on Desktop */}
            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {(item.data?.password || item.data?.pin || item.data?.privateKey) && (
                    <button 
                        className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        onClick={(e) => handleCopy(e, item.data?.password || item.data?.pin || item.data?.privateKey || '', `item-${item.id}`)}
                        title="Copy Secret"
                    >
                        {copiedField === `item-${item.id}` ? (
                            <div className="relative w-4 h-4 flex items-center justify-center">
                                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 16 16">
                                    <circle cx="8" cy="8" r="7" fill="none" stroke="#1f2937" strokeWidth="1.5"/>
                                    <circle cx="8" cy="8" r="7" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="43.98" strokeDashoffset={43.98 * (1 - copyTimer / (settings.clipboardClearSeconds || 30))} className="transition-all duration-1000 linear"/>
                                </svg>
                                <span className="text-[8px] font-bold text-green-500">{copyTimer}</span>
                            </div>
                        ) : (
                            <Copy size={16} />
                        )}
                    </button>
                )}
                <button 
                    className={`hidden md:block p-2 hover:bg-gray-700 rounded-lg transition-colors ${item.isFavorite ? 'text-yellow-500 hover:text-yellow-400' : 'text-gray-500 hover:text-white'}`}
                    onClick={(e) => handleToggleFavorite(e, item)}
                    title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                    <Star size={16} className={item.isFavorite ? 'fill-current' : ''} />
                </button>
            </div>

            {/* Menu Button */}
            <button 
                className={`text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors ${menuOpenId === item.id ? 'bg-gray-700 text-white' : ''}`}
                onClick={(e) => toggleMenu(e, item.id)}
            >
                <MoreVertical size={18} />
            </button>
        </div>
        </div>
  );

  return (
    <div className="h-full flex flex-col" onClick={() => { setIsFilterOpen(false); closeMenu(); }}>
      <VaultModal 
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        vault={currentVault}
      />

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        item={shareTarget.item}
        type={shareTarget.type}
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.type === 'vault' ? "Delete Vault?" : "Delete Item?"}
        message={deleteTarget?.type === 'vault' 
            ? "This vault and all items within it will be moved to Trash. You can restore them later." 
            : "This item will be moved to Trash. You can restore it later."}
        confirmText="Move to Trash"
        type="warning"
      />

      <MoveToVaultModal
        isOpen={isMoveModalOpen}
        onClose={() => { setIsMoveModalOpen(false); setMoveItemId(null); }}
        onMove={handleMoveToVault}
        currentVaultId={moveItemId ? items.find(i => i.id === moveItemId)?.vaultId || '' : ''}
        vaults={vaults.filter(v => !v.deletedAt)}
      />

      {/* New Item Type Selection Modal - List View */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsTypeModalOpen(false)}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden mb-20 md:mb-0 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/50 shrink-0">
                    <h3 className="font-bold text-white text-lg">Select Item Type</h3>
                    <button onClick={() => setIsTypeModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-2 overflow-y-auto custom-scrollbar">
                    {ITEM_TYPE_OPTIONS.map((t) => (
                        <button 
                            key={t.type} 
                            onClick={() => selectItemType(t.type)}
                            className="w-full flex items-center gap-4 p-3 hover:bg-gray-800/50 rounded-xl transition-all group border border-transparent hover:border-gray-800"
                        >
                            <div className={`p-3 rounded-xl ${t.bg} ${t.color} shrink-0`}>
                                <t.icon size={24} />
                            </div>
                            <div className="text-left flex-1">
                                <span className="block text-sm font-bold text-gray-200 group-hover:text-white mb-0.5">{t.label}</span>
                                <span className="block text-xs text-gray-500 group-hover:text-gray-400">{t.description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Context Menu Portal (Fixed Position to break out of overflow) */}
      {activeMenuItem && menuPosition && (
            <div 
                className="fixed z-50 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in origin-top-right"
                style={{ top: menuPosition.top, bottom: menuPosition.bottom, right: menuPosition.right }}
                onClick={(e) => e.stopPropagation()}
            >
                {activeMenuItem.data?.username && (
                    <button onClick={(e) => handleCopy(e, activeMenuItem.data?.username || '', `menu-username-${activeMenuItem.id}`)} className="w-full text-left px-4 py-3 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 flex items-center gap-3">
                        <User size={14} /> Copy Username
                    </button>
                )}
                {(activeMenuItem.data?.password || activeMenuItem.data?.privateKey) && (
                    <button onClick={(e) => handleCopy(e, activeMenuItem.data?.password || activeMenuItem.data?.privateKey || '', `menu-password-${activeMenuItem.id}`)} className="w-full text-left px-4 py-3 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 flex items-center gap-3">
                        <Copy size={14} /> Copy {activeMenuItem.type === ItemType.SSH_KEY ? 'Private Key' : 'Password'}
                    </button>
                )}
                <div className="h-px bg-gray-700 my-1"></div>
                <button onClick={(e) => handleEdit(e, activeMenuItem.id)} className="w-full text-left px-4 py-3 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 flex items-center gap-3">
                    <Edit2 size={14} /> Edit
                </button>
                <button onClick={(e) => handleShareItem(e, activeMenuItem)} className="w-full text-left px-4 py-3 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 flex items-center gap-3">
                    <Share2 size={14} /> Share
                </button>
                <button onClick={(e) => handleDuplicate(e, activeMenuItem)} className="w-full text-left px-4 py-3 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 flex items-center gap-3">
                    <Files size={14} /> Duplicate
                </button>
                <button onClick={(e) => handleToggleFavorite(e, activeMenuItem)} className="w-full text-left px-4 py-3 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 flex items-center gap-3">
                    <Star size={14} className={activeMenuItem.isFavorite ? 'fill-current text-yellow-500' : ''} /> {activeMenuItem.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                </button>
                <button onClick={(e) => handleMoveItem(e, activeMenuItem.id)} className="w-full text-left px-4 py-3 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 flex items-center gap-3">
                    <FolderInput size={14} /> Move to...
                </button>
                <div className="h-px bg-gray-700 my-1"></div>
                <button onClick={(e) => confirmDeleteItem(e, activeMenuItem.id)} className="w-full text-left px-4 py-3 text-xs font-medium text-red-400 hover:bg-red-900/20 flex items-center gap-3">
                    <Trash2 size={14} /> Delete
                </button>
            </div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        {/* Header Row */}
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    {currentVaultName}
                </h2>
                <p className="text-gray-400 text-sm">{filteredItems.length} items stored securely</p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
                 {/* Filter Dropdown */}
                 <div className="relative" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter !== 'ALL' ? 'bg-primary-900/20 text-primary-400 border border-primary-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                        <Filter size={16} />
                        <span className="hidden md:inline">{typeFilter === 'ALL' ? 'Filter' : typeFilter.charAt(0) + typeFilter.slice(1).toLowerCase().replace('_', ' ')}</span>
                        <ChevronDown size={14} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-30 overflow-hidden animate-fade-in">
                            <button 
                                onClick={() => handleFilterSelect('ALL')}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 text-gray-300 hover:text-white flex items-center justify-between"
                            >
                                All Items
                                {typeFilter === 'ALL' && <Check size={14} className="text-primary-500" />}
                            </button>
                            <div className="h-px bg-gray-800 my-0.5"></div>
                            {ITEM_TYPE_OPTIONS.map(opt => (
                                <button 
                                    key={opt.type}
                                    onClick={() => handleFilterSelect(opt.type)}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 text-gray-300 hover:text-white flex items-center justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <opt.icon size={14} className={opt.color} />
                                        {opt.label}
                                    </span>
                                    {typeFilter === opt.type && <Check size={14} className="text-primary-500" />}
                                </button>
                            ))}
                        </div>
                    )}
                 </div>

                {/* Vault Actions */}
                {vaultFilter ? (
                    <>
                        <div className="w-px h-6 bg-gray-800 mx-1"></div>
                        <button 
                            onClick={openVaultModal}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors hidden md:block" 
                            title="Edit Vault"
                        >
                            <Edit2 size={20} />
                        </button>
                        <button 
                            onClick={openVaultShare}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors hidden md:block" 
                            title="Share Vault"
                        >
                            <Share2 size={20} />
                        </button>
                        <button 
                            onClick={confirmDeleteVault}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors hidden md:block"
                            title="Delete Vault"
                        >
                            <Trash2 size={20} />
                        </button>
                        
                        {/* Mobile Vault Menu */}
                        <button className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                             <MoreVertical size={20} onClick={openVaultModal} />
                        </button>
                    </>
                ) : null}

                <button 
                    onClick={handleAddItem}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-3 md:px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-900/30 ml-1 md:ml-2"
                >
                    <Plus size={18} />
                    <span className="hidden md:inline">Add Item</span>
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
         {isLoading ? (
             <div className="overflow-y-auto pb-20 md:pb-0">
                 {[...Array(8)].map((_, i) => (
                     <div key={i} className={`p-4 flex items-center justify-between animate-pulse ${i !== 7 ? 'border-b border-gray-800/50' : ''}`}>
                         <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-gray-800"></div>
                             <div>
                                 <div className="h-4 w-32 bg-gray-800 rounded mb-2"></div>
                                 <div className="h-3 w-24 bg-gray-800 rounded"></div>
                             </div>
                         </div>
                         <div className="flex items-center gap-2">
                             <div className="w-8 h-8 bg-gray-800 rounded-lg"></div>
                             <div className="w-8 h-8 bg-gray-800 rounded-lg hidden md:block"></div>
                             <div className="w-8 h-8 bg-gray-800 rounded-lg"></div>
                         </div>
                     </div>
                 ))}
             </div>
         ) : filteredItems.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                 <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Search size={32} />
                 </div>
                 <p className="text-lg font-medium text-gray-300">No items found</p>
                 <p className="text-sm mb-6">Try adjusting filters or add a new item.</p>
                 <button 
                    onClick={handleAddItem}
                    className="text-primary-400 font-medium hover:underline"
                >
                    Create new item
                </button>
             </div>
         ) : (
             <div className="overflow-y-auto pb-20 md:pb-0" onScroll={closeMenu}>
                 {settings.groupItemsByCategory ? (
                     // Grouped List
                     Object.entries(groupedItems).map(([category, items]: [string, Item[]]) => (
                         <div key={category}>
                             {category !== 'All Items' && (
                                <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur px-4 py-2 border-b border-gray-800 flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full ${categories.find(c => c.name === category)?.color || 'bg-gray-500'}`} />
                                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{category}</h3>
                                     <span className="text-xs text-gray-600">({items.length})</span>
                                </div>
                             )}
                             {items.map((item, idx) => renderItemRow(item, idx, items.length))}
                         </div>
                     ))
                 ) : (
                     // Flat List
                     filteredItems.map((item, idx) => renderItemRow(item, idx, filteredItems.length))
                 )}
             </div>
         )}
      </div>

      {/* FAB for mobile - only show if not viewing a specific vault */}
      {!vaultFilter && (
          <button 
            onClick={handleAddItem}
            className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary-600 text-white rounded-full shadow-xl flex items-center justify-center z-40 transition-transform active:scale-95"
          >
            <Plus size={28} />
          </button>
      )}
    </div>
  );
};

export default Items;