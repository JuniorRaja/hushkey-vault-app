
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { useData } from '../App';
import { useNavigate } from 'react-router-dom';
import { useItemStore } from '../src/stores/itemStore';
import { useAuthStore } from '../src/stores/authStore';
import { useGuardianStore } from '../src/stores/guardianStore';
import { useBackupStore } from '../src/stores/backupStore';
import { analyzePassword } from '../src/services/passwordAnalyzer';
import { generatePassword, generateMemorablePassword } from '../services/passwordGenerator';
import { 
    RefreshCw, Copy, Check, ShieldAlert, ShieldCheck, Shield, 
    AlertTriangle, History, HardDrive, Smartphone, Info, 
    CreditCard, Calendar, FileWarning, Activity, Lock, Users,
    Globe, Database, Wifi, Server, Key, ArrowLeft, Scan, X,
    FileText, Image as ImageIcon, Film, Music, Box, Loader2,
    ChevronRight, ExternalLink, Lightbulb, TrendingDown, TrendingUp,
    CheckCircle, XCircle, Clock, Eye, Settings
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { FindingsManager } from '../src/components/FindingsManager';
import { ScanHistory } from '../src/components/ScanHistory';

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
    stale_passwords: {
        title: "Stale Passwords",
        description: "Passwords that haven't been changed in over 3-6 months. Regular rotation reduces risk of compromise.",
        bestPractices: [
            "Rotate critical passwords (email, banking) every 3 months.",
            "Change less critical passwords every 6 months.",
            "Review old accounts to see if you still need them."
        ]
    },
    expiry: {
        title: "Expiry Reminders",
        description: "Tracks expiration dates for passwords, credit cards, and ID cards. Get notified 90 days before expiry.",
        bestPractices: [
            "Renew documents 3 months before expiry.",
            "Update the vault entry immediately after receiving the new card/ID.",
            "Set password expiry intervals for critical accounts."
        ]
    },
    attachments: {
        title: "Vault Attachments",
        description: "Analysis of files stored within your secure vault. Shows total size, file count, types, and identifies old/unused files.",
        bestPractices: [
            "Delete files you no longer need to save space.",
            "Review files older than 1 year for relevance.",
            "Keep file sizes reasonable for faster sync."
        ]
    },
    sessions: {
        title: "Active Sessions",
        description: "Devices currently logged into your HushKey Vault account. Monitor and terminate suspicious sessions.",
        bestPractices: [
            "Terminate sessions from devices you don't recognize.",
            "Log out of public or shared computers immediately after use.",
            "Set a shorter 'Auto-lock' timer in settings."
        ]
    },
    backup: {
        title: "Backup Health",
        description: "Status of your vault backups. Regular backups protect against data loss.",
        bestPractices: [
            "Create backups every 30 days.",
            "Use HushKey Backup (.hkb) format for best security.",
            "Store backups in multiple secure locations.",
            "Test restore process periodically."
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





// 8. KPI Detail View
const KpiDetailView = ({ id, data, onBack, items }: { id: KpiId, data: any, onBack: () => void, items: any[] }) => {
    const navigate = useNavigate();

    const renderContent = () => {
        switch(id) {
            case 'security_score':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-center">
                                <div className="text-3xl font-bold text-red-400">{data.breakdown.weakCount}</div>
                                <div className="text-xs text-gray-400 mt-1">Weak</div>
                            </div>
                            <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-xl text-center">
                                <div className="text-3xl font-bold text-yellow-400">{data.breakdown.mediumCount}</div>
                                <div className="text-xs text-gray-400 mt-1">Medium</div>
                            </div>
                            <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-center">
                                <div className="text-3xl font-bold text-green-400">{data.breakdown.strongCount}</div>
                                <div className="text-xs text-gray-400 mt-1">Strong</div>
                            </div>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-xl">
                            <h4 className="text-sm font-bold text-gray-400 mb-3">Score Breakdown</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400">Total Passwords:</span><span className="text-white font-mono">{data.breakdown.totalPasswords}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Average Strength:</span><span className="text-white font-mono">{data.value}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Weak Passwords:</span><span className="text-red-400 font-mono">{data.breakdown.weakCount}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Reused Passwords:</span><span className="text-orange-400 font-mono">{data.reusedCount || 0}</span></div>
                            </div>
                        </div>
                    </div>
                );
            case 'weak_passwords':
            case 'reused_passwords':
            case 'stale_passwords':
            case 'compromised':
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
                                            <p className="text-xs text-gray-400">
                                                {id === 'stale_passwords' && item.monthsOld ? `${item.monthsOld} months old` : item.data?.username || 'No username'}
                                            </p>
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
                                            <p className="text-xs font-bold">
                                                <span className={item.isExpired ? 'text-red-500' : 'text-red-400'}>
                                                    {item.expiryType}: {item.isExpired ? `Expired ${Math.abs(item.daysLeft)} days ago` : `${item.daysLeft} days remaining`}
                                                </span>
                                            </p>
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
                                 <button 
                                     onClick={() => data.onTerminate?.(s.id)}
                                     className="text-red-400 hover:text-red-300 text-xs font-bold uppercase border border-red-500/30 px-3 py-1 rounded-lg transition-colors"
                                 >
                                     Revoke
                                 </button>
                             </div>
                         ))}
                     </div>
                 )
             case 'backup':
                 return (
                     <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                             <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl">
                                 <div className="text-sm text-gray-400 mb-1">Last Backup</div>
                                 <div className="text-2xl font-bold text-white">{data.lastBackup}</div>
                             </div>
                             <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl">
                                 <div className="text-sm text-gray-400 mb-1">Items Backed Up</div>
                                 <div className="text-2xl font-bold text-white">{data.itemCount}</div>
                             </div>
                         </div>
                         <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl">
                             <div className="text-sm text-gray-400 mb-1">Total Backups</div>
                             <div className="text-2xl font-bold text-white">{data.totalBackups}</div>
                         </div>
                         <button 
                             onClick={() => window.location.href = '/settings/backup'}
                             className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-semibold transition-colors"
                         >
                             Manage Backups
                         </button>
                     </div>
                 )
            default:
                return <p className="text-gray-500">Details not available for this metric.</p>;
        }
    };

    return (
        <div className="animate-fade-in relative z-10">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 md:mb-6 transition-colors group text-sm md:text-base">
                <ArrowLeft size={18} className="md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </button>
            
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-8">
                <div className="flex items-start justify-between mb-4 md:mb-8">
                    <div>
                        <h2 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">{data.title}</h2>
                        <p className="text-gray-400 max-w-2xl text-xs md:text-base">{data.description}</p>
                    </div>
                    <div className={`text-2xl md:text-4xl font-bold ${data.color || 'text-white'}`}>
                        {data.value}
                    </div>
                </div>
                
                <div className="bg-gray-950 rounded-xl border border-gray-800 p-1">
                    <div className="p-3 md:p-6">
                         {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}


// --- Main Page Component ---

const Guardian: React.FC = () => {
  const { items: contextItems } = useData();
  const { items: storeItems, loadItems } = useItemStore();
  const { user } = useAuthStore();
  const { isScanning, scanProgress, lastScan, findings, compromisedCount: storeCompromisedCount, startScan, startBreachCheck, fetchLatestScan, fetchFindings } = useGuardianStore();
  const { backupHealth, loadBackupHealth } = useBackupStore();
  
  // Load items on mount
  useEffect(() => {
    if (user) {
      loadItems();
    }
  }, [user, loadItems]);
  
  // Use only real user items from store (IndexedDB/Supabase), not mock data from context
  const items = storeItems.filter(item => !item.deletedAt);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generator'>('dashboard');
  
  // Scanning State
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  
  // Calculate relative time from lastScan
  const getRelativeTime = (date: string | undefined) => {
    if (!date) return 'Never';
    const now = Date.now();
    const scanTime = new Date(date).getTime();
    const diff = now - scanTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };
  
  const lastScanTime = getRelativeTime(lastScan?.scanDate);

  // Detail View State
  const [detailViewId, setDetailViewId] = useState<KpiId | null>(null);
  
  // Info Modal State
  const [infoModalId, setInfoModalId] = useState<KpiId | null>(null);
  
  // Phase 2 State
  const [showHistory, setShowHistory] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);

  // Generator State
  const [genType, setGenType] = useState<'random' | 'memorable'>('random');
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({ uppercase: true, numbers: true, symbols: true });
  const [generatedPass, setGeneratedPass] = useState('');
  const [copied, setCopied] = useState(false);

  // --- STATS CALCULATION LOGIC ---

  const stats = useMemo(() => {
      const passwordItems = items.filter(i => i.data?.password && !i.deletedAt);
      
      // 1. Password Strength
      let totalScore = 0;
      const affectedWeak: any[] = [];
      const passMap: Record<string, any[]> = {};

      passwordItems.forEach(item => {
          const pass = item.data.password || '';
          const analysis = analyzePassword(pass);

          if (analysis.strength === 'weak') {
              affectedWeak.push(item);
          }
          totalScore += analysis.score;

          if (!passMap[pass]) passMap[pass] = [];
          passMap[pass].push(item);
      });

      const avgScore = passwordItems.length ? Math.round(totalScore / passwordItems.length) : 100;
      const reusedGroups = Object.values(passMap).filter(g => g.length > 1);
      const reusedCount = reusedGroups.length;
      const reusedItems = reusedGroups.flat();

      // 2. Age Analysis (Stale Passwords)
      const now = new Date();
      const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(now.getMonth() - 3);
      const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(now.getMonth() - 6);
      
      const staleItems: any[] = [];
      items.forEach(i => {
          if (i.data?.password) {
              const lastModified = i.data.passwordLastModified ? new Date(i.data.passwordLastModified) : new Date(i.lastUpdated);
              if (lastModified < threeMonthsAgo) {
                  staleItems.push({ ...i, monthsOld: Math.floor((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24 * 30)) });
              }
          }
      });

      // 3. Expiry Reminders (Passwords, Cards, ID Card)
      const expiringItems: any[] = [];
      items.forEach(i => {
          let expiryDate: Date | null = null;
          let expiryType = '';
          
          if (i.data?.password && i.data.passwordExpiryInterval && i.data.passwordExpiryInterval > 0) {
              const lastModified = i.data.passwordLastModified ? new Date(i.data.passwordLastModified) : new Date(i.lastUpdated);
              expiryDate = new Date(lastModified.getTime() + i.data.passwordExpiryInterval * 24 * 60 * 60 * 1000);
              expiryType = 'Password';
          }
          
          if (i.type === 'CARD' && i.data.expiry) {
              const [m, y] = i.data.expiry.split('/');
              if (m && y) {
                  expiryDate = new Date(2000 + parseInt(y), parseInt(m) - 1);
                  expiryType = 'Card';
              }
          }
          

          
          if (i.type === 'ID_CARD' && i.data.validTill) {
              if (!isNaN(Date.parse(i.data.validTill))) {
                  expiryDate = new Date(i.data.validTill);
                  expiryType = 'ID Card';
              }
          }
          
          if (expiryDate) {
              const diffTime = expiryDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays < 90) {
                  expiringItems.push({ ...i, daysLeft: diffDays, expiryType, isExpired: diffDays < 0 });
              }
          }
      });



      // 5. Distribution - Group by item type
      const distributionRaw = items.reduce((acc: any, curr) => {
          const typeName = curr.type || 'Other';
          acc[typeName] = (acc[typeName] || 0) + 1;
          return acc;
      }, {});
      
      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-red-500', 'bg-indigo-500', 'bg-orange-500'];
      const distData = Object.keys(distributionRaw)
          .sort((a, b) => distributionRaw[b] - distributionRaw[a]) // Sort by count descending
          .map((key, idx) => ({ 
              name: key, 
              value: distributionRaw[key],
              color: colors[idx % colors.length]
          }));

      return {
          securityScore: avgScore,
          weakCount: affectedWeak.length,
          weakItems: affectedWeak,
          reusedCount,
          reusedItems,
          staleItems,
          staleCount: staleItems.length,
          expiringItems,
          distribution: distData,
          totalItems: items.length,
          totalPasswordItems: passwordItems.length
      };
  }, [items]);

  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [attachmentStats, setAttachmentStats] = useState<any>({
    totalAttachments: 0,
    totalAttachSize: 0,
    fileTypeMap: {},
    oldFiles: []
  });

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('*')
          .eq('user_id', user.id)
          .order('last_seen', { ascending: false });
        
        if (error) throw error;
        
        const sessions = (data || []).map(d => ({
          id: d.id,
          device: d.device_name || 'Unknown Device',
          location: d.location || 'Unknown',
          status: getSessionStatus(d.last_seen),
          lastActive: new Date(d.last_seen)
        }));
        
        setActiveSessions(sessions);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      }
    };
    
    fetchSessions();
  }, [user]);

  useEffect(() => {
    const fetchAttachments = async () => {
      if (!user || items.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('file_attachments')
          .select('id, name_encrypted, size_bytes, mime_type, created_at, item_id')
          .in('item_id', items.map(i => i.id));
        
        if (error) throw error;
        
        const attachments = data || [];
        const totalSize = attachments.reduce((sum, a) => sum + a.size_bytes, 0);
        const typeMap: Record<string, number> = {};
        const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const old: any[] = [];
        
        attachments.forEach(a => {
          const type = a.mime_type.split('/')[0].toUpperCase() || 'OTHER';
          typeMap[type] = (typeMap[type] || 0) + 1;
          
          if (new Date(a.created_at) < oneYearAgo) {
            const item = items.find(i => i.id === a.item_id);
            old.push({ id: a.id, name: a.name_encrypted, parentItemName: item?.name || 'Unknown' });
          }
        });
        
        setAttachmentStats({
          totalAttachments: attachments.length,
          totalAttachSize: (totalSize / (1024 * 1024)).toFixed(2),
          fileTypeMap: typeMap,
          oldFiles: old
        });
      } catch (error) {
        console.error('Failed to fetch attachments:', error);
      }
    };
    
    if (items.length > 0) fetchAttachments();
  }, [user]);

  const getSessionStatus = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 5) return 'Active Now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  };

  // Use compromised count from store
  const compromisedCount = storeCompromisedCount;
  
  // Mock External Data
  const mockData = {
      compromisedCount,
      sessions: activeSessions,
      backup: backupHealth ? {
          score: backupHealth.status === 'healthy' ? 100 : backupHealth.status === 'warning' ? 70 : 30,
          last: backupHealth.daysSinceLastBackup === 999 ? 'Never' : `${backupHealth.daysSinceLastBackup}d ago`,
          status: backupHealth.status === 'healthy' ? 'Healthy' : backupHealth.status === 'warning' ? 'Warning' : 'Critical',
          itemCount: backupHealth.lastBackupItemCount,
          totalBackups: backupHealth.totalBackups,
          recommendation: backupHealth.recommendation
      } : { score: 0, last: 'Never', status: 'Unknown', itemCount: 0, totalBackups: 0, recommendation: 'Loading...' }
  };

  // --- Handlers ---

  const handleStartScan = async (types: string[]) => {
      setScanModalOpen(false);
      if (!user) return;
      
      try {
          if (types.includes('darkweb')) {
              await startBreachCheck(user.id, items);
          } else {
              await startScan(user.id, items);
          }
          // lastScanTime is now computed from lastScan
      } catch (error) {
          console.error('Scan failed:', error);
      }
  };

  // Load latest scan on mount
  useEffect(() => {
      if (user) {
          fetchLatestScan(user.id);
          fetchFindings(user.id);
          loadBackupHealth();
      }
  }, [user, fetchLatestScan, fetchFindings, loadBackupHealth]);
  
  // Set current scan ID when lastScan changes
  useEffect(() => {
      if (lastScan?.scanId) {
          setCurrentScanId(lastScan.scanId);
      }
  }, [lastScan]);

  // Update scan status based on progress
  useEffect(() => {
      if (!isScanning) return;

      const steps = [
          { pct: 10, text: 'Initializing secure environment...' },
          { pct: 30, text: 'Analyzing vault items...' },
          { pct: 60, text: 'Checking against breach databases...' },
          { pct: 85, text: 'Verifying encryption integrity...' },
          { pct: 100, text: 'Finalizing report...' }
      ];

      const currentStep = steps.find(s => s.pct >= scanProgress) || steps[steps.length - 1];
      setScanStatus(currentStep.text);
  }, [isScanning, scanProgress]);

  const handleGenerate = () => {
    if (genType === 'memorable') {
        setGeneratedPass(generateMemorablePassword());
    } else {
        setGeneratedPass(generatePassword(length, options));
    }
    setCopied(false);
  };

  const handleCopy = async () => {
      if(generatedPass) {
          try {
              await navigator.clipboard.writeText(generatedPass);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
          } catch (error) {
              console.error('Failed to copy to clipboard:', error);
          }
      }
  }

  React.useEffect(() => {
      try {
          if(!generatedPass) handleGenerate();
      } catch (error) {
          console.error('Failed to generate initial password:', error);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Render Helpers ---

  const KpiCard = ({ id, title, value, icon: Icon, color, subtext, alert }: any) => {
    const handleCardClick = (e: React.MouseEvent) => {
      setDetailViewId(id);
    };
    
    const handleInfoClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setInfoModalId(id as KpiId);
    };
    
    return (
      <div 
        onMouseDown={handleCardClick}
        className={`bg-gray-900 border ${alert ? 'border-red-500/50 bg-red-900/10' : 'border-gray-800'} rounded-2xl p-5 flex flex-col justify-between relative group cursor-pointer hover:border-gray-700 hover:bg-gray-850 transition-all`}
      >
          <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-xl bg-gray-950/50 ${color} shadow-lg shadow-gray-950/50`}>
                  <Icon size={22} />
              </div>
              <button 
                type="button"
                onMouseDown={handleInfoClick}
                className="text-gray-600 hover:text-white transition-colors p-1 z-[20] relative cursor-pointer"
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
          {alert && <div className="absolute top-2 md:top-3 right-7 md:right-10 px-1 md:px-1.5 py-0.5 bg-red-500 text-white text-[7px] md:text-[8px] font-bold uppercase rounded-full animate-pulse shadow-lg shadow-red-900/50">Alert</div>}
          
          {/* Arrow for Drill-down */}
          <div className="absolute bottom-1.5 md:bottom-2 right-1.5 md:right-2 text-gray-700 group-hover:text-primary-400 opacity-50 group-hover:opacity-100 transition-all">
             <ChevronRight size={14} className="md:w-4 md:h-4" />
          </div>
      </div>
    );
  };

  // --- Main Render ---

  if (isScanning) return <ScanningOverlay progress={scanProgress} status={scanStatus} />;

  if (detailViewId) {
      // Mapping ID to Data
      let detailData: any = { title: 'Unknown', description: '', value: '' };
      switch(detailViewId) {
          case 'security_score':
              detailData = { 
                  title: 'Security Score', 
                  value: `${stats.securityScore}/100`, 
                  description: 'A weighted score based on password complexity and uniqueness across your vault.', 
                  color: stats.securityScore > 70 ? 'text-green-500' : 'text-yellow-500', 
                  affectedItems: [],
                  reusedCount: stats.reusedCount,
                  breakdown: {
                      totalPasswords: stats.totalPasswordItems,
                      weakCount: stats.weakCount,
                      mediumCount: stats.totalPasswordItems - stats.weakCount - items.filter(i => {
                          if (!i.data?.password || i.deletedAt) return false;
                          const analysis = analyzePassword(i.data.password);
                          return analysis.strength === 'strong';
                      }).length,
                      strongCount: items.filter(i => {
                          if (!i.data?.password || i.deletedAt) return false;
                          const analysis = analyzePassword(i.data.password);
                          return analysis.strength === 'strong';
                      }).length
                  }
              };
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
          case 'compromised':
              const compromisedItems = findings.filter(f => f.findingType === 'compromised' && !f.resolved);
              detailData = { 
                  title: 'Compromised Passwords', 
                  value: compromisedItems.length, 
                  description: 'Passwords found in known data breaches. Change these immediately.', 
                  color: 'text-red-500', 
                  affectedItems: compromisedItems.map(f => ({
                      id: f.itemId,
                      name: items.find(i => i.id === f.itemId)?.name || `Item ${f.itemId.slice(0, 8)}...`,
                      breachCount: f.details?.breach_count || 1
                  }))
              };
              break;
          case 'expiry':
              detailData = { title: 'Expiring Items', value: stats.expiringItems.length, description: 'Cards and IDs expiring within the next 90 days.', color: 'text-yellow-500', expiringItems: stats.expiringItems };
              break;
          case 'attachments':
              detailData = { title: 'Vault Attachments', value: attachmentStats.totalAttachments, description: 'Overview of stored files and document health.', color: 'text-blue-500', fileTypeMap: attachmentStats.fileTypeMap, oldFiles: attachmentStats.oldFiles };
              break;
          case 'sessions':
              detailData = { title: 'Active Sessions', value: mockData.sessions.length, description: 'Devices currently authorized to access your vault.', color: 'text-green-500', sessions: mockData.sessions, onTerminate: handleTerminateSession };
              break;
           case 'backup':
              detailData = { 
                  title: 'Backup Health', 
                  value: mockData.backup.status, 
                  description: mockData.backup.recommendation,
                  color: mockData.backup.status === 'Healthy' ? 'text-green-500' : mockData.backup.status === 'Warning' ? 'text-yellow-500' : 'text-red-500',
                  lastBackup: mockData.backup.last,
                  itemCount: mockData.backup.itemCount,
                  totalBackups: mockData.backup.totalBackups
              };
              break;
          default:
              break;
      }
      return <KpiDetailView id={detailViewId} data={detailData} onBack={() => setDetailViewId(null)} items={items} />;
  }

  return (
    <div className="relative min-h-full pb-20 overflow-x-hidden">
      <GuardianWizard />
      <ScanModal isOpen={scanModalOpen} onClose={() => setScanModalOpen(false)} onScan={handleStartScan} />
      <InfoModal isOpen={!!infoModalId} onClose={() => setInfoModalId(null)} kpiId={infoModalId} />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="space-y-6">
            {/* Title & Status */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                        <ShieldCheck className="text-primary-500" size={36} />
                        Guardian Center
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></span>
                            <span className="font-medium">System Online</span>
                        </div>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400">Last scan: <span className="text-white font-medium">{lastScanTime || 'Never'}</span></span>
                        <button 
                            onClick={() => setShowHistory(true)}
                            className="flex items-center gap-1.5 text-primary-400 hover:text-primary-300 transition-colors"
                        >
                            <History size={14} />
                            <span className="text-xs font-medium">View History</span>
                        </button>
                    </div>
                </div>
                
                {/* Scan Button */}
                <button 
                    onClick={() => setScanModalOpen(true)}
                    className="group relative px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-900/30 hover:shadow-primary-900/50 active:scale-95 overflow-hidden text-sm md:text-base"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <div className="relative flex items-center gap-2">
                        <Scan size={16} className="md:w-[18px] md:h-[18px] animate-pulse" />
                        <span className="hidden sm:inline">Scan Vault</span>
                        <span className="sm:hidden">Scan</span>
                    </div>
                </button>
            </div>
            
            {/* Tabs & Actions */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-900/50 p-1.5 rounded-xl border border-gray-800">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('generator')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'generator' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Generator
                    </button>
                    {findings.length > 0 && (
                        <button 
                            onClick={() => setShowFindings(true)}
                            className="relative px-4 py-2 rounded-lg text-sm font-bold bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 transition-all"
                        >
                            Findings
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold animate-pulse">
                                {findings.length}
                            </span>
                        </button>
                    )}
                </div>
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

                {/* 4. Compromised */}
                <KpiCard 
                    id="compromised"
                    title="Compromised"
                    value={compromisedCount}
                    icon={AlertTriangle}
                    color="text-red-500"
                    alert={compromisedCount > 0}
                    subtext={compromisedCount > 0 ? "Immediate action required" : "No breaches detected"}
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
                    onMouseDown={() => setDetailViewId('expiry')}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-6 col-span-1 md:col-span-2 cursor-pointer hover:border-gray-700 hover:bg-gray-850 transition-colors group relative"
                >
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                             <Calendar size={16} /> Expiry Reminders
                        </h3>
                         <button 
                            type="button"
                            onMouseDown={(e) => { 
                              e.stopPropagation(); 
                              setInfoModalId('expiry'); 
                            }}
                            className="text-gray-600 hover:text-white transition-colors p-1 z-[20] relative cursor-pointer"
                         >
                             <Info size={16} />
                         </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                         {stats.expiringItems.length > 0 ? (
                             stats.expiringItems.map(item => (
                                 <div key={item.id} className="min-w-[160px] bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                                     <div className={`text-xs font-bold mb-1 ${item.isExpired ? 'text-red-500' : 'text-orange-400'}`}>
                                         {item.isExpired ? `Expired ${Math.abs(item.daysLeft)}d ago` : `${item.daysLeft} days left`}
                                     </div>
                                     <div className="font-bold text-white text-sm truncate">{item.name}</div>
                                     <div className="text-[10px] text-gray-500 mt-1">{item.expiryType}</div>
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
                    onMouseDown={() => {
                      setDetailViewId('attachments');
                    }}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5 cursor-pointer hover:border-gray-700 hover:bg-gray-850 transition-colors group relative"
                >
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-gray-950/50 text-blue-400 shadow-lg">
                            <FileText size={22} />
                        </div>
                         <button 
                            type="button"
                            onMouseDown={(e) => { 
                              e.stopPropagation(); 
                              setInfoModalId('attachments'); 
                            }}
                            className="text-gray-600 hover:text-white transition-colors p-1 z-[20] relative cursor-pointer"
                         >
                             <Info size={18} />
                         </button>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-white mb-1">{attachmentStats.totalAttachSize} <span className="text-lg text-gray-500 font-medium">MB</span></div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attachments</div>
                        <div className="text-xs text-gray-600 mt-2 font-medium">{attachmentStats.totalAttachments} Files Stored</div>
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
                    onMouseDown={() => {
                      setDetailViewId('backup');
                    }}
                    className={`bg-gray-900 border rounded-2xl p-5 cursor-pointer hover:border-gray-700 hover:bg-gray-850 transition-colors group relative ${
                        mockData.backup.status === 'Critical' ? 'border-red-500/50 bg-red-900/10' : 
                        mockData.backup.status === 'Warning' ? 'border-yellow-500/50 bg-yellow-900/10' : 
                        'border-gray-800'
                    }`}
                >
                     <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-xl bg-gray-950/50 shadow-lg ${
                            mockData.backup.status === 'Healthy' ? 'text-green-400' :
                            mockData.backup.status === 'Warning' ? 'text-yellow-400' :
                            'text-red-400'
                        }`}>
                            <HardDrive size={22} />
                        </div>
                        <button 
                            type="button"
                            onMouseDown={(e) => { 
                              e.stopPropagation(); 
                              setInfoModalId('backup'); 
                            }}
                            className="text-gray-600 hover:text-white transition-colors p-1 z-[20] relative cursor-pointer"
                         >
                             <Info size={18} />
                         </button>
                    </div>
                     <div>
                        <div className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
                            {mockData.backup.status}
                        </div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Backup Health</div>
                         <div className="text-xs text-gray-600 mt-2 font-medium">Last: {mockData.backup.last}</div>
                    </div>
                    {(mockData.backup.status === 'Critical' || mockData.backup.status === 'Warning') && (
                        <div className="absolute top-2 right-10 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold uppercase rounded-full animate-pulse shadow-lg shadow-red-900/50">Alert</div>
                    )}
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
      
      {/* Phase 2 Modals */}
      {showHistory && (
        <ScanHistory 
          userId={user?.id || ''}
          onClose={() => setShowHistory(false)}
        />
      )}
      
      {showFindings && (
        <FindingsManager 
          userId={user?.id || ''}
          scanId={currentScanId || undefined}
          onClose={() => setShowFindings(false)}
        />
      )}
    </div>
  );
};

export default Guardian;
