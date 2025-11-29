import React, { useState, useEffect } from 'react';
import { X, Folder, Briefcase, CreditCard, User, Shield } from 'lucide-react';
import { Vault } from '../types';
import { useVaultStore } from '../src/stores/vaultStore';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault?: Vault | null; // If null, creating new
}

const ICONS = [
  { name: 'Folder', icon: Folder },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'User', icon: User },
  { name: 'Shield', icon: Shield },
];

const VaultModal: React.FC<VaultModalProps> = ({ isOpen, onClose, vault }) => {
  const { createVault, updateVault } = useVaultStore();
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Folder');

  // Reset or Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (vault) {
        setName(vault.name);
        setDescription(vault.description || '');
        setIcon(vault.icon);
      } else {
        setName('');
        setDescription('');
        setIcon('Folder');
      }
    }
  }, [isOpen, vault]);

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      if (vault) {
        await updateVault(vault.id, { name, description, icon });
      } else {
        await createVault(name, icon, description);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save vault:', error);
      alert('Failed to save vault. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
          <h3 className="text-lg font-bold text-white">
            {vault ? 'Edit Vault' : 'Create Vault'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
            {/* Icon Selector */}
            <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Icon</label>
            <div className="flex gap-3">
                {ICONS.map((item) => {
                const IconComp = item.icon;
                return (
                    <button
                    key={item.name}
                    onClick={() => setIcon(item.name)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        icon === item.name 
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50 scale-110' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    >
                    <IconComp size={20} />
                    </button>
                );
                })}
            </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Vault Name</label>
            <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Personal, Work, Family"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-primary-500 outline-none transition-all"
                autoFocus
            />
            </div>

            {/* Description */}
            <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
            <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's in this vault?"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:border-primary-500 outline-none transition-all h-24 resize-none"
            />
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-primary-900/30 transition-all active:scale-95"
          >
            {vault ? 'Save Changes' : 'Create Vault'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VaultModal;