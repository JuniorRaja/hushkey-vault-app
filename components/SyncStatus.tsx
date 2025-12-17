import React, { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertCircle } from "lucide-react";
import { useVaultStore } from "../src/stores/vaultStore";
import SyncService from "../src/services/syncService";

const SyncStatus: React.FC = () => {
  const { isOnline } = useVaultStore();
  const [status, setStatus] = useState<any>({
    pending: 0,
    syncing: false,
    conflicts: 0,
    queue: [],
  });
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      const s = await SyncService.getSyncStatus();
      setStatus(s);
      if (s.pending === 0 && !s.syncing && isOnline && !s.conflicts) {
        setLastSync(new Date());
      }
    };

    // Listen for conflicts
    const handleConflict = () => updateStatus();
    window.addEventListener("sync-conflicts-updated", handleConflict);

    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("sync-conflicts-updated", handleConflict);
    };
  }, [isOnline]);

  const handleForceSync = async () => {
    if (!isOnline) return;
    try {
      const { useVaultStore } = await import("../src/stores/vaultStore");
      await useVaultStore.getState().syncWithServer();
      setLastSync(new Date());
    } catch (error) {
      console.error("Force sync failed:", error);
    }
  };

  const handleConflictClick = () => {
    // Trigger conflict modal via event or Context
    window.dispatchEvent(new CustomEvent("open-conflict-modal"));
  };

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs transition-all hover:bg-yellow-900/30">
        <CloudOff size={14} />
        <span>Offline</span>
        {status.pending > 0 && (
          <span className="bg-yellow-500/20 px-1.5 py-0.5 rounded ml-1">
            {status.pending} queued
          </span>
        )}
      </div>
    );
  }

  // Conflict State (Highest Priority)
  if (status.conflicts > 0) {
    return (
      <button
        onClick={handleConflictClick}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-xs hover:bg-red-900/30 transition-all animate-pulse"
      >
        <AlertCircle size={14} />
        <span className="font-bold">
          {status.conflicts} Conflict{status.conflicts > 1 ? "s" : ""}
        </span>
      </button>
    );
  }

  if (status.syncing) {
    return (
      <div className="group relative">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-400 text-xs cursor-wait">
          <RefreshCw size={14} className="animate-spin" />
          <span>Syncing ({status.pending})...</span>
        </div>

        {/* Hover Queue Details */}
        {status.queue && status.queue.length > 0 && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1 px-1">
              Sync Queue
            </div>
            <div className="space-y-1">
              {status.queue.slice(0, 5).map((q: any) => (
                <div key={q.id} className="text-xs text-gray-300 truncate px-1">
                  • {q.action} {q.entityType}
                </div>
              ))}
              {status.queue.length > 5 && (
                <div className="text-[10px] text-gray-500 px-1">
                  +{status.queue.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status.pending > 0) {
    return (
      <button
        onClick={handleForceSync}
        className="flex items-center gap-2 px-3 py-1.5 bg-orange-900/20 border border-orange-500/30 rounded-lg text-orange-400 text-xs hover:bg-orange-900/30 transition-colors"
        title="Click to force sync"
      >
        <AlertCircle size={14} />
        <span>{status.pending} pending</span>
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
