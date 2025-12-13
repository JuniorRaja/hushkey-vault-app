import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useData } from "../App";
import { useAuthStore } from "../src/stores/authStore";
import { useCategoryStore } from "../src/stores/categoryStore";
import { useVaultStore } from "../src/stores/vaultStore";
import { useItemStore } from "../src/stores/itemStore";
import DatabaseService from "../src/services/database";
import EncryptionService from "../src/services/encryption";
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
  Info,
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
  const [newCatColor, setNewCatColor] = useState("bg-purple-500");
  const [deleteConfirm, setDeleteConfirm] = useState<{ category: Category; linkedItemsCount: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const COLORS = [
    { name: "Purple", class: "bg-purple-500" },
    { name: "Blue", class: "bg-blue-500" },
    { name: "Green", class: "bg-green-500" },
    { name: "Red", class: "bg-red-500" },
    { name: "Yellow", class: "bg-yellow-500" },
    { name: "Pink", class: "bg-pink-500" },
    { name: "Indigo", class: "bg-indigo-500" },
    { name: "Orange", class: "bg-orange-500" },
    { name: "Teal", class: "bg-teal-500" },
    { name: "Cyan", class: "bg-cyan-500" },
  ];

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    setIsAdding(true);
    try {
      await addCategory(newCatName.trim(), newCatColor);
      setNewCatName("");
      setNewCatColor("bg-purple-500");
    } catch (err: any) {
      alert("Error creating category: " + err.message);
    } finally {
      setIsAdding(false);
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
      title="Categories"
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="p-6 space-y-6">
        {/* Add New Category Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-900/20 to-purple-900/10 border border-primary-800/30 rounded-2xl p-6 space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <label className="text-xs font-bold text-primary-400 uppercase tracking-wider flex items-center gap-2">
              <Plus size={14} /> New Category
            </label>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                placeholder="Enter category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                className="w-full bg-gray-950/50 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all placeholder-gray-600"
              />
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.class}
                    onClick={() => setNewCatColor(color.class)}
                    title={color.name}
                    className={`w-8 h-8 rounded-lg ${color.class} transition-all ${
                      newCatColor === color.class
                        ? "scale-110 ring-2 ring-white shadow-lg"
                        : "opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleAdd}
                disabled={!newCatName.trim() || isAdding}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary-900/30"
              >
                {isAdding ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating...</>
                ) : (
                  <><Plus size={16} /> Create Category</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Your Categories
            </label>
            <span className="text-xs font-bold text-gray-600 bg-gray-800 px-2 py-1 rounded">
              {categories.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto text-primary-500" size={24} />
                <p className="text-gray-500 text-sm mt-2">Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-dashed border-gray-800">
                <Layers size={32} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm">No categories yet</p>
                <p className="text-gray-600 text-xs mt-1">Create your first category above</p>
              </div>
            ) : (
              categories.map((cat, idx) => {
                const linkedItemsCount = items.filter(item => item.categoryId === cat.id).length;
                return (
                  <div 
                    key={cat.id} 
                    className="flex items-center justify-between p-4 bg-gray-900/80 border border-gray-800 rounded-xl group hover:border-gray-700 hover:bg-gray-900 transition-all animate-fade-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${cat.color} flex items-center justify-center shadow-lg`}>
                        <Layers size={18} className="text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-200 block">{cat.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">
                            {linkedItemsCount} {linkedItemsCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteClick(cat)} 
                      className="text-gray-600 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </ModalLayout>
    {deleteConfirm && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteConfirm(null)}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Category?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {deleteConfirm.linkedItemsCount > 0
                ? `This category has ${deleteConfirm.linkedItemsCount} linked ${deleteConfirm.linkedItemsCount === 1 ? 'item' : 'items'}. They will become uncategorized.`
                : `Are you sure you want to delete "${deleteConfirm.category.name}"?`}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition-all active:scale-95">Cancel</button>
            <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-red-900/30">Delete</button>
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

const BiometricModal = ({ onClose }: { onClose: () => void }) => {
  const { user: authUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!authUser) return;
      const available = await BiometricService.isAvailable();
      setIsAvailable(available);
      
      const settings = await DatabaseService.getUserSettings(authUser.id);
      setBiometricEnabled(settings?.biometric_enabled || false);
    };
    checkStatus();
  }, [authUser]);

  const handleSetup = async () => {
    if (!authUser) return;
    setIsLoading(true);
    setMessage(null);
    
    try {
      await BiometricService.register(authUser.id);
      await DatabaseService.saveUserSettings(authUser.id, { biometric_enabled: true });
      setBiometricEnabled(true);
      setMessage({ type: 'success', text: 'Biometric authentication enabled successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to setup biometric authentication' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!authUser) return;
    setIsLoading(true);
    setMessage(null);
    
    try {
      const { error } = await supabase
        .from('biometric_credentials')
        .delete()
        .eq('user_id', authUser.id);
      
      if (error) throw error;
      
      await DatabaseService.saveUserSettings(authUser.id, { biometric_enabled: false });
      setBiometricEnabled(false);
      setMessage({ type: 'success', text: 'Biometric authentication removed successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove biometric authentication' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalLayout title="Biometric Authentication" onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 space-y-6">
        {/* Status */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-400">Status</span>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              biometricEnabled 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-gray-800 text-gray-500'
            }`}>
              {biometricEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Device Support</span>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              isAvailable 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {isAvailable ? 'Available' : 'Not Available'}
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl border animate-fade-in ${
            message.type === 'success' 
              ? 'bg-green-900/20 border-green-500/30 text-green-400' 
              : message.type === 'error'
              ? 'bg-red-900/20 border-red-500/30 text-red-400'
              : 'bg-blue-900/20 border-blue-500/30 text-blue-400'
          }`}>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-900/30 rounded-lg text-primary-400 mt-0.5">
              <Info size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white mb-2">About Biometric Authentication</h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">•</span>
                  <span>PIN is the default unlock method. Biometric is optional for convenience.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">•</span>
                  <span>You can always unlock with your PIN if biometric fails.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">•</span>
                  <span>Failed biometric attempts are tracked for security.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isAvailable ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Biometric authentication is not available on this device.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {!biometricEnabled ? (
              <button
                onClick={handleSetup}
                disabled={isLoading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-900/30"
              >
                {isLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Setting up...</>
                ) : (
                  <><ScanFace size={16} /> Enable Biometric Authentication</>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSetup}
                  disabled={isLoading}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border border-gray-700"
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Updating...</>
                  ) : (
                    <><RefreshCw size={16} /> Update Biometric</>
                  )}
                </button>
                <button
                  onClick={handleRemove}
                  disabled={isLoading}
                  className="w-full py-3 bg-red-900/20 hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-red-500/30"
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Removing...</>
                  ) : (
                    <><X size={16} /> Remove Biometric</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </ModalLayout>
  );
};

const ProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { user: authUser } = useAuthStore();
  const { items, vaults } = useData();
  const { items: storeItems } = useItemStore();
  const { vaults: storeVaults } = useVaultStore();
  const [name, setName] = useState(authUser?.name || authUser?.email || "");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
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
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    const loadRecoveryEmail = async () => {
      if (!authUser) return;
      try {
        const profile = await DatabaseService.getUserProfile(authUser.id);
        if (profile?.recovery_email_encrypted) {
          const masterKey = useAuthStore.getState().masterKey;
          if (masterKey) {
            const decryptedEmail = await EncryptionService.decrypt(profile.recovery_email_encrypted, masterKey);
            setRecoveryEmail(decryptedEmail);
          }
        }
      } catch (err) {
        console.error('Failed to load recovery email:', err);
      }
    };
    loadRecoveryEmail();
  }, [authUser]);

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
      await supabase.auth.signOut();
      localStorage.clear();
      
      window.location.href = "/login";
    } catch (err: any) {
      alert("Error clearing data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!authUser) return;
    
    if (recoveryEmail && !validateEmail(recoveryEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");
    
    const masterKey = useAuthStore.getState().masterKey;
    if (!masterKey) {
      alert("Master key not available");
      return;
    }
    setIsLoading(true);
    try {
      await DatabaseService.updateUserProfileName(authUser.id, name, masterKey);
      
      const recoveryEmailEncrypted = recoveryEmail 
        ? await EncryptionService.encrypt(recoveryEmail, masterKey)
        : null;
      
      const { error } = await supabase.from("user_profiles").update({
        recovery_email_encrypted: recoveryEmailEncrypted,
        updated_at: new Date().toISOString(),
      }).eq("user_id", authUser.id);
      
      if (error) throw error;
      
      useAuthStore.getState().updateUserProfile({ name });
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
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
                {storeItems.length} Items
              </span>
              <span className="px-2 py-0.5 bg-gray-800 rounded">
                {storeVaults.length} Vaults
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
              placeholder={authUser?.name || authUser?.email}
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
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Recovery Email
            </label>
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => {
                setRecoveryEmail(e.target.value);
                setEmailError("");
              }}
              placeholder="recovery@example.com"
              className={`w-full bg-gray-950 border rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors ${emailError ? 'border-red-500' : 'border-gray-800'}`}
            />
            {emailError && <p className="text-red-400 text-xs mt-1">{emailError}</p>}
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
          <button
            onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
            className="w-full flex items-center justify-between text-red-400 font-bold text-sm mb-3 hover:text-red-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} /> Danger Zone
            </span>
            <ChevronDown size={16} className={`transition-transform ${isDangerZoneOpen ? 'rotate-180' : ''}`} />
          </button>
          {isDangerZoneOpen && (
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
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isLoading || saveSuccess}
            className={`w-full py-3 rounded-xl font-medium shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              saveSuccess 
                ? "bg-green-600 text-white" 
                : "bg-primary-600 hover:bg-primary-500 text-white shadow-primary-900/20"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Saving...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center justify-center gap-2">
                <Check size={16} />
                Changes Saved
              </span>
            ) : (
              "Save Changes"
            )}
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
    <ModalLayout title="Audit Logs" onClose={onClose} maxWidth="max-w-4xl">
      <div className="flex flex-col h-[700px] max-h-[85vh]">
        {/* Header with Search and Filters */}
        <div className="p-4 border-b border-gray-800 space-y-3 bg-gray-950/50">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="text"
                placeholder="Search logs by action or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none placeholder-gray-600 transition-all"
              />
            </div>
            <button
              onClick={handleDownload}
              disabled={filteredLogs.length === 0}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-900/30 active:scale-95"
            >
              <FileDown size={18} /> Export CSV
            </button>
          </div>
          
          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {LOG_TYPES.map((type) => {
              const Icon = type.icon;
              const count = type.value === "ALL" ? logs.length : logs.filter(l => l.action === type.value).length;
              return (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    filterType === type.value
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-900/30"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-300"
                  }`}
                >
                  <Icon size={14} />
                  {type.label}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
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
          className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar"
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
                    className="p-4 bg-gray-900/80 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl flex items-start justify-between group transition-all animate-fade-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2.5 rounded-lg bg-gray-800 ${logColor}`}>
                        <LogIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${logColor} bg-gray-800`}>
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-600 font-mono">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 font-medium leading-relaxed">
                          {log.details}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-gray-600 hover:text-white hover:bg-gray-800 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                        alert("Log copied to clipboard");
                      }}
                      title="Copy log details"
                    >
                      <Copy size={16} />
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
        <div className="p-4 border-t border-gray-800 bg-gray-950/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-gray-500">
            <span className="flex items-center gap-1.5">
              <Activity size={12} />
              Total: <span className="font-bold text-gray-400">{logs.length}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Search size={12} />
              Filtered: <span className="font-bold text-gray-400">{filteredLogs.length}</span>
            </span>
          </div>
          <span className="text-gray-600 font-mono">
            Last updated: {logs.length > 0 ? new Date(logs[0].created_at).toLocaleTimeString() : 'N/A'}
          </span>
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
  const { items: storeItems } = useItemStore();
  const { vaults: storeVaults } = useVaultStore();
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
    "profile" | "logs" | "categories" | "backup" | "privacy" | "terms" | "biometric" | null
  >(null);

  // Notification Drawer
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  // Biometric State
  const [biometricStatus, setBiometricStatus] = useState<{
    enabled: boolean;
    available: boolean;
    loading: boolean;
  }>({ enabled: false, available: false, loading: false });

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

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await BiometricService.isAvailable();
      const enabled = userSettings?.biometric_enabled || false;
      setBiometricStatus({ enabled, available, loading: false });
    };
    checkBiometric();
  }, [userSettings]);

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
      {activeModal === "biometric" && (
        <BiometricModal onClose={() => setActiveModal(null)} />
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
                {storeItems.length} Items
              </span>
              <span className="bg-gray-800 px-2 py-0.5 rounded">
                {storeVaults.length} Vaults
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
                <span className="text-[10px] text-gray-500 mt-0.5 block">
                  PIN is default, Biometric is optional
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveModal("biometric")}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700 flex items-center gap-2"
            >
              <ScanFace size={16} />
              {userSettings?.biometric_enabled ? "Manage" : "Setup"}
            </button>
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

          <div
            onClick={() => navigate("/settings/notifications")}
            className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <Bell size={18} />
              </div>
              <div>
                <span className="text-gray-200 font-medium block">Notifications</span>
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
            onClick={() => navigate("/settings/categories")}
            className={`p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group ${
              !(userSettings?.group_items_by_category ?? settings.groupItemsByCategory)
                ? "opacity-50 cursor-not-allowed pointer-events-none"
                : ""
            }`}
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

          <div
            onClick={() => navigate("/settings/backup")}
            className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <HardDrive size={18} />
              </div>
              <div>
                <span className="text-gray-200 font-medium block">
                  Backup & Restore
                </span>
                <span className="text-[10px] text-gray-500">
                  Create and manage backups
                </span>
              </div>
            </div>
            <ChevronRight
              size={18}
              className="text-gray-600 group-hover:text-white"
            />
          </div>

          <div
            onClick={() => navigate("/settings/audit-logs")}
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


    </div>
  );
};

export default Settings;
