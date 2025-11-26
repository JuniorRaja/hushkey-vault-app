import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' 
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: { bg: 'bg-red-900/30', text: 'text-red-500', btn: 'bg-red-600 hover:bg-red-500 shadow-red-900/20' },
    warning: { bg: 'bg-yellow-900/30', text: 'text-yellow-500', btn: 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/20' },
    info: { bg: 'bg-blue-900/30', text: 'text-blue-500', btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' }
  };

  const theme = colors[type];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${theme.bg} ${theme.text}`}>
                    <AlertTriangle size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 text-gray-300 rounded-xl font-medium transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 py-3 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 ${theme.btn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ConfirmationModal;