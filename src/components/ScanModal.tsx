import React, { useState } from 'react';
import { X, Scan, Shield, Globe, HardDrive, Activity, Check } from 'lucide-react';

interface ScanOption {
  id: string;
  label: string;
  icon: any;
  color: string;
}

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (types: string[]) => void;
}

const ScanModal: React.FC<ScanModalProps> = ({ isOpen, onClose, onScan }) => {
  const [selected, setSelected] = useState<string[]>(['security', 'darkweb', 'storage']);
  
  if (!isOpen) return null;

  const options: ScanOption[] = [
    { id: 'security', label: 'Password Security Analysis', icon: Shield, color: 'text-blue-400' },
    { id: 'darkweb', label: 'Breach Detection (HIBP)', icon: Globe, color: 'text-red-400' },
    { id: 'storage', label: 'Storage & File Cleanup', icon: HardDrive, color: 'text-green-400' },
    { id: 'activity', label: 'Unusual Activity Scan', icon: Activity, color: 'text-orange-400' },
  ];

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Scan size={20} className="text-primary-500" /> System Scan
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-white" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-400">Select security modules to scan. Breach detection requires internet connection and may take longer.</p>
          <div className="space-y-2">
            {options.map(opt => (
              <button 
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selected.includes(opt.id) ? 'bg-primary-900/20 border-primary-500/50' : 'bg-gray-800/50 border-transparent hover:bg-gray-800'}`}
              >
                <div className={`p-2 rounded-lg bg-gray-900 ${opt.color}`}>
                  <opt.icon size={18} />
                </div>
                <span className={`flex-1 text-left font-medium ${selected.includes(opt.id) ? 'text-white' : 'text-gray-400'}`}>{opt.label}</span>
                {selected.includes(opt.id) && <Check size={16} className="text-primary-500" />}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 border-t border-gray-800 bg-gray-950/50">
          <button 
            onClick={() => onScan(selected)}
            disabled={selected.length === 0}
            className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-900/20"
          >
            Start Scan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanModal;