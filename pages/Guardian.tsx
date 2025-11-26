
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../App';
import { useNavigate } from 'react-router-dom';
import { generatePassword, generateMemorablePassword } from '../services/passwordGenerator';
import { 
    RefreshCw, Copy, Check, ShieldAlert, ShieldCheck, Shield, 
    AlertTriangle, History, HardDrive, Smartphone, Info, 
    CreditCard, Calendar, FileWarning, Activity, Lock, Users,
    Globe, Database, Wifi, Server, Key, ArrowLeft, Scan, X,
    FileText, Image as ImageIcon, Film, Music, Box, Loader2,
    ChevronRight, ExternalLink, Lightbulb
} from 'lucide-react';

// --- Types & Interfaces ---

type KpiId = 'security_score' | 'weak_passwords' | 'reused_passwords' | 'compromised' | 'stale_passwords' | 'expiry' | 'attachments' | 'sessions' | 'backup' | 'vault_health';

interface KpiInfoData {
    title: string;
    description: string;
    bestPractices: string[];
}

const KPI_INFO: Record<string, KpiInfoData> = {
    security_score: {
        title: "Security Score",
        description: "A calculated metric representing the overall health of your vault based on password complexity, age, and uniqueness.",
        bestPractices: [
            "Aim for a score above 85.",
            "Replace all weak passwords with generated ones.",
            "Enable 2FA on all supported accounts."
        ]
    },
    weak_passwords: {
        title: "Weak Passwords",
        description: "Passwords that are too short (< 12 chars), lack complexity, or are common dictionary words.",
        bestPractices: [
            "Use passwords with at least 16 characters.",
            "Include a mix of uppercase, lowercase, numbers, and symbols.",
            "Use the built-in Password Generator."
        ]
    },
    reused_passwords: {
        title: "Reused Passwords",
        description: "Passwords that are used across multiple different accounts. If one service is breached, all others are vulnerable.",
        bestPractices: [
            "Never use the same password twice.",
            "Use the 'Duplicate' feature to create unique entries if needed, but change the password.",
            "Prioritize changing banking and email passwords first."
        ]
    },
    compromised: {
        title: "Compromised Passwords",
        description: "Credentials found in known data breaches (Dark Web monitoring).",
        bestPractices: [
            "Change these passwords IMMEDIATELY.",
            "Check if the compromised account has 2FA enabled.",
            "Verify no unauthorized transactions occurred."
        ]
    },
    expiry: {
        title: "Expiry Reminders",
        description: "Items like Credit Cards, Driver's Licenses, and Passports that have an expiration date approaching.",
        bestPractices: [
            "Renew documents 3 months before expiry.",
            "Update the vault entry immediately after receiving the new card/ID.",
            "Set reminders for critical business documents."
        ]
    },
    stale_passwords: {
        title: "Stale Passwords",
        description: "Passwords that haven't been changed in over 6 months.",
        bestPractices: [
            "Rotate critical passwords (email, banking) every 3-6 months.",
            "Use the 'Password Expiry' setting to get auto-reminders.",
            "Review old accounts to see if you still need them."
        ]
    },
    attachments: {
        title: "Vault Attachments",
        description: "Analysis of files stored within your secure vault.",
        bestPractices: [
            "Delete files you no longer need to save space.",
            "Ensure sensitive documents (tax returns, IDs) are stored here, not in unsecured folders.",
            "Periodically download and verify file integrity."
        ]
    },
    sessions: {
        title: "Active Sessions",
        description: "Devices currently logged into your Sentinel Vault account.",
        bestPractices: [
            "Log out of devices you don't recognize.",
            "Log out of public or shared computers immediately after use.",
            "Set a shorter 'Auto-lock' timer in settings."
        ]
    },
    backup: {
        title: "Backup Health",
        description: "Status of your encrypted cloud synchronization.",
        bestPractices: [
            "Ensure sync is set to 'Automatic'.",
            "Periodically export a local backup (Settings > Export) for offline safety.",
            "Verify your recovery phrase is stored securely."
        ]
    }
};

interface ScanOption {
    id: string;
    label: string;
    icon: any;
    color: string;
}

// --- Components ---

// 1. Wizard Character (SVG) - Improved
const GuardianWizard = () => (
    <div className="fixed bottom-0 left-[-20px] z-0 pointer-events-none select-none opacity-10 md:opacity-25 mix-blend-screen transition-opacity hover:opacity-40 hidden md:block">
        <svg width="400" height="400" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-float">
            <style>
                {`
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-15px); }
                    }
                    @keyframes glow {
                        0%, 100% { opacity: 0.6; filter: blur(20px); }
                        50% { opacity: 1; filter: blur(25px); }
                    }
                    .animate-float { animation: float 6s ease-in-out infinite; }
                    .wizard-glow { animation: glow 4s infinite alternate; }
                `}
            </style>
            
            {/* Background Glow */}
            <circle cx="250" cy="250" r="180" fill="#7c3aed" className="wizard-glow" fillOpacity="0.2" />

            {/* Wizard Robe */}
            <path d="M150 480 C150 480 180 200 250 150 C320 200 350 480 350 480 Z" fill="#4c1d95" stroke="#6d28d9" strokeWidth="5"/>
            <path d="M250 150 L200 480 H300 L250 150" fill="#312e81" opacity="0.5"/>
            
            {/* Shoulders/Collar */}
            <path d="M180 220 C180 220 250 180 320 220" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round"/>

            {/* Hood */}
            <path d="M250 80 C200 80 180 150 180 180 C180 240 220 260 250 280 C280 260 320 240 320 180 C320 150 300 80 250 80 Z" fill="#5b21b6" stroke="#7c3aed" strokeWidth="4"/>
            
            {/* Face (Dark Void) */}
            <ellipse cx="250" cy="190" rx="40" ry="50" fill="#0f172a"/>
            
            {/* Eyes */}
            <circle cx="235" cy="185" r="3" fill="#38bdf8" className="animate-pulse"/>
            <circle cx="265" cy="185" r="3" fill="#38bdf8" className="animate-pulse"/>

            {/* Staff */}
            <path d="M380 100 L370 480" stroke="#475569" strokeWidth="6" strokeLinecap="round"/>
            <path d="M380 100 L380 480" stroke="#94a3b8" strokeWidth="2" strokeOpacity="0.3"/>
            
            {/* Orb on Staff */}
            <circle cx="380" cy="90" r="20" fill="url(#orbGradient)"/>
            <defs>
                <radialGradient id="orbGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(380 90) rotate(90) scale(20)">
                    <stop stopColor="#f0f9ff"/>
                    <stop offset="0.5" stopColor="#0ea5e9"/>
                    <stop offset="1" stopColor="#0369a1"/>
                </radialGradient>
            </defs>
            
            {/* Magical Particles around Orb */}
            <circle cx="360" cy="70" r="2" fill="#bae6fd" className="animate-pulse" style={{animationDelay: '0.2s'}}/>
            <circle cx="400" cy="80" r="3" fill="#bae6fd" className="animate-pulse" style={{animationDelay: '0.5s'}}/>
            <circle cx="370" cy="120" r="2" fill="#bae6fd" className="animate-pulse" style={{animationDelay: '0.8s'}}/>

        </svg>
    </div>
);

// 2. Info Modal
const InfoModal = ({ isOpen, onClose, kpiId }: { isOpen: boolean, onClose: () => void, kpiId: string | null }) => {
    if (!isOpen || !kpiId) return null;
    const info = KPI_INFO[kpiId] || { title: "Details", description: "No description available.", bestPractices: [] };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm md:max-w-md shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-gray-800 flex justify-between items-start bg-gray-950">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-900/30 rounded-lg text-primary-400">
                            <Info size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">{info.title}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            {info.description}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                             <Lightbulb size={14} className="text-yellow-500" /> Best Practices
                        </h4>
                        <ul className="space-y-3">
                            {info.bestPractices.map((practice, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-sm text-gray-400">
                                    <div className="min-w-[6px] h-[6px] rounded-full bg-primary-500 mt-1.5"></div>
                                    <span>{practice}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-950 border-t border-gray-800">
                    <button 
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

// 3. Linear Vault Content Visualization
const VaultContentBar = ({ distribution, total }: { distribution: { name: string, value: number, color: string }[], total: number }) => {
    return (
        <div className="w-full space-y-3">
            <div className="flex h-4 w-full rounded-full overflow-hidden bg-gray-800">
                {distribution.map((item, idx) => (
                    <div 
                        key={idx}
                        style={{ width: `${(item.value / total) * 100}%` }}
                        className={`h-full ${item.color} transition-all duration-1000 ease-out hover:opacity-80 relative group`}
                    >
                         {/* Tooltip */}
                         <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10 border border-gray-700">
                            {item.name}: {item.value}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
                {distribution.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                        <span>{item.name}</span>
                        <span className="text-gray-600 font-mono">({Math.round((item.value/total)*100)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 4. Scan Modal
const ScanModal = ({ isOpen, onClose, onScan }: { isOpen: boolean, onClose: () => void, onScan: (types: string[]) => void }) => {
    const [selected, setSelected] = useState<string[]>(['security', 'darkweb', 'storage']);
    
    if (!isOpen) return null;

    const options: ScanOption[] = [
        { id: 'security', label: 'Password Security Analysis', icon: Shield, color: 'text-blue-400' },
        { id: 'darkweb', label: 'Dark Web Leak Check', icon: Globe, color: 'text-purple-400' },
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
                    <p className="text-sm text-gray-400">Select modules to scan. This mock process calculates your latest security scores.</p>
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

// 5. Scanning Overlay
const ScanningOverlay = ({ progress, status }: { progress: number, status: string }) => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-md animate-fade-in">
        <div className="w-24 h-24 relative mb-8">
            <svg className="animate-spin text-primary-600 w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-lg">
                {Math.round(progress)}%
            </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{status}</h2>
        <p className="text-gray-400">Please wait while we analyze your vault...</p>
    </div>
);

// 6. KPI Detail View
const KpiDetailView = ({ id, data, onBack, items }: { id: KpiId, data: any, onBack: () => void, items: any[] }) => {
    const navigate = useNavigate();

    const renderContent = () => {
        switch(id) {
            case 'security_score':
            case 'weak_passwords':
            case 'reused_passwords':
            case 'stale_passwords':
                return (
                    <div className="space-y-4">
                        {data.affectedItems && data.affectedItems.length > 0 ? (
                            data.affectedItems.map((item: any) => (
                                <div key={item.id} className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-gray-700 rounded-lg text-gray-300">
                                            {id === 'stale_passwords' ? <History size={20} /> : <Lock size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{item.name}</h4>
                                            <p className="text-xs text-gray-400">{item.data.username || 'No username'}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/items/${item.id}`)}
                                        className="text-primary-400 hover:text-white text-sm font-medium px-3 py-1.5 bg-gray-900 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors"
                                    >
                                        Fix Now
                                    </button>
                                </div>
                            ))
                        ) : (
                             <div className="text-center py-10 text-gray-500 bg-gray-900/50 rounded-xl border border-dashed border-gray-800">
                                <Check size={32} className="mx-auto mb-2 text-green-500" />
                                <p>No items found requiring attention. Good job!</p>
                             </div>
                        )}
                    </div>
                );
            case 'expiry':
                 return (
                    <div className="space-y-4">
                        {data.expiringItems && data.expiringItems.length > 0 ? (
                            data.expiringItems.map((item: any) => (
                                <div key={item.id} className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-gray-700 rounded-lg text-orange-400">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{item.name}</h4>
                                            <p className="text-xs text-red-400 font-bold">{item.daysLeft} days remaining</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/items/${item.id}`)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500">No expiring items.</div>
                        )}
                    </div>
                 );
            case 'attachments':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(data.fileTypeMap || {}).map(([type, count]: any) => (
                                <div key={type} className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center">
                                    <div className="text-lg font-bold text-white uppercase">{type}</div>
                                    <div className="text-xs text-gray-500">{count} files</div>
                                </div>
                            ))}
                        </div>
                        
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mt-6">Old / Unused Files</h4>
                        {data.oldFiles && data.oldFiles.length > 0 ? (
                             data.oldFiles.map((f: any) => (
                                <div key={f.id} className="flex items-center justify-between p-3 border-b border-gray-800 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <FileText size={16} className="text-gray-500" />
                                        <span className="text-gray-300 text-sm">{f.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-600">Stored in {f.parentItemName}</span>
                                </div>
                             ))
                        ) : (
                            <div className="text-sm text-gray-500">No old files detected.</div>
                        )}
                    </div>
                );
             case 'sessions':
                 return (
                     <div className="space-y-4">
                         {data.sessions.map((s: any) => (
                             <div key={s.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
                                 <div className="flex items-center gap-4">
                                     <div className={`p-2 rounded-lg ${s.status.includes('Active') ? 'bg-green-500/10 text-green-500' : 'bg-gray-700 text-gray-400'}`}>
                                         <Smartphone size={20} />
                                     </div>
                                     <div>
                                         <div className="font-bold text-white">{s.device}</div>
                                         <div className="text-xs text-gray-400">{s.location} • {s.status}</div>
                                     </div>
                                 </div>
                                 <button className="text-red-400 hover:text-red-300 text-xs font-bold uppercase border border-red-500/30 px-3 py-1 rounded-lg">
                                     Revoke
                                 </button>
                             </div>
                         ))}
                     </div>
                 )
            default:
                return <p className="text-gray-500">Details not available for this metric.</p>;
        }
    };

    return (
        <div className="animate-fade-in relative z-10">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </button>
            
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8">
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{data.title}</h2>
                        <p className="text-gray-400 max-w-2xl">{data.description}</p>
                    </div>
                    <div className={`text-4xl font-bold ${data.color || 'text-white'}`}>
                        {data.value}
                    </div>
                </div>
                
                <div className="bg-gray-950 rounded-xl border border-gray-800 p-1">
                    <div className="p-4 md:p-6">
                         {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}


// --- Main Page Component ---

const Guardian: React.FC = () => {
  const { items } = useData();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generator'>('dashboard');
  
  // Scanning State
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  // Detail View State
  const [detailViewId, setDetailViewId] = useState<KpiId | null>(null);
  
  // Info Modal State
  const [infoModalId, setInfoModalId] = useState<KpiId | null>(null);

  // Generator State
  const [genType, setGenType] = useState<'random' | 'memorable'>('random');
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ uppercase: true, numbers: true, symbols: true });
  const [generatedPass, setGeneratedPass] = useState('');
  const [copied, setCopied] = useState(false);

  // --- STATS CALCULATION LOGIC ---

  const stats = useMemo(() => {
      const loginItems = items.filter(i => i.data.password);
      
      // 1. Password Strength
      let totalScore = 0;
      let weakCount = 0;
      const affectedWeak: any[] = [];
      const passMap: Record<string, any[]> = {};

      loginItems.forEach(item => {
          const pass = item.data.password || '';
          const len = pass.length;
          let score = 0;
          if (len >= 16) score = 100;
          else if (len >= 12) score = 80;
          else if (len >= 8) score = 50;
          else score = 20;

          if (score <= 50) {
              weakCount++;
              affectedWeak.push(item);
          }
          totalScore += score;

          if (!passMap[pass]) passMap[pass] = [];
          passMap[pass].push(item);
      });

      const avgScore = loginItems.length ? Math.round(totalScore / loginItems.length) : 100;
      const reusedGroups = Object.values(passMap).filter(g => g.length > 1);
      const reusedCount = reusedGroups.length;
      const reusedItems = reusedGroups.flat();

      // 2. Age Analysis
      const now = new Date();
      const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(now.getMonth() - 6);
      
      const staleItems: any[] = [];
      items.forEach(i => {
          if (i.lastUpdated) {
              const d = new Date(i.lastUpdated);
              if (d < sixMonthsAgo) staleItems.push(i);
          }
      });

      // 3. Expiry Reminders
      const expiringItems: any[] = [];
      items.forEach(i => {
          let expiryDate: Date | null = null;
          if (i.data.expiry) {
              const [m, y] = i.data.expiry.split('/');
              if (m && y) expiryDate = new Date(2000 + parseInt(y), parseInt(m) - 1);
          }
          if (i.data.validTill || i.data.expiryDate) {
              const dStr = i.data.validTill || i.data.expiryDate;
              if (dStr && !isNaN(Date.parse(dStr))) expiryDate = new Date(dStr);
          }
          if (expiryDate) {
              const diffTime = expiryDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 0 && diffDays < 90) {
                  expiringItems.push({ ...i, daysLeft: diffDays });
              }
          }
      });

      // 4. Attachments Logic
      let totalAttachSize = 0;
      let totalAttachments = 0;
      const fileTypeMap: Record<string, number> = {};
      const oldFiles: any[] = [];
      const oneYearAgo = new Date(); oneYearAgo.setFullYear(now.getFullYear() - 1);

      items.forEach(i => {
          if (i.data.attachments) {
              totalAttachments += i.data.attachments.length;
              i.data.attachments.forEach((a: any) => {
                  totalAttachSize += a.size;
                  // Type analysis
                  const ext = a.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
                  fileTypeMap[ext] = (fileTypeMap[ext] || 0) + 1;
                  
                  // Mock age check (using item updated time for demo)
                  if (new Date(i.lastUpdated) < oneYearAgo) {
                      oldFiles.push({ id: a.id, name: a.name, parentItemName: i.name });
                  }
              });
          }
      });

      // 5. Distribution
      const distributionRaw = items.reduce((acc: any, curr) => {
          acc[curr.type] = (acc[curr.type] || 0) + 1;
          return acc;
      }, {});
      
      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-red-500', 'bg-indigo-500', 'bg-orange-500'];
      const distData = Object.keys(distributionRaw).map((key, idx) => ({ 
          name: key, 
          value: distributionRaw[key],
          color: colors[idx % colors.length]
      }));

      return {
          securityScore: avgScore,
          weakCount,
          weakItems: affectedWeak,
          reusedCount,
          reusedItems,
          staleItems,
          staleCount: staleItems.length,
          expiringItems,
          totalAttachments,
          totalAttachSize: (totalAttachSize / (1024 * 1024)).toFixed(2), // MB
          fileTypeMap,
          oldFiles,
          distribution: distData,
          totalItems: items.length
      };
  }, [items]);

  // Mock External Data
  const mockData = {
      compromisedCount: 0,
      sessions: [
        { id: 1, device: 'iPhone 15 Pro', location: 'San Francisco, US', status: 'Active Now' },
        { id: 2, device: 'MacBook Air M2', location: 'Seattle, US', status: '2h ago' },
      ],
      backup: { score: 98, last: '15m ago', status: 'Secure' }
  };

  // --- Handlers ---

  const startScan = (types: string[]) => {
      setScanModalOpen(false);
      setIsScanning(true);
      setScanProgress(0);
      
      // Simulation Sequence
      const steps = [
          { pct: 10, text: 'Initializing secure environment...' },
          { pct: 30, text: 'Analyzing vault items...' },
          { pct: 60, text: 'Checking against breach databases...' },
          { pct: 85, text: 'Verifying encryption integrity...' },
          { pct: 100, text: 'Finalizing report...' }
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
          if (currentStep >= steps.length) {
              clearInterval(interval);
              setIsScanning(false);
              setLastScanTime('Just now');
              return;
          }
          setScanProgress(steps[currentStep].pct);
          setScanStatus(steps[currentStep].text);
          currentStep++;
      }, 800);
  };

  const handleGenerate = () => {
    if (genType === 'memorable') {
        setGeneratedPass(generateMemorablePassword());
    } else {
        setGeneratedPass(generatePassword(length, options));
    }
    setCopied(false);
  };

  const handleCopy = () => {
      if(generatedPass) {
          navigator.clipboard.writeText(generatedPass);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  }

  React.useEffect(() => {
      if(!generatedPass) handleGenerate();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Render Helpers ---

  const KpiCard = ({ id, title, value, icon: Icon, color, subtext, alert, onClick }: any) => (
      <div 
        onClick={() => setDetailViewId(id)}
        className={`bg-gray-900 border ${alert ? 'border-red-500/50 bg-red-900/10' : 'border-gray-800'} rounded-2xl p-5 flex flex-col justify-between relative group cursor-pointer hover:border-gray-700 hover:bg-gray-850 transition-all`}
      >
          <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-xl bg-gray-950/50 ${color} shadow-lg shadow-gray-950/50`}>
                  <Icon size={22} />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setInfoModalId(id); }}
                className="text-gray-600 hover:text-white transition-colors p-1"
                title="View Info"
              >
                  <Info size={18} />
              </button>
          </div>
          <div>
              <div className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</div>
              {subtext && <div className="text-xs text-gray-600 mt-2 font-medium">{subtext}</div>}
          </div>
          {alert && <div className="absolute top-4 right-12 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold uppercase rounded-full animate-pulse shadow-lg shadow-red-900/50">Alert</div>}
          
          {/* Arrow for Drill-down */}
          <div className="absolute bottom-4 right-4 text-gray-700 group-hover:text-primary-400 opacity-50 group-hover:opacity-100 transition-all">
             <ChevronRight size={20} />
          </div>
      </div>
  );

  // --- Main Render ---

  if (isScanning) return <ScanningOverlay progress={scanProgress} status={scanStatus} />;

  if (detailViewId) {
      // Mapping ID to Data
      let detailData: any = { title: 'Unknown', description: '', value: '' };
      switch(detailViewId) {
          case 'security_score':
              detailData = { title: 'Security Score', value: `${stats.securityScore}/100`, description: 'A weighted score based on password complexity and uniqueness across your vault.', color: stats.securityScore > 70 ? 'text-green-500' : 'text-yellow-500', affectedItems: [] };
              break;
          case 'weak_passwords':
              detailData = { title: 'Weak Passwords', value: stats.weakCount, description: 'Passwords that are short, simple, or lack complexity. Vulnerable to brute-force attacks.', color: 'text-red-500', affectedItems: stats.weakItems };
              break;
          case 'reused_passwords':
              detailData = { title: 'Reused Passwords', value: stats.reusedCount, description: 'Passwords used on multiple accounts. If one site is breached, all these accounts are at risk.', color: 'text-orange-500', affectedItems: stats.reusedItems };
              break;
          case 'stale_passwords':
              detailData = { title: 'Stale Passwords', value: stats.staleCount, description: 'Passwords not updated in over 6 months. Regular rotation reduces risk.', color: 'text-gray-300', affectedItems: stats.staleItems };
              break;
          case 'expiry':
              detailData = { title: 'Expiring Items', value: stats.expiringItems.length, description: 'Cards and IDs expiring within the next 90 days.', color: 'text-yellow-500', expiringItems: stats.expiringItems };
              break;
          case 'attachments':
              detailData = { title: 'Vault Attachments', value: stats.totalAttachments, description: 'Overview of stored files and document health.', color: 'text-blue-500', fileTypeMap: stats.fileTypeMap, oldFiles: stats.oldFiles };
              break;
          case 'sessions':
              detailData = { title: 'Active Sessions', value: mockData.sessions.length, description: 'Devices currently authorized to access your vault.', color: 'text-green-500', sessions: mockData.sessions };
              break;
           case 'backup':
              detailData = { title: 'Backup Health', value: 'Secure', description: 'Status of your encrypted cloud synchronization.', color: 'text-green-500', affectedItems: [] };
              break;
          default:
              break;
      }
      return <KpiDetailView id={detailViewId} data={detailData} onBack={() => setDetailViewId(null)} items={items} />;
  }

  return (
    <div className="relative min-h-full pb-20 overflow-x-hidden">
      <GuardianWizard />
      <ScanModal isOpen={scanModalOpen} onClose={() => setScanModalOpen(false)} onScan={startScan} />
      <InfoModal isOpen={!!infoModalId} onClose={() => setInfoModalId(null)} kpiId={infoModalId} />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
                 <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <ShieldCheck className="text-primary-500" size={32} />
                    Guardian Center
                </h2>
                <p className="text-gray-400 mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    System Online • Last scan: {lastScanTime || 'Never'}
                </p>
            </div>
            
            <div className="flex items-center gap-3 bg-gray-900/50 p-1.5 rounded-xl border border-gray-800 overflow-x-auto max-w-full">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('generator')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'generator' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Generator
                </button>
                <div className="w-px h-6 bg-gray-800 mx-1 shrink-0"></div>
                 <button 
                    onClick={() => setScanModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary-900/20 active:scale-95 whitespace-nowrap"
                >
                    <Scan size={16} /> Scan Now
                </button>
            </div>
        </div>

        {activeTab === 'dashboard' && (
            <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 auto-rows-fr">
                
                {/* 1. Security Score */}
                <KpiCard 
                    id="security_score"
                    title="Security Score"
                    value={`${stats.securityScore}/100`}
                    icon={ShieldCheck}
                    color={stats.securityScore > 70 ? "text-green-500" : "text-yellow-500"}
                    subtext="Vault health status"
                />

                {/* 2. Weak Passwords */}
                <KpiCard 
                    id="weak_passwords"
                    title="Weak Passwords"
                    value={stats.weakCount}
                    icon={ShieldAlert}
                    color="text-red-400"
                    alert={stats.weakCount > 0}
                    subtext="Action required"
                />

                {/* 3. Reused Passwords */}
                <KpiCard 
                    id="reused_passwords"
                    title="Reused Passwords"
                    value={stats.reusedCount}
                    icon={Copy}
                    color="text-orange-400"
                    alert={stats.reusedCount > 0}
                    subtext={`${stats.reusedItems.length} accounts at risk`}
                />

                {/* 4. Compromised (Mock) */}
                <KpiCard 
                    id="compromised"
                    title="Compromised"
                    value={mockData.compromisedCount}
                    icon={AlertTriangle}
                    color="text-red-500"
                    alert={mockData.compromisedCount > 0}
                    subtext="Dark web leaks"
                />

                {/* 5. Vault Distribution - Spans 2 cols */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 col-span-1 md:col-span-2 flex flex-col justify-center relative group">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                             <Database size={16} /> Vault Content
                        </h3>
                        <span className="text-xs text-gray-500 font-mono">{stats.totalItems} Items</span>
                    </div>
                    <VaultContentBar distribution={stats.distribution} total={stats.totalItems} />
                </div>

                {/* 6. Expiry Reminders - Spans 2 cols */}
                <div 
                    onClick={() => setDetailViewId('expiry')}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-6 col-span-1 md:col-span-2 cursor-pointer hover:border-gray-700 hover:bg-gray-850 transition-colors group relative"
                >
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                             <Calendar size={16} /> Expiry Reminders
                        </h3>
                         <button 
                            onClick={(e) => { e.stopPropagation(); setInfoModalId('expiry'); }}
                            className="text-gray-600 hover:text-white transition-colors p-1"
                         >
                             <Info size={16} />
                         </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                         {stats.expiringItems.length > 0 ? (
                             stats.expiringItems.map(item => (
                                 <div key={item.id} className="min-w-[160px] bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                                     <div className="text-xs text-orange-400 font-bold mb-1">{item.daysLeft} days left</div>
                                     <div className="font-bold text-white text-sm truncate">{item.name}</div>
                                     <div className="text-[10px] text-gray-500 mt-1">{item.type}</div>
                                 </div>
                             ))
                         ) : (
                             <div className="w-full py-4 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                                 <Check size={16} className="text-green-500" /> All items valid.
                             </div>
                         )}
                    </div>
                     <div className="absolute bottom-4 right-4 text-gray-700 group-hover:text-primary-400 opacity-50 group-hover:opacity-100 transition-all">
                        <ChevronRight size={20} />
                    </div>
                </div>

                 {/* 7. Stale Passwords */}
                 <KpiCard 
                    id="stale_passwords"
                    title="Stale Passwords"
                    value={stats.staleCount}
                    icon={History}
                    color="text-gray-400"
                    subtext="Unchanged > 6 months"
                />

                {/* 8. Attachments */}
                 <div 
                    onClick={() => setDetailViewId('attachments')}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5 cursor-pointer hover:border-gray-700 hover:bg-gray-850 transition-colors group relative"
                >
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-gray-950/50 text-blue-400 shadow-lg">
                            <FileText size={22} />
                        </div>
                         <button 
                            onClick={(e) => { e.stopPropagation(); setInfoModalId('attachments'); }}
                            className="text-gray-600 hover:text-white transition-colors p-1"
                         >
                             <Info size={18} />
                         </button>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-white mb-1">{stats.totalAttachSize} <span className="text-lg text-gray-500 font-medium">MB</span></div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attachments</div>
                        <div className="text-xs text-gray-600 mt-2 font-medium">{stats.totalAttachments} Files Stored</div>
                    </div>
                    <div className="absolute bottom-4 right-4 text-gray-700 group-hover:text-primary-400 opacity-50 group-hover:opacity-100 transition-all">
                        <ChevronRight size={20} />
                    </div>
                </div>

                {/* 9. Active Sessions - Spans 1 col */}
                 <KpiCard 
                    id="sessions"
                    title="Active Sessions"
                    value={mockData.sessions.length}
                    icon={Smartphone}
                    color="text-indigo-400"
                    subtext={mockData.sessions[0]?.device || 'No active sessions'}
                />

                 {/* 10. Backup - Spans 1 col */}
                 <div 
                    onClick={() => setDetailViewId('backup')}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5 cursor-pointer hover:border-gray-700 hover:bg-gray-850 transition-colors group relative"
                >
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-gray-950/50 text-green-400 shadow-lg">
                            <HardDrive size={22} />
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setInfoModalId('backup'); }}
                            className="text-gray-600 hover:text-white transition-colors p-1"
                         >
                             <Info size={18} />
                         </button>
                    </div>
                     <div>
                        <div className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
                            {mockData.backup.score}% 
                            <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase">Secure</span>
                        </div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cloud Backup</div>
                         <div className="text-xs text-gray-600 mt-2 font-medium">Synced {mockData.backup.last}</div>
                    </div>
                    <div className="absolute bottom-4 right-4 text-gray-700 group-hover:text-primary-400 opacity-50 group-hover:opacity-100 transition-all">
                        <ChevronRight size={20} />
                    </div>
                </div>

                 {/* 11. Orphaned / Unused Items (Mock) */}
                 <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 col-span-1 md:col-span-2 lg:col-span-4 flex items-center justify-between relative z-10">
                     <div className="flex items-center gap-4">
                         <div className="p-3 bg-gray-800 rounded-xl text-gray-400">
                             <Box size={24} />
                         </div>
                         <div>
                             <div className="font-bold text-white">Vault Hygiene Check</div>
                             <div className="text-xs text-gray-500">0 orphaned items found. Your vault is clean.</div>
                         </div>
                     </div>
                     <button className="text-sm font-bold text-primary-400 hover:text-white transition-colors">Run Cleanup</button>
                 </div>

            </div>
        )}

        {activeTab === 'generator' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-10 max-w-2xl mx-auto animate-fade-in mt-10 relative z-10">
              {/* Output Display */}
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 md:p-6 mb-8 flex items-center justify-between group">
                  <div className="text-xl md:text-3xl font-mono text-white break-all">{generatedPass}</div>
                  <div className="flex items-center gap-2 pl-4">
                      <button onClick={handleGenerate} className="p-2 text-gray-400 hover:text-white transition-colors"><RefreshCw size={24}/></button>
                      <button onClick={handleCopy} className={`p-2 transition-colors ${copied ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
                          {copied ? <Check size={24} /> : <Copy size={24}/>}
                      </button>
                  </div>
              </div>

              {/* Controls */}
              <div className="space-y-6">
                  {/* Type Toggle */}
                  <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => {setGenType('random'); handleGenerate()}} 
                        className={`p-3 rounded-xl border font-medium transition-all ${genType === 'random' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                      >
                          Random
                      </button>
                      <button 
                         onClick={() => {setGenType('memorable'); handleGenerate()}} 
                         className={`p-3 rounded-xl border font-medium transition-all ${genType === 'memorable' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                       >
                          Memorable
                      </button>
                  </div>

                  {genType === 'random' && (
                      <>
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-gray-400 text-sm">Length</label>
                                <span className="text-white font-mono">{length}</span>
                            </div>
                            <input 
                                type="range" 
                                min="8" 
                                max="64" 
                                value={length} 
                                onChange={(e) => setLength(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {Object.entries(options).map(([key, val]) => (
                                <button 
                                    key={key}
                                    onClick={() => setOptions(o => ({...o, [key]: !val}))}
                                    className={`px-4 py-2 rounded-lg text-sm border capitalize transition-all ${val ? 'bg-primary-900/30 border-primary-500 text-primary-200' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                      </>
                  )}
              </div>
              
              <button 
                onClick={handleGenerate}
                className="w-full mt-8 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
              >
                  Regenerate
              </button>
          </div>
      )}

      </div>
    </div>
  );
};

export default Guardian;
