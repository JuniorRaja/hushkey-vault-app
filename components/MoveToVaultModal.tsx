import React from 'react';
import { X, Layers, Folder, Briefcase, CreditCard, User, Shield } from 'lucide-react';
import { Vault } from '../types';

interface MoveToVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (vaultId: string) => void;
  currentVaultId: string;
  vaults: Vault[];
}

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

const MoveToVaultModal: React.FC<MoveToVaultModalProps> = ({ isOpen, onClose, onMove, currentVaultId, vaults }) => {
  if (!isOpen) return null;

  const availableVaults = vaults.filter(v => v.id !== currentVaultId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Move to Vault</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
          {availableVaults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Layers size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No other vaults available</p>
            </div>
          ) : (
            availableVaults.map(vault => (
              <button
                key={vault.id}
                onClick={() => onMove(vault.id)}
                className="w-full flex items-center gap-3 p-4 bg-gray-950 hover:bg-gray-800 border border-gray-800 hover:border-primary-500/50 rounded-xl transition-all text-left group"
              >
                <div className="p-2.5 rounded-lg bg-gray-800 text-gray-400 group-hover:text-primary-400 transition-colors">
                  <VaultIconComponent iconName={vault.icon} size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white group-hover:text-primary-400 transition-colors">{vault.name}</div>
                  {vault.description && <div className="text-xs text-gray-500 mt-0.5">{vault.description}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MoveToVaultModal;
