import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, FileText, Folder } from 'lucide-react';
import { useTrashStore } from '../src/stores/trashStore';
import { useAuthStore } from '../src/stores/authStore';
import DatabaseService from '../src/services/database';
import ConfirmationModal from '../components/ConfirmationModal';

const Trash: React.FC = () => {
  const { deletedItems, deletedVaults, loadTrash, restoreItem, restoreVault, permanentDeleteItem, permanentDeleteVault, emptyTrash, isLoading } = useTrashStore();
  const [activeTab, setActiveTab] = useState<'items' | 'vaults'>('items');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'item' | 'vault' } | null>(null);
  const [restoreVaultTarget, setRestoreVaultTarget] = useState<string | null>(null);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const [autoDeleteDays, setAutoDeleteDays] = useState(30);

  useEffect(() => {
    const fetchAutoDeleteDays = async () => {
      const { user } = useAuthStore.getState();
      if (user) {
        const days = await DatabaseService.getAutoDeleteDays(user.id);
        setAutoDeleteDays(days);
      }
    };
    fetchAutoDeleteDays();
  }, []);

  const getDaysRemaining = (deletedAt?: string) => {
    if (!deletedAt) return autoDeleteDays;
    const deletedDate = new Date(deletedAt);
    const expireDate = new Date(deletedDate);
    expireDate.setDate(deletedDate.getDate() + autoDeleteDays);
    const now = new Date();
    const diffTime = Math.max(0, expireDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handlePermanentlyDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'vault') {
        await permanentDeleteVault(deleteTarget.id);
      } else {
        await permanentDeleteItem(deleteTarget.id);
      }
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleRestoreVault = async (restoreItems: boolean) => {
    if (!restoreVaultTarget) return;

    try {
      await restoreVault(restoreVaultTarget, restoreItems);
      setRestoreVaultTarget(null);
    } catch (error) {
      console.error('Failed to restore vault:', error);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash();
      setEmptyTrashConfirm(false);
    } catch (error) {
      console.error('Failed to empty trash:', error);
    }
  };

  const confirmDelete = (id: string, type: 'item' | 'vault') => {
    setDeleteTarget({ id, type });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="text-gray-400">Loading trash...</div>
      </div>
    );
  }

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

      <ConfirmationModal
        isOpen={!!restoreVaultTarget}
        onClose={() => setRestoreVaultTarget(null)}
        onConfirm={() => handleRestoreVault(true)}
        title="Restore Vault"
        message="Do you want to restore the vault with all its items, or just the vault?"
        confirmText="Restore Vault + Items"
      >
        <button
          onClick={() => handleRestoreVault(false)}
          className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors mt-2"
        >
          Restore Vault Only
        </button>
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={emptyTrashConfirm}
        onClose={() => setEmptyTrashConfirm(false)}
        onConfirm={handleEmptyTrash}
        title="Empty Trash?"
        message={`Permanently delete ${deletedItems.length} items and ${deletedVaults.length} vaults? This cannot be undone.`}
        confirmText="Empty Trash"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trash2 className="text-gray-400" size={24} /> Trash
          </h2>
          <p className="text-gray-400 text-sm mt-1">Items in trash will be auto-deleted based on your settings.</p>
        </div>
        
        {(deletedItems.length > 0 || deletedVaults.length > 0) && (
          <button
            onClick={() => setEmptyTrashConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Empty Trash
          </button>
        )}
        
        <div className="flex bg-gray-900 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'items' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            <FileText size={16} /> Items ({deletedItems.length})
          </button>
          <button 
            onClick={() => setActiveTab('vaults')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'vaults' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            <Folder size={16} /> Vaults ({deletedVaults.length})
          </button>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden min-h-[300px]">
        {activeTab === 'items' ? (
          deletedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Trash2 size={48} className="mb-4 opacity-50" />
              <p>Trash is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {deletedItems.map(item => (
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
          deletedVaults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Folder size={48} className="mb-4 opacity-50" />
              <p>No deleted vaults</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {deletedVaults.map(vault => (
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
                      onClick={() => setRestoreVaultTarget(vault.id)}
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