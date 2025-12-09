import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useVaultStore } from '../src/stores/vaultStore';
import SyncService from '../src/services/syncService';

const SyncStatus: React.FC = () => {
  const { isOnline } = useVaultStore();
  const [syncStatus, setSyncStatus] = useState({ pending: 0, syncing: false });
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      const status = await SyncService.getSyncStatus();
      setSyncStatus(status);
      if (status.pending === 0 && !status.syncing && isOnline) {
        setLastSync(new Date());
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleForceSync = async () => {
    if (!isOnline) return;
    try {
      // Import vault store to trigger full sync
      const { useVaultStore } = await import('../src/stores/vaultStore');
      await useVaultStore.getState().syncWithServer();
      setLastSync(new Date());
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs">
        <CloudOff size={14} />
        <span>Offline{syncStatus.pending > 0 && ` (${syncStatus.pending} queued)`}</span>
      </div>
    );
  }

  if (syncStatus.syncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-400 text-xs">
        <RefreshCw size={14} className="animate-spin" />
        <span>Syncing{syncStatus.pending > 0 && ` (${syncStatus.pending})`}...</span>
      </div>
    );
  }

  if (syncStatus.pending > 0) {
    return (
      <button
        onClick={handleForceSync}
        className="flex items-center gap-2 px-3 py-1.5 bg-orange-900/20 border border-orange-500/30 rounded-lg text-orange-400 text-xs hover:bg-orange-900/30 transition-colors"
      >
        <AlertCircle size={14} />
        <span>{syncStatus.pending} pending</span>
      </button>
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
