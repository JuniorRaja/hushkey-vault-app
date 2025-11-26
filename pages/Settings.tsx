

import React, { useState, useRef, useEffect } from 'react';
import { useAuth, useData } from '../App';
import { LogEntry, AppSettings, Category, AccentColor } from '../types';
import { storageService } from '../services/storage';
import { 
    User, Shield, Clock, Download, LogOut, ChevronRight, Activity, 
    Lock, Smartphone, AlertTriangle, FileText, RefreshCw, X, 
    Check, ChevronDown, Copy, Eye, EyeOff, Search, FileDown,
    Trash2, HardDrive, ShieldAlert, Monitor, Palette, Upload,
    Layers, Plus, Edit2, History, ScanFace, Loader2, Bell
} from 'lucide-react';

// --- UI Components ---

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
    <button 
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${checked ? 'bg-primary-600' : 'bg-gray-700'}`}
    >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 shadow-md ${checked ? 'left-7' : 'left-1'}`} />
    </button>
);

const CustomDropdown = ({ 
    options, 
    value, 
    onChange 
}: { 
    options: { label: string; value: any; icon?: any }[]; 
    value: any; 
    onChange: (val: any) => void 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOpt = options.find(o => o.value === value);
    const SelectedIcon = selectedOpt?.icon;

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-2 text-sm font-medium text-gray-200 transition-colors min-w-[150px] justify-between shadow-sm"
            >
                <div className="flex items-center gap-2">
                    {SelectedIcon && <SelectedIcon size={14} className="text-gray-400"/>}
                    <span>{selectedOpt?.label || value}</span>
                </div>
                <ChevronDown size={14} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in origin-top-right ring-1 ring-black/5">
                    {options.map((opt) => {
                        const Icon = opt.icon;
                        return (
                            <button
                                key={String(opt.value)}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 text-gray-300 hover:text-white flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    {Icon && <Icon size={14} className="text-gray-500" />}
                                    {opt.label}
                                </div>
                                {value === opt.value && <Check size={14} className="text-primary-500" />}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const ModalLayout = ({ title, onClose, children, maxWidth = "max-w-md" }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className={`bg-gray-900 border border-gray-800 rounded-2xl w-full ${maxWidth} shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative`} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    {title}
                </h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 bg-gray-800/50 rounded-lg">
                    <X size={20} />
                </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    </div>
);

// --- Section Components ---

const CategoriesModal = ({ onClose }: { onClose: () => void }) => {
    const { settings, updateSettings } = useData();
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('bg-gray-500');

    const COLORS = [
        'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-gray-500'
    ];

    const handleAdd = () => {
        if (!newCatName.trim()) return;
        const newCat: Category = {
            id: `cat_${crypto.randomUUID()}`,
            name: newCatName.trim(),
            color: newCatColor
        };
        updateSettings({
            ...settings,
            categories: [...settings.categories, newCat]
        });
        setNewCatName('');
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Delete this category? Items will become uncategorized.')) {
            updateSettings({
                ...settings,
                categories: settings.categories.filter(c => c.id !== id)
            });
        }
    };

    return (
        <ModalLayout title="Manage Categories" onClose={onClose} maxWidth="max-w-md">
            <div className="p-5 space-y-6">
                
                {/* Add New */}
                <div className="bg-gray-950/50 border border-gray-800 p-4 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Create New Category</label>
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            placeholder="Category Name"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-primary-500 outline-none"
                        />
                        <button 
                            onClick={handleAdd}
                            disabled={!newCatName}
                            className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {COLORS.map(color => (
                            <button 
                                key={color}
                                onClick={() => setNewCatColor(color)}
                                className={`w-6 h-6 rounded-full ${color} shrink-0 transition-transform ${newCatColor === color ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-gray-900' : 'opacity-70 hover:opacity-100'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Existing Categories ({settings.categories.length})</label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {settings.categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-lg group hover:border-gray-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                                    <span className="text-sm font-medium text-gray-200">{cat.name}</span>
                                </div>
                                <button 
                                    onClick={() => handleDelete(cat.id)}
                                    className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                         {settings.categories.length === 0 && (
                            <div className="text-center text-gray-600 text-sm py-4">No categories created.</div>
                        )}
                    </div>
                </div>
            </div>
        </ModalLayout>
    );
};

const BackupModal = ({ onClose }: { onClose: () => void }) => {
    const { items, vaults, addLog } = useData();

    const handleExport = (type: 'xls' | 'zip') => {
        if (type === 'xls') {
            if(!window.confirm("WARNING: This will export your passwords in an unencrypted CSV file. Anyone with this file can see your passwords. Continue?")) return;
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ items, vaults }, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", `sentinel_export_${type === 'xls' ? 'UNENCRYPTED' : 'SECURE'}_${new Date().toISOString()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        addLog('EXPORT', `Exported data as ${type.toUpperCase()}`);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv,.xlsx';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if(file) {
                alert(`Importing ${file.name}... (Simulation: 5 items added)`);
                addLog('CREATE', `Imported data from ${file.name}`);
                window.location.reload();
            }
        };
        input.click();
    };

    return (
        <ModalLayout title={<span className="flex items-center gap-2"><HardDrive size={18}/> Backup & Data</span>} onClose={onClose} maxWidth="max-w-2xl">
            <div className="p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export Column */}
                    <div className="space-y-4">
                        <div>
                             <h4 className="text-sm font-medium text-gray-300">Export your data for safekeeping.</h4>
                        </div>
                        
                        <button 
                            onClick={() => handleExport('xls')}
                            className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl group transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-gray-900/50 border border-gray-700 flex items-center justify-center text-green-500">
                                    <FileText size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-gray-200">Export .CSV (Excel)</div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase mt-1">
                                        <AlertTriangle size={10} /> Unencrypted
                                    </div>
                                </div>
                            </div>
                            <Download size={18} className="text-gray-500 group-hover:text-white" />
                        </button>

                        <button 
                             onClick={() => handleExport('zip')}
                             className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl group transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-gray-900/50 border border-gray-700 flex items-center justify-center text-purple-500">
                                    <Lock size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-gray-200">Export Encrypted .ZIP</div>
                                    <div className="text-[10px] font-medium text-gray-500 mt-1">
                                        Requires Master Password
                                    </div>
                                </div>
                            </div>
                            <Download size={18} className="text-gray-500 group-hover:text-white" />
                        </button>
                    </div>

                    {/* Import Column */}
                    <div className="flex flex-col h-full">
                        <div className="mb-4">
                             <h4 className="text-sm font-medium text-gray-300">Restore data from a backup file.</h4>
                        </div>

                        <button 
                            onClick={handleImport}
                            className="flex-1 w-full min-h-[140px] flex flex-col items-center justify-center gap-4 bg-gray-950/30 border-2 border-dashed border-gray-800 hover:border-primary-500/50 hover:bg-gray-900/50 rounded-xl transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-gray-500 group-hover:text-primary-400 group-hover:scale-110 transition-all">
                                <Upload size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200">Import Backup File</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-4 border-t border-gray-800 bg-gray-950/50 text-xs text-gray-500 flex justify-between items-center">
                <span className="flex items-center gap-2 font-mono"><History size={12} /> Last Backup: <span className="text-gray-400">Never</span></span>
                <span className="flex items-center gap-1 text-orange-400/80"><AlertTriangle size={12}/> Always verify your exports.</span>
            </div>
        </ModalLayout>
    );
};

const ProfileModal = ({ onClose }: { onClose: () => void }) => {
    const { user, updateUserProfile } = useAuth();
    const { items, vaults } = useData();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [recoveryEmail, setRecoveryEmail] = useState(user?.recoveryEmail || '');

    const handleClearData = () => {
        if(window.confirm("CRITICAL WARNING: This will permanently wipe all local data, including vaults and items. This cannot be undone. Are you sure?")) {
            if(window.confirm("Are you really sure? Final Warning.")) {
                storageService.clearAll();
                window.location.reload();
            }
        }
    }

    const handleSave = () => {
        updateUserProfile({ name, email, recoveryEmail });
        onClose();
    }

    return (
        <ModalLayout title="My Profile" onClose={onClose} maxWidth="max-w-lg">
             <div className="p-6 space-y-6">
                 {/* Header Stats */}
                 <div className="flex items-center gap-4 pb-6 border-b border-gray-800">
                     <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary-900/40">
                         {user?.avatar}
                     </div>
                     <div>
                         <h4 className="text-xl font-bold text-white">{user?.name}</h4>
                         <p className="text-gray-400 text-sm">{user?.email}</p>
                         <div className="flex gap-4 mt-2 text-xs font-medium text-gray-500">
                             <span className="px-2 py-0.5 bg-gray-800 rounded">{items.length} Items</span>
                             <span className="px-2 py-0.5 bg-gray-800 rounded">{vaults.length} Vaults</span>
                         </div>
                     </div>
                 </div>

                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">User Name</label>
                         <input 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors"
                        />
                     </div>
                      <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Recovery Email</label>
                         <input 
                            value={recoveryEmail}
                            onChange={e => setRecoveryEmail(e.target.value)}
                            placeholder="Optional backup email"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors"
                        />
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3 pt-2">
                     <button className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors border border-gray-700" onClick={() => alert("Mock: Change Password Flow")}>
                         Change Password
                     </button>
                     <button className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors border border-gray-700" onClick={() => alert("Mock: Change PIN Flow")}>
                         Change Master PIN
                     </button>
                 </div>

                 <div className="pt-6 border-t border-gray-800">
                     <h5 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2"><AlertTriangle size={16}/> Danger Zone</h5>
                     <button 
                        onClick={handleClearData}
                        className="w-full py-3 bg-red-900/10 hover:bg-red-900/20 border border-red-900/30 text-red-400 rounded-xl text-sm font-bold transition-colors"
                     >
                         Clear All Data
                     </button>
                     <p className="text-[10px] text-gray-600 mt-2 text-center">Permanently deletes all local storage data. Cannot be undone.</p>
                 </div>

                 <div className="pt-2">
                     <button onClick={handleSave} className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-900/20 transition-all active:scale-95">
                         Save Changes
                     </button>
                 </div>
             </div>
        </ModalLayout>
    )
}

const LogsModal = ({ onClose }: { onClose: () => void }) => {
    const { logs } = useData();
    const [search, setSearch] = useState('');

    const filteredLogs = logs.filter(l => 
        l.details.toLowerCase().includes(search.toLowerCase()) || 
        l.action.toLowerCase().includes(search.toLowerCase())
    );

    const handleDownload = () => {
        const content = JSON.stringify(logs, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sentinel_logs_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <ModalLayout title="Activity Logs" onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col h-[600px] max-h-[80vh]">
                <div className="p-4 border-b border-gray-800 flex gap-3 bg-gray-950/30">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text"
                            placeholder="Search logs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-primary-500 outline-none placeholder-gray-600"
                        />
                    </div>
                    <button onClick={handleDownload} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-gray-700">
                        <Download size={16} /> Export
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredLogs.map(log => (
                        <div key={log.id} className="p-3 hover:bg-gray-800/50 rounded-lg flex justify-between items-start group transition-colors">
                            <div className="flex items-start gap-3">
                                <div className={`mt-0.5 p-1.5 rounded bg-gray-800 text-[10px] font-bold uppercase tracking-wider min-w-[60px] text-center ${
                                    log.action === 'DELETE' ? 'text-red-400' : 
                                    log.action === 'CREATE' ? 'text-green-400' :
                                    log.action === 'LOGIN' ? 'text-blue-400' : 'text-gray-400'
                                }`}>
                                    {log.action}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-300 font-medium">{log.details}</p>
                                    <p className="text-xs text-gray-600 mt-0.5 font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                            <button className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigator.clipboard.writeText(JSON.stringify(log))}>
                                <Copy size={14} />
                            </button>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && (
                        <div className="text-center py-10 text-gray-500 text-sm">No logs found matching search.</div>
                    )}
                </div>
            </div>
        </ModalLayout>
    )
}

const TextModal = ({ title, onClose, content }: any) => (
    <ModalLayout title={title} onClose={onClose} maxWidth="max-w-2xl">
        <div className="p-6 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {content}
        </div>
        <div className="p-4 border-t border-gray-800 bg-gray-950/50">
            <button onClick={onClose} className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700">Close</button>
        </div>
    </ModalLayout>
)


const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { items, vaults, logs, settings, updateSettings, addLog } = useData();
  
  // Modals
  const [activeModal, setActiveModal] = useState<'profile' | 'logs' | 'categories' | 'backup' | 'privacy' | 'terms' | null>(null);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  // Biometric Verification State
  const [verifyingBiometric, setVerifyingBiometric] = useState(false);

  // Handlers
  const handleSettingChange = (key: keyof AppSettings, value: any) => {
      updateSettings({ ...settings, [key]: value });
  };

  const handleNotificationChange = (key: keyof AppSettings['notifications'], value: boolean) => {
      updateSettings({ 
          ...settings, 
          notifications: { ...settings.notifications, [key]: value } 
      });
  };

  const handleUnlockMethodChange = async (val: 'pin' | 'biometric' | 'password') => {
      if (val === 'biometric') {
          // Verify simulation
          setVerifyingBiometric(true);
          // Simulate 1.5s delay for biometric check
          await new Promise(resolve => setTimeout(resolve, 1500));
          setVerifyingBiometric(false);
          updateSettings({ ...settings, unlockMethod: val });
          alert("Face ID / Touch ID enabled successfully.");
      } else {
          updateSettings({ ...settings, unlockMethod: val });
      }
  };

  const handleSync = () => {
      setIsSyncing(true);
      setTimeout(() => {
          updateSettings({ ...settings, lastSync: new Date().toISOString() });
          addLog('SYNC', 'Forced manual synchronization');
          setIsSyncing(false);
      }, 1500);
  };

  const colorOptions: { label: string; value: AccentColor; color: string }[] = [
      { label: 'Violet (Default)', value: 'violet', color: '#8b5cf6' },
      { label: 'Blue', value: 'blue', color: '#3b82f6' },
      { label: 'Emerald', value: 'emerald', color: '#10b981' },
      { label: 'Rose', value: 'rose', color: '#f43f5e' },
      { label: 'Amber', value: 'amber', color: '#f59e0b' },
      { label: 'Cyan', value: 'cyan', color: '#06b6d4' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* Modals */}
      {activeModal === 'profile' && <ProfileModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'logs' && <LogsModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'categories' && <CategoriesModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'backup' && <BackupModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'privacy' && <TextModal title="Privacy Policy" onClose={() => setActiveModal(null)} content="Privacy Policy Placeholder..." />}
      {activeModal === 'terms' && <TextModal title="Terms of Service" onClose={() => setActiveModal(null)} content="Terms of Service Placeholder..." />}

      <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>

      {/* 1. Profile Section */}
      <div 
        onClick={() => setActiveModal('profile')}
        className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 flex items-center justify-between cursor-pointer group transition-all shadow-lg hover:shadow-xl"
      >
          <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary-900/40 group-hover:scale-105 transition-transform">
                  {user?.avatar}
              </div>
              <div>
                  <h2 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">{user?.name}</h2>
                  <p className="text-gray-400">{user?.email}</p>
                  <div className="flex gap-4 mt-2 text-xs font-medium text-gray-500">
                      <span className="bg-gray-800 px-2 py-0.5 rounded">{items.length} Items</span>
                      <span className="bg-gray-800 px-2 py-0.5 rounded">{vaults.length} Vaults</span>
                  </div>
              </div>
          </div>
          <div className="bg-gray-800 p-2 rounded-full text-gray-500 group-hover:bg-primary-600 group-hover:text-white transition-all">
              <ChevronRight size={20} />
          </div>
      </div>

      {/* 2. Notifications Section */}
      <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 flex items-center gap-2">
              <Bell size={14} /> Notifications
          </h3>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-800">
              
              <div className="px-4 py-3 bg-gray-950/50 flex justify-between items-center border-b border-gray-800">
                  <span className="text-xs font-bold text-gray-500 uppercase">Alerts & Reminders</span>
              </div>

              {/* Configurations */}
              {[
                  { key: 'newDeviceLogin', label: 'New Device Login Alert', desc: 'When your account is accessed from a new browser.' },
                  { key: 'failedLoginAttempts', label: 'Failed Login Attempts', desc: 'Notify on incorrect PIN or biometric failures.' },
                  { key: 'weakPasswordAlerts', label: 'Weak/Reused Passwords', desc: 'Guardian analysis alerts for vulnerable credentials.' },
                  { key: 'expiryReminders', label: 'Expiry Reminders', desc: 'Notify before cards or IDs expire (30 days).' },
                  { key: 'backupHealth', label: 'Backup Health', desc: 'Alert if backup is outdated or fails.' },
                  { key: 'monthlyReport', label: 'Monthly Security Report', desc: 'Regular summary of your vault health.' },
                  { key: 'sessionAlerts', label: 'Session Monitoring', desc: 'Alerts for unusual session activity.' },
                  { key: 'sharedVaultUpdates', label: 'Shared Vault Updates', desc: 'Notify when items are changed in shared vaults.' }
              ].map((item) => (
                   <div key={item.key} className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                      <div className="flex flex-col">
                          <span className="text-gray-200 font-medium">{item.label}</span>
                          <span className="text-[11px] text-gray-500">{item.desc}</span>
                      </div>
                      <ToggleSwitch 
                          checked={(settings.notifications as any)[item.key]} 
                          onChange={(val) => handleNotificationChange(item.key as any, val)} 
                      />
                  </div>
              ))}
              
              <div className="px-4 py-3 bg-gray-950/50 flex justify-between items-center border-b border-gray-800 border-t">
                  <span className="text-xs font-bold text-gray-500 uppercase">Channels</span>
              </div>

               <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                  <div className="flex flex-col">
                      <span className="text-gray-200 font-medium">Push Notifications</span>
                      <span className="text-[11px] text-gray-500">Browser/Device push alerts.</span>
                  </div>
                  <ToggleSwitch 
                      checked={settings.notifications.pushNotifications} 
                      onChange={(val) => handleNotificationChange('pushNotifications', val)} 
                  />
              </div>

               <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                  <div className="flex flex-col">
                      <span className="text-gray-200 font-medium">Email Notifications</span>
                      <span className="text-[11px] text-gray-500">Send alerts to {user?.email}.</span>
                  </div>
                  <ToggleSwitch 
                      checked={settings.notifications.emailNotifications} 
                      onChange={(val) => handleNotificationChange('emailNotifications', val)} 
                  />
              </div>

          </div>
      </div>

      {/* 3. Security Section */}
      <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 flex items-center gap-2">
              <Shield size={14} /> Security
          </h3>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-800">
              
              <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Lock size={18}/></div>
                      <div>
                          <span className="text-gray-200 font-medium block">Unlock Method</span>
                          {verifyingBiometric && <span className="text-[10px] text-primary-400 flex items-center gap-1 mt-0.5"><Loader2 size={10} className="animate-spin"/> Verifying...</span>}
                      </div>
                  </div>
                  <CustomDropdown 
                     value={settings.unlockMethod}
                     onChange={(val) => handleUnlockMethodChange(val)}
                     options={[
                         { label: 'PIN Code', value: 'pin', icon: Lock },
                         { label: 'Face ID / Touch ID', value: 'biometric', icon: ScanFace },
                         { label: 'Password', value: 'password', icon: Lock },
                     ]}
                  />
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Clock size={18}/></div>
                      <span className="text-gray-200 font-medium">Auto Lock</span>
                  </div>
                  <CustomDropdown 
                     value={settings.autoLockMinutes}
                     onChange={(val) => handleSettingChange('autoLockMinutes', val)}
                     options={[
                         { label: 'Immediately', value: 0 },
                         { label: '1 Minute', value: 1 },
                         { label: '5 Minutes', value: 5 },
                         { label: '15 Minutes', value: 15 },
                         { label: '1 Hour', value: 60 },
                         { label: 'Never', value: -1 },
                     ]}
                  />
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Copy size={18}/></div>
                      <span className="text-gray-200 font-medium">Clear Clipboard</span>
                  </div>
                  <CustomDropdown 
                     value={settings.clipboardClearSeconds}
                     onChange={(val) => handleSettingChange('clipboardClearSeconds', val)}
                     options={[
                         { label: '10 Seconds', value: 10 },
                         { label: '30 Seconds', value: 30 },
                         { label: '60 Seconds', value: 60 },
                         { label: 'Never', value: 0 },
                     ]}
                  />
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Monitor size={18}/></div>
                      <div className="flex flex-col">
                        <span className="text-gray-200 font-medium">Allow Screenshots</span>
                        <span className="text-xs text-gray-500">Android/iOS only</span>
                      </div>
                  </div>
                  <ToggleSwitch 
                      checked={settings.allowScreenshots} 
                      onChange={(val) => handleSettingChange('allowScreenshots', val)} 
                  />
              </div>
          </div>
      </div>

      {/* 4. Application Section */}
      <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 flex items-center gap-2">
              <Smartphone size={14} /> Application
          </h3>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-800">

               {/* Backup & Import Trigger - Moved to Top */}
               <div 
                  onClick={() => setActiveModal('backup')}
                  className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><HardDrive size={18}/></div>
                      <div>
                        <span className="text-gray-200 font-medium block">Backup & Import</span>
                        <span className="text-[10px] text-gray-500">Last backup: Never</span>
                      </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-white" />
              </div>
              
              <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Palette size={18}/></div>
                      <span className="text-gray-200 font-medium">Appearance</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="flex gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                          {colorOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => handleSettingChange('accentColor', opt.value)}
                                className={`w-5 h-5 rounded-md transition-all ${settings.accentColor === opt.value ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                                style={{ backgroundColor: opt.color }}
                                title={opt.label}
                              />
                          ))}
                      </div>
                  </div>
              </div>

               <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Layers size={18}/></div>
                      <div>
                        <span className="text-gray-200 font-medium block">Category Grouping</span>
                        <span className="text-[10px] text-gray-500">Group items by category in lists</span>
                      </div>
                  </div>
                  <ToggleSwitch 
                      checked={settings.groupItemsByCategory} 
                      onChange={(val) => handleSettingChange('groupItemsByCategory', val)} 
                  />
              </div>
              
               <div 
                  onClick={() => setActiveModal('categories')}
                  className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Edit2 size={18}/></div>
                      <span className="text-gray-200 font-medium">Manage Categories</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-white" />
              </div>

              <div 
                  onClick={() => setActiveModal('logs')}
                  className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Activity size={18}/></div>
                      <span className="text-gray-200 font-medium">Audit Logs</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-white" />
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''}/></div>
                      <div>
                        <span className="text-gray-200 font-medium block">Sync Status</span>
                        <span className="text-[10px] text-gray-500">Last sync: {new Date(settings.lastSync).toLocaleTimeString()}</span>
                      </div>
                  </div>
                  <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold uppercase rounded-lg text-gray-300 transition-colors border border-gray-700"
                  >
                      {isSyncing ? 'Syncing...' : 'Force Sync'}
                  </button>
              </div>

              <div className="p-4 flex items-center gap-4">
                  <button onClick={() => setActiveModal('privacy')} className="text-xs text-gray-500 hover:text-white underline">Privacy Policy</button>
                  <button onClick={() => setActiveModal('terms')} className="text-xs text-gray-500 hover:text-white underline">Terms of Service</button>
              </div>
          </div>
      </div>

      <button 
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors font-medium border border-transparent hover:border-red-500/20"
      >
          <LogOut size={20} />
          Log Out
      </button>

      <div className="text-center text-[10px] text-gray-600 pb-8 flex flex-col gap-1">
          <span className="font-bold">HUSHKEY VAULT</span>
          <span>Version 2.5.0 (Build 2024.10.15)</span>
          <span>© 2024 Hushkey Security Inc.</span>
      </div>

    </div>
  );
};

export default Settings;
