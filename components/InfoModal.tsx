import React from 'react';
import { X, Info, Lightbulb } from 'lucide-react';

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
    description: "Tracks expiration dates for passwords, credit cards, licenses, and ID cards. Get notified 90 days before expiry.",
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
    description: "Status of your encrypted cloud synchronization.",
    bestPractices: [
      "Ensure sync is set to 'Automatic'.",
      "Periodically export a local backup (Settings > Export) for offline safety.",
      "Verify your recovery phrase is stored securely."
    ]
  }
};

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiId: string | null;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, kpiId }) => {
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

export default InfoModal;