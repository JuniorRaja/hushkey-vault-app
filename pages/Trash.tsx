import React, { useState } from 'react';
import { useData } from '../App';
import { Trash2, RotateCcw, AlertCircle, FileText, Folder, Check } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Trash: React.FC = () => {
  const { trashItems, trashVaults, restoreItem, permanentlyDeleteItem, restoreVault, permanentlyDeleteVault } = useData();
  const [activeTab, setActiveTab] = useState<'items' | 'vaults'>('items');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'item' | 'vault' } | null>(null);

  const getDaysRemaining = (deletedAt?: string) => {
    if (!deletedAt) return 90;
    const deletedDate = new Date(deletedAt);
    const expireDate = new Date(deletedDate);
    expireDate.setDate(deletedDate.getDate() + 90);
    const now = new Date();
    const diffTime = Math.max(0, expireDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handlePermanentlyDelete = () => {
      if (!deleteTarget) return;

      if (deleteTarget.type === 'vault') {
          permanentlyDeleteVault(deleteTarget.id);
      } else {
          permanentlyDeleteItem(deleteTarget.id);
      }
      setDeleteTarget(null);
  };

  const confirmDelete = (id: string, type: 'item' | 'vault') => {
      setDeleteTarget({ id, type });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePermanentlyDelete}
        title="Delete Forever?"
        message="This action cannot be undone. The item will be permanently removed from your secure storage."
        confirmText="Delete Forever"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trash2 className="text-gray-400" size={24} /> Trash
            </h2>
            <p className="text-gray-400 text-sm mt-1">Items in trash will be permanently deleted after 90 days.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-gray-900 p-1 rounded-xl w-fit">
            <button 
                onClick={() => setActiveTab('items')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'items' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
                <FileText size={16} /> Items ({trashItems.length})
            </button>
            <button 
                onClick={() => setActiveTab('vaults')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'vaults' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
                <Folder size={16} /> Vaults ({trashVaults.length})
            </button>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden min-h-[300px]">
        {activeTab === 'items' ? (
            trashItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Trash2 size={48} className="mb-4 opacity-50" />
                    <p>Trash is empty</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-800">
                    {trashItems.map(item => (
                        <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-900/80 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                                    <FileText size={20} className="text-gray-400" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">{item.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span>Type: {item.type}</span>
                                        <span>•</span>
                                        <span className="text-red-400">{getDaysRemaining(item.deletedAt)} days remaining</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-end md:self-auto">
                                <button 
                                    onClick={() => restoreItem(item.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-primary-400 rounded-lg text-xs font-medium transition-colors"
                                >
                                    <RotateCcw size={14} /> Restore
                                </button>
                                <button 
                                    onClick={() => confirmDelete(item.id, 'item')}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-red-900/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                                >
                                    <Trash2 size={14} /> Delete Forever
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )
        ) : (
            trashVaults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Folder size={48} className="mb-4 opacity-50" />
                    <p>No deleted vaults</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-800">
                    {trashVaults.map(vault => (
                        <div key={vault.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-900/80 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                                    <Folder size={20} className="text-gray-400" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">{vault.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span>{vault.itemCount} items inside</span>
                                        <span>•</span>
                                        <span className="text-red-400">{getDaysRemaining(vault.deletedAt)} days remaining</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-end md:self-auto">
                                <button 
                                    onClick={() => restoreVault(vault.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-primary-400 rounded-lg text-xs font-medium transition-colors"
                                >
                                    <RotateCcw size={14} /> Restore
                                </button>
                                <button 
                                    onClick={() => confirmDelete(vault.id, 'vault')}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-red-900/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                                >
                                    <Trash2 size={14} /> Delete Forever
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )
        )}
      </div>

    </div>
  );
};

export default Trash;