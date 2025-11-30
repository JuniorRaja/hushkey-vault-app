import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useData } from "../App";
import { useAuthStore } from "../src/stores/authStore";
import { useCategoryStore } from "../src/stores/categoryStore";
import DatabaseService from "../src/services/database";
import { supabase } from "../src/supabaseClient";
import { LogEntry, AppSettings, Category, AccentColor } from "../types";
import { storageService } from "../services/storage";
import { BiometricService } from "../src/services/biometric";
import {
  User,
  Shield,
  Clock,
  Download,
  LogOut,
  ChevronRight,
  Activity,
  Lock,
  Smartphone,
  AlertTriangle,
  FileText,
  RefreshCw,
  X,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Search,
  FileDown,
  Trash2,
  HardDrive,
  ShieldAlert,
  Monitor,
  Palette,
  Upload,
  Layers,
  Plus,
  Edit2,
  History,
  ScanFace,
  Loader2,
  Bell,
} from "lucide-react";

// --- UI Components ---

const ToggleSwitch = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${
      checked ? "bg-primary-600" : "bg-gray-700"
    }`}
  >
    <div
      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 shadow-md ${
        checked ? "left-7" : "left-1"
      }`}
    />
  </button>
);

const CustomDropdown = ({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: any; icon?: any }[];
  value: any;
  onChange: (val: any) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find((o) => o.value === value);
  const SelectedIcon = selectedOpt?.icon;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-2 text-sm font-medium text-gray-200 transition-colors min-w-[150px] justify-between shadow-sm"
      >
        <div className="flex items-center gap-2">
          {SelectedIcon && <SelectedIcon size={14} className="text-gray-400" />}
          <span>{selectedOpt?.label || value}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in origin-top-right ring-1 ring-black/5">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={String(opt.value)}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 text-gray-300 hover:text-white flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {Icon && <Icon size={14} className="text-gray-500" />}
                  {opt.label}
                </div>
                {value === opt.value && (
                  <Check size={14} className="text-primary-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ModalLayout = ({
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: any) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    onClick={onClose}
  >
    <div
      className={`bg-gray-900 border border-gray-800 rounded-2xl w-full ${maxWidth} shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-1 bg-gray-800/50 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);

// --- Section Components ---

const CategoriesModal = ({ onClose }: { onClose: () => void }) => {
  const { items } = useData();
  const { categories, isLoading, loadCategories, addCategory, deleteCategory } = useCategoryStore();
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("bg-gray-500");
  const [deleteConfirm, setDeleteConfirm] = useState<{ category: Category; linkedItemsCount: number } | null>(null);

  const COLORS = [
    "bg-blue-500",
    "bg-green-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-orange-500",
    "bg-gray-500",
  ];

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    try {
      await addCategory(newCatName.trim(), newCatColor);
      setNewCatName("");
    } catch (err: any) {
      alert("Error creating category: " + err.message);
    }
  };

  const handleDeleteClick = (category: Category) => {
    const linkedItemsCount = items.filter(item => item.categoryId === category.id).length;
    setDeleteConfirm({ category, linkedItemsCount });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteCategory(deleteConfirm.category.id);
      setDeleteConfirm(null);
    } catch (err: any) {
      alert("Error deleting category: " + err.message);
    }
  };

  return (
    <>
    <ModalLayout
      title="Manage Categories"
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="p-5 space-y-6">
        {/* Add New */}
        <div className="bg-gray-950/50 border border-gray-800 p-4 rounded-xl space-y-3">
          <label className="text-xs font-bold text-gray-500 uppercase">
            Create New Category
          </label>
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
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewCatColor(color)}
                className={`w-6 h-6 rounded-full ${color} shrink-0 transition-transform ${
                  newCatColor === color
                    ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-gray-900"
                    : "opacity-70 hover:opacity-100"
                }`}
              />
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase">
            Existing Categories ({categories.length})
          </label>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-primary-500" size={20} /></div>
            ) : (
              categories.map((cat) => {
                const linkedItemsCount = items.filter(item => item.categoryId === cat.id).length;
                return (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-lg group hover:border-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                      <div>
                        <span className="text-sm font-medium text-gray-200">{cat.name}</span>
                        {linkedItemsCount > 0 && <div className="text-xs text-gray-500">{linkedItemsCount} item{linkedItemsCount !== 1 ? 's' : ''}</div>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteClick(cat)} className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
            {!isLoading && categories.length === 0 && (
              <div className="text-center text-gray-600 text-sm py-4">No categories created.</div>
            )}
          </div>
        </div>
      </div>
    </ModalLayout>
    {deleteConfirm && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Category</h3>
            <p className="text-gray-400 text-sm mb-6">
              {deleteConfirm.linkedItemsCount > 0
                ? `This category has ${deleteConfirm.linkedItemsCount} linked item${deleteConfirm.linkedItemsCount !== 1 ? 's' : ''}. Items will become uncategorized.`
                : `Delete "${deleteConfirm.category.name}"?`}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
            <button onClick={handleDeleteConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors">Delete</button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

const BackupModal = ({ onClose }: { onClose: () => void }) => {
  const { items, vaults, addLog } = useData();

  const handleExport = (type: "xls" | "zip") => {
    if (type === "xls") {
      if (
        !window.confirm(
          "WARNING: This will export your passwords in an unencrypted CSV file. Anyone with this file can see your passwords. Continue?"
        )
      )
        return;
    }

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ items, vaults }, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `sentinel_export_${
        type === "xls" ? "UNENCRYPTED" : "SECURE"
      }_${new Date().toISOString()}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addLog("EXPORT", `Exported data as ${type.toUpperCase()}`);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv,.xlsx";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        alert(`Importing ${file.name}... (Simulation: 5 items added)`);
        addLog("CREATE", `Imported data from ${file.name}`);
        window.location.reload();
      }
    };
    input.click();
  };

  return (
    <ModalLayout
      title={
        <span className="flex items-center gap-2">
          <HardDrive size={18} /> Backup & Data
        </span>
      }
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Column */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-300">
                Export your data for safekeeping.
              </h4>
            </div>

            <button
              onClick={() => handleExport("xls")}
              className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-900/50 border border-gray-700 flex items-center justify-center text-green-500">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-gray-200">
                    Export .CSV (Excel)
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase mt-1">
                    <AlertTriangle size={10} /> Unencrypted
                  </div>
                </div>
              </div>
              <Download
                size={18}
                className="text-gray-500 group-hover:text-white"
              />
            </button>

            <button
              onClick={() => handleExport("zip")}
              className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-900/50 border border-gray-700 flex items-center justify-center text-purple-500">
                  <Lock size={20} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-gray-200">
                    Export Encrypted .ZIP
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 mt-1">
                    Requires Master Password
                  </div>
                </div>
              </div>
              <Download
                size={18}
                className="text-gray-500 group-hover:text-white"
              />
            </button>
          </div>

          {/* Import Column */}
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300">
                Restore data from a backup file.
              </h4>
            </div>

            <button
              onClick={handleImport}
              className="flex-1 w-full min-h-[140px] flex flex-col items-center justify-center gap-4 bg-gray-950/30 border-2 border-dashed border-gray-800 hover:border-primary-500/50 hover:bg-gray-900/50 rounded-xl transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-gray-500 group-hover:text-primary-400 group-hover:scale-110 transition-all">
                <Upload size={24} />
              </div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200">
                Import Backup File
              </span>
            </button>
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-gray-800 bg-gray-950/50 text-xs text-gray-500 flex justify-between items-center">
        <span className="flex items-center gap-2 font-mono">
          <History size={12} /> Last Backup:{" "}
          <span className="text-gray-400">Never</span>
        </span>
        <span className="flex items-center gap-1 text-orange-400/80">
          <AlertTriangle size={12} /> Always verify your exports.
        </span>
      </div>
    </ModalLayout>
  );
};

const ProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { user: authUser } = useAuthStore();
  const { items, vaults } = useData();
  const [name, setName] = useState(authUser?.name || authUser?.email || "");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataConfirmText, setClearDataConfirmText] = useState("");

  const handleClearData = async () => {
    if (clearDataConfirmText !== "yes, delete") {
      alert('Please type "yes, delete" to confirm');
      return;
    }
    
    setIsLoading(true);
    try {
      if (!authUser) throw new Error("User not authenticated");
      
      await DatabaseService.clearAllUserData(authUser.id);
      storageService.clearDataOnly();
      await storageService.clearIndexedDB();
      
      alert("All data cleared successfully. Redirecting...");
      window.location.href = "/dashboard";
    } catch (err: any) {
      alert("Error clearing data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!authUser) return;
    const masterKey = useAuthStore.getState().masterKey;
    if (!masterKey) {
      alert("Master key not available");
      return;
    }
    setIsLoading(true);
    try {
      await DatabaseService.updateUserProfileName(authUser.id, name, masterKey);
      useAuthStore.getState().updateUserProfile({ name });
      alert("Profile updated successfully");
      onClose();
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert("Password changed successfully");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      alert("Error changing password: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePin = async () => {
    if (newPin !== confirmPin) {
      alert("PINs do not match");
      return;
    }
    if (newPin.length !== 6) {
      alert("PIN must be 6 digits");
      return;
    }
    setIsLoading(true);
    try {
      await useAuthStore.getState().setupMasterPin(newPin);
      alert("PIN changed successfully");
      setShowPinModal(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      alert("Error changing PIN: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalLayout title="My Profile" onClose={onClose} maxWidth="max-w-lg">
      <div className="p-6 space-y-6">
        {/* Header Stats */}
        <div className="flex items-center gap-4 pb-6 border-b border-gray-800">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary-900/40">
            {(authUser?.name || authUser?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-xl font-bold text-white">{authUser?.name || authUser?.email}</h4>
            <p className="text-gray-400 text-sm">{authUser?.email}</p>
            <div className="flex gap-4 mt-2 text-xs font-medium text-gray-500">
              <span className="px-2 py-0.5 bg-gray-800 rounded">
                {items.length} Items
              </span>
              <span className="px-2 py-0.5 bg-gray-800 rounded">
                {vaults.length} Vaults
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={authUser?.email}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Email (Read-only)
            </label>
            <input
              value={authUser?.email || ""}
              disabled
              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors border border-gray-700"
            onClick={() => setShowPasswordModal(true)}
          >
            Change Password
          </button>
          <button
            className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors border border-gray-700"
            onClick={() => setShowPinModal(true)}
          >
            Change Master PIN
          </button>
        </div>

        {showPasswordModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-lg font-bold text-white">Change Password</h4>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                <button onClick={handleChangePassword} disabled={isLoading} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">{isLoading ? "Saving..." : "Save"}</button>
              </div>
            </div>
          </div>
        )}

        {showPinModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPinModal(false)}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-lg font-bold text-white">Change Master PIN</h4>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">New PIN (6 digits)</label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Confirm PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPinModal(false)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                <button onClick={handleChangePin} disabled={isLoading} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">{isLoading ? "Saving..." : "Save"}</button>
              </div>
            </div>
          </div>
        )}

        {showClearDataModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowClearDataModal(false)}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Clear All Data</h4>
                <p className="text-gray-400 text-sm mb-4">
                  This will permanently delete all vaults, items, categories, file attachments, devices, and preferences. Auth and profile will be preserved.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Type "yes, delete" to confirm</label>
                <input
                  type="text"
                  value={clearDataConfirmText}
                  onChange={(e) => setClearDataConfirmText(e.target.value)}
                  placeholder="yes, delete"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowClearDataModal(false); setClearDataConfirmText(""); }} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                <button onClick={handleClearData} disabled={isLoading || clearDataConfirmText !== "yes, delete"} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">{isLoading ? "Clearing..." : "Clear Data"}</button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-gray-800">
          <h5 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle size={16} /> Danger Zone
          </h5>
          <div className="space-y-3">
            <button
              onClick={() => setShowClearDataModal(true)}
              className="w-full py-3 bg-red-900/10 hover:bg-red-900/20 border border-red-900/30 text-red-400 rounded-xl text-sm font-bold transition-colors"
            >
              Clear All Data
            </button>
            <p className="text-[10px] text-gray-600 text-center">
              Deletes vaults, items, categories, file attachments, devices, and preferences. Auth and profile preserved.
            </p>
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    "CRITICAL WARNING: This will permanently delete your account and ALL data from the server. This cannot be undone. Are you absolutely sure?"
                  )
                ) {
                  if (window.confirm("Final confirmation: Delete account permanently?")) {
                    try {
                      const userId = useAuthStore.getState().user?.id;
                      if (userId) {
                        await DatabaseService.deleteUserAccount(userId);
                        await useAuthStore.getState().signOut();
                        window.location.href = "/login";
                      }
                    } catch (err: any) {
                      alert("Error deleting account: " + err.message);
                    }
                  }
                }
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 border border-red-500 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Delete Account Permanently
            </button>
            <p className="text-[10px] text-gray-600 text-center">
              Deletes your account and all data from the server. Cannot be recovered.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-900/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </ModalLayout>
  );
};

const LogsModal = ({ onClose }: { onClose: () => void }) => {
  const { user: authUser } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [displayedLogs, setDisplayedLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const loadLogs = async () => {
      if (!authUser) return;
      setIsLoading(true);
      try {
        const data = await DatabaseService.getActivityLogs(authUser.id, 1000);
        setLogs(data);
        setDisplayedLogs(data.slice(0, ITEMS_PER_PAGE));
        setPage(1);
      } catch (err) {
        console.error("Error loading logs:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, [authUser]);

  const filteredLogs = logs.filter(
    (l) =>
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setDisplayedLogs(filteredLogs.slice(0, page * ITEMS_PER_PAGE));
  }, [search, page, filteredLogs.length]);

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
      ...logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.action,
        log.details
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hushkey_activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ModalLayout title="Activity Logs" onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col h-[600px] max-h-[80vh]">
        <div className="p-4 border-b border-gray-800 flex gap-3 bg-gray-950/30">
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
              className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-primary-500 outline-none placeholder-gray-600"
            />
          </div>
          <button
            onClick={handleDownload}
            disabled={logs.length === 0}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={16} /> Export
          </button>
        </div>
        <div 
          ref={logsContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary-500" size={32} />
            </div>
          ) : (
            <>
              {displayedLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 hover:bg-gray-800/50 rounded-lg flex justify-between items-start group transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 p-1.5 rounded bg-gray-800 text-[10px] font-bold uppercase tracking-wider min-w-[60px] text-center ${
                        log.action === "DELETE"
                          ? "text-red-400"
                          : log.action === "CREATE"
                          ? "text-green-400"
                          : log.action === "LOGIN"
                          ? "text-blue-400"
                          : "text-gray-400"
                      }`}
                    >
                      {log.action}
                    </div>
                    <div>
                      <p className="text-sm text-gray-300 font-medium">
                        {log.details}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() =>
                      navigator.clipboard.writeText(JSON.stringify(log))
                    }
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ))}
              {displayedLogs.length === 0 && !isLoading && (
                <div className="text-center py-10 text-gray-500 text-sm">
                  {search ? "No logs found matching search." : "No activity logs yet."}
                </div>
              )}
              {displayedLogs.length < filteredLogs.length && (
                <div className="text-center py-4 text-gray-500 text-xs">
                  Showing {displayedLogs.length} of {filteredLogs.length} logs
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ModalLayout>
  );
};

const TextModal = ({ title, onClose, content }: any) => (
  <ModalLayout title={title} onClose={onClose} maxWidth="max-w-2xl">
    <div className="p-6 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
      {content}
    </div>
    <div className="p-4 border-t border-gray-800 bg-gray-950/50">
      <button
        onClick={onClose}
        className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
      >
        Close
      </button>
    </div>
  </ModalLayout>
);

const NOTIFICATION_CONFIGS = [
  { key: "newDeviceLogin", label: "New Device Login Alert", desc: "When your account is accessed from a new browser." },
  { key: "failedLoginAttempts", label: "Failed Login Attempts", desc: "Notify on incorrect PIN or biometric failures." },
  { key: "weakPasswordAlerts", label: "Weak/Reused Passwords", desc: "Guardian analysis alerts for vulnerable credentials." },
  { key: "expiryReminders", label: "Expiry Reminders", desc: "Notify before cards or IDs expire (30 days)." },
  { key: "backupHealth", label: "Backup Health", desc: "Alert if backup is outdated or fails." },
  { key: "monthlyReport", label: "Monthly Security Report", desc: "Regular summary of your vault health." },
  { key: "sessionAlerts", label: "Session Monitoring", desc: "Alerts for unusual session activity." },
  { key: "sharedVaultUpdates", label: "Shared Vault Updates", desc: "Notify when items are changed in shared vaults." },
];

const Settings: React.FC = () => {
  const { user: oldUser, logout: oldLogout } = useAuth();
  const { user: authUser, lock, signOut: authSignOut, setUnlockMethod, unlockMethod: authUnlockMethod, autoLockMinutes } = useAuthStore();
  const navigate = useNavigate();
  const { items, vaults, logs, settings, updateSettings, addLog } = useData();
  const [userSettings, setUserSettings] = useState<any>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const truncateText = (text: string, maxLength: number = 12) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (!authUser) return;
      try {
        const dbSettings = await DatabaseService.getUserSettings(authUser.id);
        setUserSettings(dbSettings);
        // Map database settings to local settings format
        if (dbSettings) {
          updateSettings({
            ...settings,
            autoLockMinutes: dbSettings.auto_lock_minutes ?? settings.autoLockMinutes,
            clipboardClearSeconds: dbSettings.clipboard_clear_seconds ?? settings.clipboardClearSeconds,
            allowScreenshots: dbSettings.allow_screenshots ?? settings.allowScreenshots,
            unlockMethod: dbSettings.unlock_method ?? settings.unlockMethod,
            groupItemsByCategory: dbSettings.group_items_by_category ?? settings.groupItemsByCategory,
            accentColor: dbSettings.accent_color ?? settings.accentColor,
            notifications: {
              ...settings.notifications,
              newDeviceLogin: dbSettings.notify_new_device_login ?? settings.notifications.newDeviceLogin,
              failedLoginAttempts: dbSettings.notify_failed_login_attempts ?? settings.notifications.failedLoginAttempts,
              weakPasswordAlerts: dbSettings.notify_weak_password_alerts ?? settings.notifications.weakPasswordAlerts,
              expiryReminders: dbSettings.notify_expiry_reminders ?? settings.notifications.expiryReminders,
              backupHealth: dbSettings.notify_backup_health ?? settings.notifications.backupHealth,
              monthlyReport: dbSettings.notify_monthly_report ?? settings.notifications.monthlyReport,
              sessionAlerts: dbSettings.notify_session_alerts ?? settings.notifications.sessionAlerts,
              sharedVaultUpdates: dbSettings.notify_shared_vault_updates ?? settings.notifications.sharedVaultUpdates,
              pushNotifications: dbSettings.notify_push_notifications ?? settings.notifications.pushNotifications,
              emailNotifications: dbSettings.notify_email_notifications ?? settings.notifications.emailNotifications,
            },
          });
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, [authUser]);

  const saveSettingsToDB = async (newSettings: any) => {
    if (!authUser) return;
    try {
      await DatabaseService.saveUserSettings(authUser.id, newSettings);
      setUserSettings(newSettings);
    } catch (err: any) {
      alert("Error saving settings: " + err.message);
    }
  };

  // Modals
  const [activeModal, setActiveModal] = useState<
    "profile" | "logs" | "categories" | "backup" | "privacy" | "terms" | null
  >(null);

  // Notification Drawer
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  // Biometric Verification State
  const [verifyingBiometric, setVerifyingBiometric] = useState(false);

  // Handlers
  const handleSettingChange = async (key: string, value: any) => {
    const keyMapping: Record<string, string> = {
      groupItemsByCategory: 'group_items_by_category',
      accentColor: 'accent_color',
    };
    const dbKey = keyMapping[key] || key;
    const newSettings = { ...userSettings, [dbKey]: value };
    await saveSettingsToDB(newSettings);
    updateSettings({ ...settings, [key]: value });
  };

  // Map UI notification keys to database column names
  const notificationKeyMap: Record<string, string> = {
    newDeviceLogin: 'notify_new_device_login',
    failedLoginAttempts: 'notify_failed_login_attempts',
    weakPasswordAlerts: 'notify_weak_password_alerts',
    expiryReminders: 'notify_expiry_reminders',
    backupHealth: 'notify_backup_health',
    monthlyReport: 'notify_monthly_report',
    sessionAlerts: 'notify_session_alerts',
    sharedVaultUpdates: 'notify_shared_vault_updates',
    pushNotifications: 'notify_push_notifications',
    emailNotifications: 'notify_email_notifications',
  };

  const handleNotificationChange = async (
    key: string,
    value: boolean
  ) => {
    const dbKey = notificationKeyMap[key] || key;
    const newSettings = { ...userSettings, [dbKey]: value };
    await saveSettingsToDB(newSettings);
    updateSettings({
      ...settings,
      notifications: { ...settings.notifications, [key]: value },
    });
  };

  const handleUnlockMethodChange = async (
    val: "pin" | "biometric" | "password"
  ) => {
    if (val === "biometric") {
      if (!await BiometricService.isAvailable()) {
        alert("Biometric authentication is not available on this device.");
        return;
      }
      setVerifyingBiometric(true);
      try {
        if (!authUser) throw new Error("User not authenticated");
        await BiometricService.register(authUser.id);
        setUnlockMethod(val);
        await handleSettingChange("unlock_method", val);
        alert("Face ID / Touch ID enabled successfully.");
      } catch (err: any) {
        alert("Biometric setup failed: " + err.message);
      } finally {
        setVerifyingBiometric(false);
      }
    } else {
      setUnlockMethod(val);
      await handleSettingChange("unlock_method", val);
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      updateSettings({ ...settings, lastSync: new Date().toISOString() });
      addLog("SYNC", "Forced manual synchronization");
      setIsSyncing(false);
    }, 1500);
  };

  const colorOptions: { label: string; value: AccentColor; color: string }[] = [
    { label: "Violet (Default)", value: "violet", color: "#8b5cf6" },
    { label: "Blue", value: "blue", color: "#3b82f6" },
    { label: "Emerald", value: "emerald", color: "#10b981" },
    { label: "Rose", value: "rose", color: "#f43f5e" },
    { label: "Amber", value: "amber", color: "#f59e0b" },
    { label: "Cyan", value: "cyan", color: "#06b6d4" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Modals */}
      {activeModal === "profile" && (
        <ProfileModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "logs" && (
        <LogsModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "categories" && (
        <CategoriesModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "backup" && (
        <BackupModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "privacy" && (
        <TextModal
          title="Privacy Policy"
          onClose={() => setActiveModal(null)}
          content="Privacy Policy Placeholder..."
        />
      )}
      {activeModal === "terms" && (
        <TextModal
          title="Terms of Service"
          onClose={() => setActiveModal(null)}
          content="Terms of Service Placeholder..."
        />
      )}

      <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>

      {/* 1. Profile Section */}
      <div
        onClick={() => setActiveModal("profile")}
        className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 flex items-center justify-between cursor-pointer group transition-all shadow-lg hover:shadow-xl"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary-900/40 group-hover:scale-105 transition-transform">
            {(authUser?.name || authUser?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">
              <span className="hidden md:inline">{authUser?.name || authUser?.email}</span>
              <span className="md:hidden">{truncateText(authUser?.name || authUser?.email || '', 12)}</span>
            </h2>
            <p className="text-gray-400">
              <span className="hidden md:inline">{authUser?.email}</span>
              <span className="md:hidden">{truncateText(authUser?.email || '', 12)}</span>
            </p>
            <div className="flex gap-4 mt-2 text-xs font-medium text-gray-500">
              <span className="bg-gray-800 px-2 py-0.5 rounded">
                {items.length} Items
              </span>
              <span className="bg-gray-800 px-2 py-0.5 rounded">
                {vaults.length} Vaults
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 p-2 rounded-full text-gray-500 group-hover:bg-primary-600 group-hover:text-white transition-all">
          <ChevronRight size={20} />
        </div>
      </div>

      {/* 2. Security Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 flex items-center gap-2">
          <Shield size={14} /> Security
        </h3>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-visible divide-y divide-gray-800">
          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Lock size={18} />
              </div>
              <div>
                <span className="text-gray-200 font-medium block">
                  Unlock Method
                </span>
                {verifyingBiometric && (
                  <span className="text-[10px] text-primary-400 flex items-center gap-1 mt-0.5">
                    <Loader2 size={10} className="animate-spin" /> Verifying...
                  </span>
                )}
              </div>
            </div>
            <CustomDropdown
              value={settings.unlockMethod}
              onChange={(val) => handleUnlockMethodChange(val)}
              options={[
                { label: "PIN Code", value: "pin", icon: Lock },
                {
                  label: "Face ID / Touch ID",
                  value: "biometric",
                  icon: ScanFace,
                },
                { label: "Password", value: "password", icon: Lock },
              ]}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Clock size={18} />
              </div>
              <span className="text-gray-200 font-medium">Auto Lock</span>
            </div>
            <CustomDropdown
              value={userSettings?.auto_lock_minutes ?? autoLockMinutes}
              onChange={(val) => handleSettingChange("auto_lock_minutes", val)}
              options={[
                { label: "Immediately", value: 0 },
                { label: "1 Minute", value: 1 },
                { label: "5 Minutes", value: 5 },
                { label: "15 Minutes", value: 15 },
                { label: "1 Hour", value: 60 },
                { label: "Never", value: -1 },
              ]}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Copy size={18} />
              </div>
              <span className="text-gray-200 font-medium">Clear Clipboard</span>
            </div>
            <CustomDropdown
              value={userSettings?.clipboard_clear_seconds ?? settings.clipboardClearSeconds}
              onChange={(val) =>
                handleSettingChange("clipboard_clear_seconds", val)
              }
              options={[
                { label: "10 Seconds", value: 10 },
                { label: "30 Seconds", value: 30 },
                { label: "60 Seconds", value: 60 },
                { label: "Never", value: 0 },
              ]}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Monitor size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-gray-200 font-medium">
                  Allow Screenshots
                </span>
                <span className="text-xs text-gray-500">Android/iOS only</span>
              </div>
            </div>
            <ToggleSwitch
              checked={userSettings?.allow_screenshots ?? settings.allowScreenshots}
              onChange={(val) => handleSettingChange("allow_screenshots", val)}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Trash2 size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-gray-200 font-medium">Auto-Delete Trash</span>
                <span className="text-xs text-gray-500">Permanently delete after</span>
              </div>
            </div>
            <CustomDropdown
              value={userSettings?.auto_delete_days ?? 30}
              onChange={(val) => handleSettingChange("auto_delete_days", val)}
              options={[
                { label: "7 Days", value: 7 },
                { label: "14 Days", value: 14 },
                { label: "30 Days", value: 30 },
                { label: "60 Days", value: 60 },
                { label: "90 Days", value: 90 },
                { label: "Never", value: 0 },
              ]}
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
            onClick={() => setActiveModal("backup")}
            className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <HardDrive size={18} />
              </div>
              <div>
                <span className="text-gray-200 font-medium block">
                  Backup & Import
                </span>
                <span className="text-[10px] text-gray-500">
                  Last backup: Never
                </span>
              </div>
            </div>
            <ChevronRight
              size={18}
              className="text-gray-600 group-hover:text-white"
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Palette size={18} />
              </div>
              <span className="text-gray-200 font-medium">Appearance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      handleSettingChange("accentColor", opt.value)
                    }
                    className={`w-5 h-5 rounded-md transition-all ${
                      settings.accentColor === opt.value
                        ? "ring-2 ring-white scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: opt.color }}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Layers size={18} />
              </div>
              <div>
                <span className="text-gray-200 font-medium block">
                  Category Grouping
                </span>
                <span className="text-[10px] text-gray-500">
                  Group items by category in lists
                </span>
              </div>
            </div>
            <ToggleSwitch
              checked={userSettings?.group_items_by_category ?? settings.groupItemsByCategory}
              onChange={(val) =>
                handleSettingChange("groupItemsByCategory", val)
              }
            />
          </div>

          <div
            onClick={() => setActiveModal("categories")}
            className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Edit2 size={18} />
              </div>
              <span className="text-gray-200 font-medium">
                Manage Categories
              </span>
            </div>
            <ChevronRight
              size={18}
              className="text-gray-600 group-hover:text-white"
            />
          </div>

          <div
            onClick={() => setActiveModal("logs")}
            className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Activity size={18} />
              </div>
              <span className="text-gray-200 font-medium">Audit Logs</span>
            </div>
            <ChevronRight
              size={18}
              className="text-gray-600 group-hover:text-white"
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Smartphone size={18} />
              </div>
              <div>
                <span className="text-gray-200 font-medium block">Push Notifications</span>
                <span className="text-[10px] text-gray-500">Browser/Device alerts</span>
              </div>
            </div>
            <ToggleSwitch
              checked={settings.notifications.pushNotifications}
              onChange={(val) => handleNotificationChange("pushNotifications", val)}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Bell size={18} />
              </div>
              <div>
                <span className="text-gray-200 font-medium block">Email Notifications</span>
                <span className="text-[10px] text-gray-500">Send to <span className="hidden md:inline">{authUser?.email}</span><span className="md:hidden">{truncateText(authUser?.email || '', 12)}</span></span>
              </div>
            </div>
            <ToggleSwitch
              checked={settings.notifications.emailNotifications}
              onChange={(val) => handleNotificationChange("emailNotifications", val)}
            />
          </div>

          <div
            onClick={() => setShowNotificationDrawer(true)}
            className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Bell size={18} />
              </div>
              <div>
                <span className="text-gray-200 font-medium block">More Notification Settings</span>
                <span className="text-[10px] text-gray-500">Configure alert preferences</span>
              </div>
            </div>
            <ChevronRight
              size={18}
              className="text-gray-600 group-hover:text-white"
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <RefreshCw
                  size={18}
                  className={isSyncing ? "animate-spin" : ""}
                />
              </div>
              <div>
                <span className="text-gray-200 font-medium block">
                  Sync Status
                </span>
                <span className="text-[10px] text-gray-500">
                  Last sync: {new Date(settings.lastSync).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold uppercase rounded-lg text-gray-300 transition-colors border border-gray-700"
            >
              {isSyncing ? "Syncing..." : "Force Sync"}
            </button>
          </div>

          <div className="p-4 flex items-center gap-4">
            <button
              onClick={() => setActiveModal("privacy")}
              className="text-xs text-gray-500 hover:text-white underline"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveModal("terms")}
              className="text-xs text-gray-500 hover:text-white underline"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => {
            lock();
            navigate("/login");
          }}
          className="w-full flex items-center justify-center gap-2 py-4 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl transition-colors font-medium border border-transparent hover:border-amber-500/20"
        >
          <Lock size={20} />
          Lock Vault
        </button>

        <button
          onClick={async () => {
            await authSignOut();
            navigate("/login");
          }}
          className="w-full flex items-center justify-center gap-2 py-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors font-medium border border-transparent hover:border-red-500/20"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>

      <div className="text-center text-[10px] text-gray-600 pb-8 flex flex-col gap-1">
        <span className="font-bold">HUSHKEY VAULT</span>
        <span>Version 2.5.0 (Build 2024.10.15)</span>
        <span>© 2024 Hushkey Security Inc.</span>
      </div>

      {/* Notification Settings Drawer */}
      {showNotificationDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowNotificationDrawer(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-primary-500" />
                <h3 className="text-lg font-bold text-white">Notification Settings</h3>
              </div>
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="text-gray-500 hover:text-white transition-colors p-1 bg-gray-800/50 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-5 space-y-1">
                {NOTIFICATION_CONFIGS.map((item) => (
                  <div
                    key={item.key}
                    className="p-4 flex items-center justify-between hover:bg-gray-800/50 rounded-xl transition-colors"
                  >
                    <div className="flex-1 pr-4">
                      <span className="text-gray-200 font-medium text-sm block mb-1">{item.label}</span>
                      <span className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</span>
                    </div>
                    <ToggleSwitch
                      checked={(settings.notifications as any)[item.key]}
                      onChange={(val) => handleNotificationChange(item.key as any, val)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 bg-gray-950/50">
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
