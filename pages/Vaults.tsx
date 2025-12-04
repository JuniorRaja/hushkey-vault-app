import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Vault as VaultIcon, MoreVertical, Edit2, Trash2, Share2, Star, Globe, CreditCard, StickyNote, Wifi, User, Landmark, RectangleHorizontal, Database, Server, Terminal, IdCard, FileText, Folder, Briefcase, Shield } from 'lucide-react';
import { useVaultStore } from '../src/stores/vaultStore';
import { Vault } from '../types';
import VaultModal from '../components/VaultModal';
import ShareModal from '../components/ShareModal';
import ConfirmationModal from '../components/ConfirmationModal';

const ItemTypeIcon = ({ type, size = 20 }: { type: string, size?: number }) => {
  switch(type) {
    case 'LOGIN': return <Globe className="text-blue-400" size={size} />;
    case 'CARD': return <CreditCard className="text-green-400" size={size} />;
    case 'NOTE': return <StickyNote className="text-yellow-400" size={size} />;
    case 'WIFI': return <Wifi className="text-purple-400" size={size} />;
    case 'IDENTITY': return <User className="text-pink-400" size={size} />;
    case 'BANK': return <Landmark className="text-emerald-400" size={size} />;

    case 'DATABASE': return <Database className="text-cyan-400" size={size} />;
    case 'SERVER': return <Server className="text-indigo-400" size={size} />;
    case 'SSH_KEY': return <Terminal className="text-slate-400" size={size} />;
    case 'ID_CARD': return <IdCard className="text-teal-400" size={size} />;
    case 'FILE': return <FileText className="text-rose-400" size={size} />;
    default: return <FileText className="text-gray-400" size={size} />;
  }
};

const VaultIconComponent = ({ iconName, size = 20 }: { iconName: string, size?: number }) => {
  switch(iconName) {
    case 'Folder': return <Folder size={size} />;
    case 'Briefcase': return <Briefcase size={size} />;
    case 'CreditCard': return <CreditCard size={size} />;
    case 'User': return <User size={size} />;
    case 'Shield': return <Shield size={size} />;
    default: return <Folder size={size} />;
  }
};

const Vaults: React.FC = () => {
  const navigate = useNavigate();
  const { vaults, loadVaults, deleteVault, favoriteItems, loadFavoriteItems, isLoading } = useVaultStore();
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<Vault | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareVault, setShareVault] = useState<Vault | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteWithItems, setDeleteWithItems] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadVaults();
    loadFavoriteItems();
  }, []);

  const activeVaults = useMemo(() => vaults.filter(v => !v.deletedAt), [vaults]);

  const handleCreateVault = () => {
    setEditingVault(null);
    setIsVaultModalOpen(true);
  };

  const handleModalClose = () => {
    setIsVaultModalOpen(false);
    setEditingVault(null);
    loadVaults();
  };

  const handleEditVault = (vault: Vault) => {
    setEditingVault(vault);
    setIsVaultModalOpen(true);
    setMenuOpenId(null);
  };

  const handleShareVault = (vault: Vault) => {
    setShareVault(vault);
    setIsShareModalOpen(true);
    setMenuOpenId(null);
  };

  const handleDeleteVault = (vaultId: string) => {
    setDeleteTarget(vaultId);
    setMenuOpenId(null);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteVault(deleteTarget);
      setDeleteTarget(null);
      setDeleteWithItems(false);
      loadVaults();
    }
  };

  const getDeleteMessage = () => {
    const vault = vaults.find(v => v.id === deleteTarget);
    if (!vault) return "This vault will be moved to Trash.";
    
    if (vault.itemCount > 0) {
      return `This vault contains ${vault.itemCount} item${vault.itemCount > 1 ? 's' : ''}. All items will also be moved to Trash. You can restore them later.`;
    }
    return "This vault will be moved to Trash. You can restore it later.";
  };

  return (
    <div className="h-full flex flex-col">
      <VaultModal
        isOpen={isVaultModalOpen}
        onClose={handleModalClose}
        vault={editingVault}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareVault(null);
        }}
        item={shareVault}
        type="vault"
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteWithItems(false);
        }}
        onConfirm={confirmDelete}
        title="Delete Vault?"
        message={getDeleteMessage()}
        confirmText="Move to Trash"
        type="warning"
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Vaults</h2>
          <p className="text-gray-400 text-sm">{activeVaults.length} vaults</p>
        </div>
        <button
          onClick={handleCreateVault}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-900/30"
        >
          <Plus size={18} />
          <span className="hidden md:inline">Create Vault</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-20 md:pb-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-gray-800"></div>
                  <div>
                    <div className="h-4 w-24 bg-gray-800 rounded mb-2"></div>
                    <div className="h-3 w-16 bg-gray-800 rounded"></div>
                  </div>
                </div>
                <div className="w-6 h-6 bg-gray-800 rounded"></div>
              </div>
              <div className="h-3 w-full bg-gray-800 rounded mb-1"></div>
              <div className="h-3 w-3/4 bg-gray-800 rounded mb-2"></div>
              <div className="h-2 w-20 bg-gray-800 rounded mt-auto"></div>
            </div>
          ))}
        </div>
      ) : activeVaults.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <VaultIcon size={32} />
          </div>
          <p className="text-lg font-medium text-gray-300">No vaults yet</p>
          <p className="text-sm mb-6">Create your first vault to organize items</p>
          <button
            onClick={handleCreateVault}
            className="text-primary-400 font-medium hover:underline"
          >
            Create vault
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-20 md:pb-0">
          {activeVaults.map((vault) => (
            <div
              key={vault.id}
              onClick={() => navigate(`/items?vault=${vault.id}`)}
              className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl p-3 cursor-pointer transition-all group relative flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-gray-800 group-hover:bg-gray-750 transition-colors">
                    <VaultIconComponent iconName={vault.icon} size={20} />
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === vault.id ? null : vault.id);
                    }}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>

              {menuOpenId === vault.id && (
                <div className="absolute top-10 right-2 z-20 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-fade-in">
                  <button onClick={(e) => { e.stopPropagation(); handleEditVault(vault); }} className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                    <Edit2 size={12} /> Edit
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleShareVault(vault); }} className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2">
                    <Share2 size={12} /> Share
                  </button>
                  <div className="h-px bg-gray-700 my-0.5"></div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteVault(vault.id); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 flex items-center gap-2">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500 mb-2 line-clamp-2 min-h-[20px]">{vault.description || "No description provided."}</p>

              <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] text-gray-600 font-medium">Last updated today</span>
              </div>
            </div>
          ))}
          
          {/* Add New Vault Card */}
          <button
            onClick={handleCreateVault}
            className="border border-dashed border-gray-800 hover:border-primary-500/50 bg-gray-900/20 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-primary-400 transition-all min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mb-1 hover:scale-110 transition-transform">
              <Plus size={20} />
            </div>
            <span className="text-sm font-medium">New Vault</span>
          </button>
        </div>
      )}

      {/* Quick Access Section */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star size={16} className="text-yellow-500 fill-yellow-500" />
          Quick Access
        </h3>
        {favoriteItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {favoriteItems.map(item => (
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
                  <p className="text-xs text-gray-500 truncate">{item.data?.username || item.type}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center text-xs text-gray-500 flex flex-col items-center gap-2">
            <Star size={20} className="opacity-20" />
            No favorites yet. Add items to favorites for quick access.
          </div>
        )}
      </div>

      <button
        onClick={handleCreateVault}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary-600 text-white rounded-full shadow-xl flex items-center justify-center z-40 transition-transform active:scale-95"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default Vaults;
