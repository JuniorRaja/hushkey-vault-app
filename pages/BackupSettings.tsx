import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBackupStore } from "../src/stores/backupStore";
import BackupService, { BackupHealth } from "../src/services/backupService";
import {
  Download,
  Upload,
  FileText,
  Archive,
  Shield,
  AlertTriangle,
  History,
  CheckCircle,
  XCircle,
  ChevronLeft,
  Settings,
  Database,
} from "lucide-react";
import BackupOptionCard from "../src/components/BackupOptionCard";

const BackupSettings: React.FC = () => {
  const navigate = useNavigate();
  const { isBackingUp, isRestoring, progress, createBackup, restoreBackup } =
    useBackupStore();

  const [activeTab, setActiveTab] = useState<"backup" | "import">("backup");

  const [selectedFormat, setSelectedFormat] = useState<"hkb" | "csv" | "zip">(
    "hkb"
  );

  // New state for Import/Export tab export format
  const [exportFormat, setExportFormat] = useState<"raw_csv" | "raw_zip">(
    "raw_csv"
  );

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [zipPassword, setZipPassword] = useState("");
  const [hkbPin, setHkbPin] = useState("");
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [health, setHealth] = useState<BackupHealth | null>(null);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    try {
      const h = await BackupService.getBackupHealth();
      setHealth(h);
      const last = await BackupService.getLastBackupDate();
      setLastBackup(last);
    } catch (e) {
      console.error("Failed to load backup health", e);
    }
  };

  /* State for Security Confirmation Modal */
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [pendingBackupArgs, setPendingBackupArgs] = useState<{
    isRaw: boolean;
  } | null>(null);

  const handleBackup = async (isRaw: boolean) => {
    setAlert(null);
    const formatToUse = isRaw ? exportFormat : selectedFormat;

    // Check for unencrypted formats
    if (
      formatToUse === "csv" ||
      formatToUse === "raw_csv" ||
      formatToUse === "raw_zip"
    ) {
      setPendingBackupArgs({ isRaw });
      setShowSecurityWarning(true);
      return;
    }

    // If secure, proceed directly
    await executeBackup(isRaw);
  };

  const executeBackup = async (isRaw: boolean) => {
    const formatToUse = isRaw ? exportFormat : selectedFormat;

    if (formatToUse === "zip" && !zipPassword) {
      setAlert({
        type: "error",
        message: "Please enter a password for ZIP backup",
      });
      return;
    }

    if (formatToUse === "hkb" && !hkbPin) {
      setAlert({
        type: "error",
        message: "Please enter your PIN for the backup",
      });
      return;
    }

    if (formatToUse === "hkb" && hkbPin.length < 4) {
      setAlert({ type: "error", message: "PIN must be at least 4 digits" });
      return;
    }

    try {
      const blob = await createBackup({
        format: formatToUse as any,
        password: formatToUse === "zip" ? zipPassword : undefined,
        pin: formatToUse === "hkb" ? hkbPin : undefined,
        includeAttachments: formatToUse === "raw_zip",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const date = now
        .toISOString()
        .slice(0, 16)
        .replace("T", "-")
        .replace(":", "");

      let ext = "zip";
      if (formatToUse === "hkb") ext = "hkb";
      else if (formatToUse === "csv") ext = "csv";
      if (
        formatToUse === "raw_csv" ||
        formatToUse === "raw_zip" ||
        formatToUse === "csv"
      )
        ext = "zip";

      if (formatToUse === "csv") ext = "csv";

      a.download = `hushkey-export-${date}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setAlert({ type: "success", message: "Export created successfully!" });
      setZipPassword("");
      setHkbPin("");
      loadInfo();
    } catch (error) {
      setAlert({
        type: "error",
        message: "Operation failed: " + (error as Error).message,
      });
    }
  };

  const confirmSecurityWarning = async () => {
    if (pendingBackupArgs) {
      setShowSecurityWarning(false);
      await executeBackup(pendingBackupArgs.isRaw);
      setPendingBackupArgs(null);
    }
  };

  const cancelSecurityWarning = () => {
    setShowSecurityWarning(false);
    setPendingBackupArgs(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-gray-400" />
        </button>
        <h1 className="text-3xl font-bold text-white">Backup & Data</h1>
      </div>

      {alert && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            alert.type === "error"
              ? "bg-red-900/50 text-red-200 border border-red-800"
              : alert.type === "warning"
              ? "bg-yellow-900/50 text-yellow-200 border border-yellow-800"
              : "bg-emerald-900/50 text-emerald-200 border border-emerald-800"
          }`}
        >
          {alert.type === "error" ? (
            <XCircle size={20} />
          ) : alert.type === "warning" ? (
            <AlertTriangle size={20} />
          ) : (
            <CheckCircle size={20} />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab("backup")}
          className={`pb-4 px-6 font-medium text-sm transition-colors relative ${
            activeTab === "backup"
              ? "text-primary-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Backup & Restore
          {activeTab === "backup" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={`pb-4 px-6 font-medium text-sm transition-colors relative ${
            activeTab === "import"
              ? "text-primary-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Import & Export
          {activeTab === "import" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500" />
          )}
        </button>
      </div>

      {activeTab === "backup" ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          {/* Health Card */}
          {health && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      Backup Status
                    </h2>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        health.status === "healthy"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : health.status === "warning"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {health.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {health.recommendation}
                  </p>
                  <div className="flex gap-4 text-xs text-gray-500 mt-2">
                    <span>
                      Last Backup:{" "}
                      {lastBackup ? lastBackup.toLocaleString() : "Never"}
                    </span>
                    <span>Total Backups: {health.totalBackups}</span>
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    health.status === "healthy"
                      ? "bg-emerald-500/10"
                      : health.status === "warning"
                      ? "bg-yellow-500/10"
                      : "bg-red-500/10"
                  }`}
                >
                  <Shield
                    size={32}
                    className={
                      health.status === "healthy"
                        ? "text-emerald-500"
                        : health.status === "warning"
                        ? "text-yellow-500"
                        : "text-red-500"
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Backup */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-600/20 rounded-lg text-primary-400">
                  <Download size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Create Backup</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <BackupOptionCard
                    id="hkb"
                    title="HushKey Backup"
                    description="Encrypted, portable format. Best for full restore."
                    icon={<Shield size={24} />}
                    selected={selectedFormat === "hkb"}
                    onSelect={(id) => setSelectedFormat(id as any)}
                    recommended
                  />
                  <BackupOptionCard
                    id="zip"
                    title="Encrypted ZIP"
                    description="Password-protected archive containing CSV files."
                    icon={<Archive size={24} />}
                    selected={selectedFormat === "zip"}
                    onSelect={(id) => setSelectedFormat(id as any)}
                  />
                </div>

                {selectedFormat === "zip" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium text-gray-400">
                      Archive Password
                    </label>
                    <input
                      type="password"
                      value={zipPassword}
                      onChange={(e) => setZipPassword(e.target.value)}
                      placeholder="Enter password..."
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                )}

                {selectedFormat === "hkb" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium text-gray-400">
                      Set Backup PIN
                    </label>
                    <input
                      type="password"
                      value={hkbPin}
                      onChange={(e) => setHkbPin(e.target.value)}
                      placeholder="Enter PIN (used to restore)"
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-primary-500 focus:outline-none tracking-widest"
                    />
                    <p className="text-xs text-gray-500">
                      You will need this PIN to restore items from this backup.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleBackup(false)}
                  disabled={
                    isBackingUp ||
                    (selectedFormat === "zip" && !zipPassword) ||
                    (selectedFormat === "hkb" && !hkbPin)
                  }
                  className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                    isBackingUp
                      ? "bg-gray-700 cursor-wait"
                      : "bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-900/20"
                  }`}
                >
                  {isBackingUp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {progress
                        ? `${progress.stage} ${Math.round(progress.progress)}%`
                        : "Processing..."}
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Download Backup
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Restore Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
                  <Upload size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Restore Data</h2>
              </div>

              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Restore your data from a previous HushKey backup file (.hkb) or
                an encrypted ZIP.
                <br />
                <br />
                <span className="text-yellow-500">Warning:</span> Restoring may
                overwrite existing items with the same ID.
              </p>

              <button
                // Navigate to import page primarily now, as we unified flow
                onClick={() => navigate("/import")}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all border border-gray-700 flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Select Backup File
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Import Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
                  <Upload size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Import Data</h2>
              </div>

              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Import data from HushKey exports (CSV/ZIP) or other password
                managers.
                <br />
                <br />
                Use the unified import tool to preview items, vaults, and
                categories before importing.
              </p>

              <button
                onClick={() => navigate("/import")}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Start Import Wizard
              </button>
            </div>

            {/* Export Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-600/20 rounded-lg text-emerald-400">
                  <Download size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Export Data</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <BackupOptionCard
                    id="raw_csv"
                    title="Raw CSV Export"
                    description="Unencrypted ZIP containing CSVs for Vaults, Items, and Categories."
                    icon={<Database size={24} />}
                    selected={exportFormat === "raw_csv"}
                    onSelect={(id) => setExportFormat(id as any)}
                    warning
                  />
                  <BackupOptionCard
                    id="raw_zip"
                    title="Raw ZIP Export"
                    description="Unencrypted ZIP containing all data + file attachments."
                    icon={<FileText size={24} />}
                    selected={exportFormat === "raw_zip"}
                    onSelect={(id) => setExportFormat(id as any)}
                    warning
                  />
                </div>

                <button
                  onClick={() => handleBackup(true)}
                  disabled={isBackingUp}
                  className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                    isBackingUp
                      ? "bg-gray-700 cursor-wait"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
                  }`}
                >
                  {isBackingUp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {progress
                        ? `${progress.stage} ${Math.round(progress.progress)}%`
                        : "Processing..."}
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Export Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Warning Modal */}
      {showSecurityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-red-900/50 rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">
                Unencrypted Export
              </h3>
              <p className="text-gray-300">
                WARNING: This export format is NOT encrypted! Your passwords
                will be in plain text.
                <br />
                <br />
                Are you sure you want to continue?
              </p>
              <div className="flex gap-3 w-full mt-4">
                <button
                  onClick={cancelSecurityWarning}
                  className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSecurityWarning}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupSettings;
