import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useVaultStore } from '../src/stores/vaultStore';
import SyncService from '../src/services/syncService';

const SyncStatus: React.FC = () => {
  const { isOnline } = useVaultStore();
  const [syncStatus, setSyncStatus] = useState({ pending: 0, syncing: false });

  useEffect(() => {
    const updateStatus = async () => {
      const status = await SyncService.getSyncStatus();
      setSyncStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs">
        <CloudOff size={14} />
        <span>Offline{syncStatus.pending > 0 && ` (${syncStatus.pending} pending)`}</span>
      </div>
    );
  }

  if (syncStatus.syncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-400 text-xs">
        <RefreshCw size={14} className="animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-xs">
      <Cloud size={14} />
      <span>Synced</span>
    </div>
  );
};

export default SyncStatus;
