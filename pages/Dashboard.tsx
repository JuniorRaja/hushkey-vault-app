import React, { useState } from 'react';
import { useData } from '../App';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, Briefcase, CreditCard, User, ChevronRight, MoreVertical, Edit2, Share2, Trash2, Shield, Star, Globe, StickyNote, Wifi, FileText, Landmark, RectangleHorizontal, Database, Server, Terminal, IdCard } from 'lucide-react';
import { Vault, Item, ItemType } from '../types';
import VaultModal from '../components/VaultModal';
import ShareModal from '../components/ShareModal';
import ConfirmationModal from '../components/ConfirmationModal';

const VaultIcon = ({ name, size = 24 }: { name: string, size?: number }) => {
    // Mapping string name to icon component
    const map: any = { 'Folder': Folder, 'Briefcase': Briefcase, 'CreditCard': CreditCard, 'User': User, 'Shield': Shield };
    const Icon = map[name] || Folder;
    return <Icon size={size} />;
};

const ItemTypeIcon = ({ type, size = 20 }: { type: ItemType, size?: number }) => {
    switch(type) {
        case ItemType.LOGIN: return <Globe className="text-blue-400" size={size} />;
        case ItemType.CARD: return <CreditCard className="text-green-400" size={size} />;
        case ItemType.NOTE: return <StickyNote className="text-yellow-400" size={size} />;
        case ItemType.WIFI: return <Wifi className="text-purple-400" size={size} />;
        case ItemType.IDENTITY: return <User className="text-pink-400" size={size} />;
        case ItemType.BANK: return <Landmark className="text-emerald-400" size={size} />;

        case ItemType.DATABASE: return <Database className="text-cyan-400" size={size} />;
        case ItemType.SERVER: return <Server className="text-indigo-400" size={size} />;
        case ItemType.SSH_KEY: return <Terminal className="text-slate-400" size={size} />;
        case ItemType.ID_CARD: return <IdCard className="text-teal-400" size={size} />;
        case ItemType.FILE: return <FileText className="text-rose-400" size={size} />;
        default: return <FileText className="text-gray-400" size={size} />;
    }
};

const Dashboard: React.FC = () => {
  const { vaults, deleteVault, items } = useData();
  const navigate = useNavigate();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<Vault | null>(null);
  
  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingVault, setSharingVault] = useState<Vault | null>(null);

  // Delete Confirmation State
  const [vaultToDelete, setVaultToDelete] = useState<string | null>(null);

  const favorites = items.filter(i => i.isFavorite);

  const toggleMenu = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setMenuOpenId(menuOpenId === id ? null : id);
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setVaultToDelete(id);
      setMenuOpenId(null);
  };

  const handleDeleteVault = () => {
      if (vaultToDelete) {
          deleteVault(vaultToDelete);
          setVaultToDelete(null);
      }
  };

  const openModal = (e: React.MouseEvent, vault: Vault | null) => {
      e.stopPropagation();
      setEditingVault(vault);
      setIsModalOpen(true);
      setMenuOpenId(null);
  };

  const openShareModal = (e: React.MouseEvent, vault: Vault) => {
      e.stopPropagation();
      setSharingVault(vault);
      setIsShareModalOpen(true);
      setMenuOpenId(null);
  };

  return (
    <div className="space-y-6" onClick={() => setMenuOpenId(null)}>
      
      <VaultModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        vault={editingVault}
      />

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        item={sharingVault}
        type="vault"
      />

      <ConfirmationModal
        isOpen={!!vaultToDelete}
        onClose={() => setVaultToDelete(null)}
        onConfirm={handleDeleteVault}
        title="Delete Vault?"
        message="This vault and all items within it will be moved to Trash. You can restore them later."
        confirmText="Move to Trash"
      />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Vaults</h2>
        <button 
            onClick={(e) => openModal(e, null)}
            className="w-10 h-10 bg-primary-600 hover:bg-primary-500 rounded-full flex items-center justify-center text-white transition-all shadow-lg shadow-primary-900/30"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {vaults.map((vault: Vault) => (
          <div 
            key={vault.id} 
            onClick={() => navigate(`/items?vault=${vault.id}`)}
            className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl p-3 cursor-pointer transition-all group relative flex flex-col"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg bg-gray-800 text-primary-400 group-hover:bg-gray-750 transition-colors`}>
                    <VaultIcon name={vault.icon} size={20} />
                  </div>
                  <div>
                      <h3 className="text-base font-semibold text-white leading-tight">{vault.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{vault.itemCount} items</p>
                  </div>
              </div>

              <div className="flex items-center gap-1">
                  {vault.isShared && (
                      <span className="px-1.5 py-0.5 bg-primary-900/30 text-primary-300 text-[9px] uppercase font-bold rounded tracking-wider border border-primary-500/20">Shared</span>
                  )}
                  <button 
                    onClick={(e) => toggleMenu(e, vault.id)}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                      <MoreVertical size={16} />
                  </button>
              </div>
            </div>
            
            {/* Context Menu */}
            {menuOpenId === vault.id && (
                <div className="absolute top-10 right-2 z-20 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-fade-in">
                    <button onClick={(e) => openModal(e, vault)} className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                        <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={(e) => openShareModal(e, vault)} className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                        <Share2 size={12} /> Share
                    </button>
                    <div className="h-px bg-gray-700 my-0.5"></div>
                    <button onClick={(e) => confirmDelete(e, vault.id)} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 flex items-center gap-2">
                        <Trash2 size={12} /> Delete
                    </button>
                </div>
            )}
            
            <p className="text-xs text-gray-500 mb-2 line-clamp-2 min-h-[20px]">{vault.description || "No description provided."}</p>
            
            {/* Merged Footer into Card Body */}
            <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] text-gray-600 font-medium">Last updated today</span>
                <ChevronRight size={14} className="text-gray-700 group-hover:text-primary-400 transition-colors opacity-50 group-hover:opacity-100" />
            </div>
          </div>
        ))}
        
        {/* Add New Vault Compact Card */}
        <button 
            onClick={(e) => openModal(e, null)}
            className="border border-dashed border-gray-800 hover:border-primary-500/50 bg-gray-900/20 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-primary-400 transition-all min-h-[140px]"
        >
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Plus size={20} />
            </div>
            <span className="text-sm font-medium">New Vault</span>
        </button>
      </div>
      
      {/* Quick Access (Favorites) */}
      <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Star size={16} className="text-yellow-500 fill-yellow-500" />
              Quick Access
          </h3>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
               {favorites.map(item => (
                   <div 
                      key={item.id}
                      onClick={() => navigate(`/items/${item.id}`)}
                      className="bg-gray-900 border border-gray-800 hover:border-gray-700 p-3 rounded-xl cursor-pointer hover:bg-gray-850 transition-colors group flex items-center gap-3"
                   >
                       <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                           <ItemTypeIcon type={item.type} />
                       </div>
                       <div className="overflow-hidden">
                           <h4 className="text-sm font-medium text-white truncate">{item.name}</h4>
                           <p className="text-xs text-gray-500 truncate">{item.data.username || item.type}</p>
                       </div>
                   </div>
               ))}
            </div>
          ) : (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                     <Star size={20} className="opacity-20" />
                     No favorites yet. Add items to favorites for quick access.
                 </div>
             </div>
          )}
      </div>
    </div>
  );
};

export default Dashboard;