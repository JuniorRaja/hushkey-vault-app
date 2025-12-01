import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../src/stores/authStore";
import DatabaseService from "../src/services/database";
import { 
  ChevronLeft, 
  Activity, 
  Search, 
  FileDown, 
  Copy, 
  User, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  RefreshCw, 
  Loader2, 
  Check 
} from "lucide-react";

const AuditLogsSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [displayedLogs, setDisplayedLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 50;

  const LOG_TYPES = [
    { label: "All", value: "ALL", icon: Activity, color: "text-gray-400" },
    { label: "Login", value: "LOGIN", icon: User, color: "text-blue-400" },
    { label: "Create", value: "CREATE", icon: Plus, color: "text-green-400" },
    { label: "Update", value: "UPDATE", icon: Edit2, color: "text-yellow-400" },
    { label: "Delete", value: "DELETE", icon: Trash2, color: "text-red-400" },
    { label: "Export", value: "EXPORT", icon: Download, color: "text-purple-400" },
    { label: "Sync", value: "SYNC", icon: RefreshCw, color: "text-cyan-400" },
  ];

  useEffect(() => {
    const loadLogs = async () => {
      if (!authUser) return;
      setIsLoading(true);
      try {
        const data = await DatabaseService.getActivityLogs(authUser.id, 1000);
        setLogs(data);
      } catch (err) {
        console.error("Error loading logs:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, [authUser]);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch = l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || l.action === filterType;
    return matchesSearch && matchesType;
  });

  useEffect(() => {
    setDisplayedLogs(filteredLogs.slice(0, page * ITEMS_PER_PAGE));
  }, [search, filterType, page, filteredLogs.length]);

  useEffect(() => {
    setPage(1);
  }, [search, filterType]);

  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayedLogs.length < filteredLogs.length) {
        setPage((prev) => prev + 1);
      }
    }
  };

  const handleDownload = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Details'],
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.action,
        log.details
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hushkey_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogIcon = (action: string) => {
    const type = LOG_TYPES.find(t => t.value === action);
    return type ? type.icon : Activity;
  };

  const getLogColor = (action: string) => {
    const type = LOG_TYPES.find(t => t.value === action);
    return type ? type.color : "text-gray-400";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-20">
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-400 sm:w-6 sm:h-6" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Audit Logs</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden">
        {/* Header with Search and Filters */}
        <div className="p-3 sm:p-4 border-b border-gray-800 space-y-3 bg-gray-950/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={16}
              />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none placeholder-gray-600 transition-all"
              />
            </div>
            <button
              onClick={handleDownload}
              disabled={filteredLogs.length === 0}
              className="px-3 sm:px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-900/30 active:scale-95 whitespace-nowrap"
            >
              <FileDown size={16} /> <span className="hidden sm:inline">Export CSV</span><span className="sm:hidden">Export</span>
            </button>
          </div>
          
          {/* Filter Chips */}
          <div className="w-full flex flex-wrap gap-2 max-h-24 overflow-y-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
            {LOG_TYPES.map((type) => {
              const Icon = type.icon;
              const count = type.value === "ALL" ? logs.length : logs.filter(l => l.action === type.value).length;
              return (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    filterType === type.value
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-900/30"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-300"
                  }`}
                >
                  <Icon size={12} className="sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">{type.label}</span>
                  <span className="sm:hidden">{type.label.slice(0, 3)}</span>
                  <span className={`px-1 sm:px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    filterType === type.value ? "bg-white/20" : "bg-gray-900"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Logs List */}
        <div 
          ref={logsContainerRef}
          onScroll={handleScroll}
          className="h-[400px] sm:h-[500px] overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary-500 mb-4" size={40} />
              <p className="text-gray-500 text-sm">Loading audit logs...</p>
            </div>
          ) : displayedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-900/50 rounded-xl border border-dashed border-gray-800">
              <Activity size={48} className="text-gray-700 mb-4" />
              <p className="text-gray-500 text-sm">
                {search || filterType !== "ALL" ? "No logs match your filters" : "No activity logs yet"}
              </p>
              {(search || filterType !== "ALL") && (
                <button
                  onClick={() => { setSearch(""); setFilterType("ALL"); }}
                  className="mt-3 text-xs text-primary-400 hover:text-primary-300 underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {displayedLogs.map((log, idx) => {
                const LogIcon = getLogIcon(log.action);
                const logColor = getLogColor(log.action);
                return (
                  <div
                    key={log.id}
                    className="p-3 sm:p-4 bg-gray-900/80 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl flex items-start justify-between group transition-all animate-fade-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`p-2 sm:p-2.5 rounded-lg bg-gray-800 ${logColor} flex-shrink-0`}>
                        <LogIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${logColor} bg-gray-800 w-fit`}>
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-600 font-mono">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 font-medium leading-relaxed break-words">
                          {log.details}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-gray-600 hover:text-white hover:bg-gray-800 p-1.5 sm:p-2 rounded-lg opacity-0 group-hover:opacity-100 sm:opacity-100 transition-all flex-shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                        alert("Log copied to clipboard");
                      }}
                      title="Copy log details"
                    >
                      <Copy size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                );
              })}
              {displayedLogs.length < filteredLogs.length && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-xs mb-2">
                    Showing {displayedLogs.length} of {filteredLogs.length} logs
                  </p>
                  <button
                    onClick={() => setPage(prev => prev + 1)}
                    className="text-primary-400 hover:text-primary-300 text-xs font-semibold underline"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-3 sm:p-4 border-t border-gray-800 bg-gray-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 sm:gap-4 text-gray-500">
            <span className="flex items-center gap-1.5">
              <Activity size={12} />
              Total: <span className="font-bold text-gray-400">{logs.length}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Search size={12} />
              Filtered: <span className="font-bold text-gray-400">{filteredLogs.length}</span>
            </span>
          </div>
          <span className="text-gray-600 font-mono text-xs">
            Last updated: {logs.length > 0 ? new Date(logs[0].created_at).toLocaleTimeString() : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsSettings;