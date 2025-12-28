import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Vault as VaultIcon,
  MoreVertical,
  Edit2,
  Trash2,
  Share2,
  Star,
  Globe,
  CreditCard,
  StickyNote,
  Wifi,
  User,
  Landmark,
  Database,
  Server,
  Terminal,
  IdCard,
  FileText,
  Folder,
  Briefcase,
  Shield,
  X,
  Link2,
  ArrowRight,
  Clock,
  LayoutGrid,
} from "lucide-react";
import { useVaultStore } from "../src/stores/vaultStore";
import { useShareStore } from "../src/stores/shareStore";
import { Vault, ItemType } from "../types";
import VaultModal from "../components/VaultModal";
import ShareModal from "../components/ShareModal";
import ShareManagement from "../components/ShareManagement";
import ConfirmationModal from "../components/ConfirmationModal";

const ItemTypeIcon = ({ type, size = 20 }: { type: string; size?: number }) => {
  switch (type) {
    case "LOGIN":
      return <Globe className="text-blue-400" size={size} />;
    case "CARD":
      return <CreditCard className="text-green-400" size={size} />;
    case "NOTE":
      return <StickyNote className="text-yellow-400" size={size} />;
    case "WIFI":
      return <Wifi className="text-purple-400" size={size} />;
    case "IDENTITY":
      return <User className="text-pink-400" size={size} />;
    case "BANK":
      return <Landmark className="text-emerald-400" size={size} />;
    case "DATABASE":
      return <Database className="text-cyan-400" size={size} />;
    case "SERVER":
      return <Server className="text-indigo-400" size={size} />;
    case "SSH_KEY":
      return <Terminal className="text-slate-400" size={size} />;
    case "ID_CARD":
      return <IdCard className="text-teal-400" size={size} />;
    case "FILE":
      return <FileText className="text-rose-400" size={size} />;
    default:
      return <FileText className="text-gray-400" size={size} />;
  }
};

const VaultIconComponent = ({
  iconName,
  size = 20,
}: {
  iconName: string;
  size?: number;
}) => {
  switch (iconName) {
    case "Folder":
      return <Folder size={size} />;
    case "Briefcase":
      return <Briefcase size={size} />;
    case "CreditCard":
      return <CreditCard size={size} />;
    case "User":
      return <User size={size} />;
    case "Shield":
      return <Shield size={size} />;
    default:
      return <Folder size={size} />;
  }
};

const Vaults: React.FC = () => {
  const navigate = useNavigate();
  const {
    vaults,
    loadVaults,
    deleteVault,
    favoriteItems,
    loadFavoriteItems,
    isLoading,
  } = useVaultStore();
  // New: Import active shares count
  const { shares } = useShareStore();
  const activeShareCount = useMemo(
    () =>
      shares.filter(
        (s) =>
          !s.revoked &&
          (!s.expiresAt || new Date(s.expiresAt) > new Date()) &&
          (!s.maxViews || s.viewCount < s.maxViews)
      ).length,
    [shares]
  );

  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<Vault | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareVault, setShareVault] = useState<Vault | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [showAllShares, setShowAllShares] = useState(false);

  useEffect(() => {
    loadVaults();
    loadFavoriteItems();
  }, []);

  const activeVaults = useMemo(
    () => vaults.filter((v) => !v.deletedAt),
    [vaults]
  );
  const sharedVaults = useMemo(
    () => activeVaults.filter((v) => v.isShared),
    [activeVaults]
  );
  const personalVaults = useMemo(
    () => activeVaults.filter((v) => !v.isShared),
    [activeVaults]
  );

  const handleCreateVault = () => {
    setEditingVault(null);
    setIsVaultModalOpen(true);
  };

  const handleModalClose = () => {
    setIsVaultModalOpen(false);
    setEditingVault(null);
    loadVaults();
  };

  const handleEditVault = (vault: Vault) => {
    setEditingVault(vault);
    setIsVaultModalOpen(true);
    setMenuOpenId(null);
  };

  const handleShareVault = (vault: Vault) => {
    setShareVault(vault);
    setIsShareModalOpen(true);
    setMenuOpenId(null);
  };

  const handleDeleteVault = (vaultId: string) => {
    setDeleteTarget(vaultId);
    setMenuOpenId(null);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteVault(deleteTarget);
      setDeleteTarget(null);
      loadVaults();
    }
  };

  const getDeleteMessage = () => {
    const vault = vaults.find((v) => v.id === deleteTarget);
    if (!vault) return "This vault will be moved to Trash.";

    if (vault.itemCount > 0) {
      return `This vault contains ${vault.itemCount} item${
        vault.itemCount > 1 ? "s" : ""
      }. All items will also be moved to Trash. You can restore them later.`;
    }
    return "This vault will be moved to Trash. You can restore it later.";
  };

  const ITEM_TYPE_OPTIONS = [
    {
      type: ItemType.LOGIN,
      label: "Login",
      description: "Save usernames and passwords for websites.",
      icon: Globe,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      type: ItemType.CARD,
      label: "Card",
      description: "Securely store credit and debit card details.",
      icon: CreditCard,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      type: ItemType.NOTE,
      label: "Secure Note",
      description: "Keep sensitive information and codes safe.",
      icon: StickyNote,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
    {
      type: ItemType.IDENTITY,
      label: "Identity",
      description: "Store personal details for filling forms.",
      icon: User,
      color: "text-pink-400",
      bg: "bg-pink-400/10",
    },
    {
      type: ItemType.WIFI,
      label: "WiFi",
      description: "Save WiFi network names and passwords.",
      icon: Wifi,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      type: ItemType.BANK,
      label: "Bank Account",
      description: "Keep bank account numbers and IFSC codes.",
      icon: Landmark,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      type: ItemType.DATABASE,
      label: "Database",
      description: "Store database connection strings and creds.",
      icon: Database,
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
    },
    {
      type: ItemType.SERVER,
      label: "Server",
      description: "Manage server credentials and IP addresses.",
      icon: Server,
      color: "text-indigo-400",
      bg: "bg-indigo-400/10",
    },
    {
      type: ItemType.SSH_KEY,
      label: "SSH Key",
      description: "Store SSH keys and passphrases securely.",
      icon: Terminal,
      color: "text-slate-400",
      bg: "bg-slate-400/10",
    },
    {
      type: ItemType.ID_CARD,
      label: "ID Card",
      description: "Government IDs, Passports, Employee IDs.",
      icon: IdCard,
      color: "text-teal-400",
      bg: "bg-teal-400/10",
    },
    {
      type: ItemType.FILE,
      label: "Files",
      description: "Securely store documents and files.",
      icon: FileText,
      color: "text-rose-400",
      bg: "bg-rose-400/10",
    },
  ];

  return (
    <div className="flex flex-col space-y-6 pb-4">
      <VaultModal
        isOpen={isVaultModalOpen}
        onClose={handleModalClose}
        vault={editingVault}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareVault(null);
        }}
        item={shareVault}
        type="vault"
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Vault?"
        message={getDeleteMessage()}
        confirmText="Move to Trash"
        type="warning"
      />

      {/* Header Removed as per request */}

      {/* Quick Access Section - Horizontal Scroll */}
      <div className="shrink-0 w-full max-w-[100vw] overflow-hidden">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star size={14} className="text-yellow-500 fill-yellow-500" />
          Quick Access
        </h3>
        {favoriteItems.length > 0 ? (
          <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 md:mx-0 md:px-0 custom-scrollbar md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
            {favoriteItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/items/${item.id}`)}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-primary-500/30 p-3 rounded-xl cursor-pointer hover:bg-gray-800 transition-all group flex items-center gap-3 min-w-[200px] md:min-w-0 shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ItemTypeIcon type={item.type} />
                </div>
                <div className="overflow-hidden min-w-0">
                  <h4 className="text-sm font-medium text-white truncate group-hover:text-primary-400 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-xs text-gray-500 truncate">
                    {item.data?.username || "Tap to view"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900/30 border border-dashed border-gray-800 p-4 rounded-xl text-center text-xs text-gray-500">
            Star items to add them to Quick Access
          </div>
        )}
      </div>

      {/* Main Vaults Grid */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <LayoutGrid size={14} />
            Your Vaults
          </h3>
          <button
            onClick={handleCreateVault}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 h-32 animate-pulse"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {activeVaults.map((vault) => (
              <div
                key={vault.id}
                onClick={() => navigate(`/items?vault=${vault.id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 hover:bg-gray-850 rounded-xl p-4 cursor-pointer transition-all group relative flex flex-col justify-between h-[140px] shadow-sm hover:shadow-lg hover:-translate-y-1"
              >
                <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden rounded-xl">
                  <svg
                    width="100%"
                    height="100%"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <pattern
                        id={`grid-${vault.id}`}
                        width="20"
                        height="20"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 20 0 L 0 0 0 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="0.5"
                          className="text-white"
                        />
                      </pattern>
                    </defs>
                    <rect
                      width="100%"
                      height="100%"
                      fill={`url(#grid-${vault.id})`}
                    />
                  </svg>
                </div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-xl transition-colors ${
                        vault.isShared
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "bg-gray-800 group-hover:bg-primary-500/20 group-hover:text-primary-400 text-gray-400"
                      }`}
                    >
                      <VaultIconComponent iconName={vault.icon} size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight group-hover:text-primary-400 transition-colors">
                        {vault.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        Updated today
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {vault.isShared && (
                      <div className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-bold rounded-lg border border-indigo-500/20">
                        Shared
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(
                          menuOpenId === vault.id ? null : vault.id
                        );
                      }}
                      className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                {menuOpenId === vault.id && (
                  <div className="absolute top-12 right-2 z-20 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-fade-in">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditVault(vault);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareVault(vault);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Share2 size={12} /> Share
                    </button>
                    <div className="h-px bg-gray-700 my-0.5"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVault(vault.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}

                <div className="flex items-end justify-between mt-auto pt-4">
                  <div className="flex -space-x-2">
                    {/* Mock avatars if shared, otherwise nothing or small circles */}
                    {vault.isShared && (
                      <>
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-gray-900">
                          JD
                        </div>
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 ring-2 ring-gray-900">
                          +2
                        </div>
                      </>
                    )}
                  </div>
                  <div className="bg-gray-800/50 px-2 py-1 rounded-md text-xs font-medium text-gray-400 group-hover:bg-primary-500/10 group-hover:text-primary-400 transition-colors">
                    {vault.itemCount} items
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Vault Ghost Card */}
            <button
              onClick={handleCreateVault}
              className="border border-dashed border-gray-800 hover:border-primary-500/50 bg-gray-900/10 hover:bg-gray-900/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-primary-400 transition-all min-h-[140px] group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-inner">
                <Plus size={24} />
              </div>
              <span className="text-sm font-medium">Create New Vault</span>
            </button>
          </div>
        )}
      </div>

      {/* Shared Items & Shares Section - Moved Below Vaults */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        {/* Active Shares Summary Card */}
        <div className="lg:col-span-3 bg-gradient-to-br from-gray-900 to-gray-900 border border-gray-800 rounded-xl p-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Share2 size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Link2 className="text-primary-500" size={20} />
                My Shares
              </h3>
              <button
                onClick={() => {
                  navigate("/shares");
                }}
                className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1 bg-primary-500/10 px-3 py-1.5 rounded-full transition-colors"
              >
                View all shares
                <ArrowRight size={12} />
              </button>
            </div>

            {showAllShares ? (
              <div className="animate-fade-in mt-4">
                <ShareManagement />
              </div>
            ) : (
              <div className="flex flex-row gap-4">
                <div className="flex-1 bg-gray-950/50 rounded-xl p-4 border border-gray-800/50">
                  <p className="text-gray-400 text-sm mb-1">
                    Active Shared Links
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">
                      {activeShareCount}
                    </span>
                    <span className="text-xs text-green-400 mb-1.5 flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                      Online
                    </span>
                  </div>
                </div>
                <div className="flex-1 bg-gray-950/50 rounded-xl p-4 border border-gray-800/50">
                  <p className="text-gray-400 text-sm mb-1">Total Views</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">28</span>
                    <span className="text-xs text-gray-500 mb-1.5">
                      lifetime
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Type Selection Modal */}
      {isTypeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsTypeModalOpen(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden mb-20 md:mb-0 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/50 shrink-0">
              <h3 className="font-bold text-white text-lg">Select Item Type</h3>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-2 overflow-y-auto custom-scrollbar">
              {ITEM_TYPE_OPTIONS.map((t) => (
                <button
                  key={t.type}
                  onClick={() => {
                    setIsTypeModalOpen(false);
                    navigate(`/items/new?type=${t.type}`);
                  }}
                  className="w-full flex items-center gap-4 p-3 hover:bg-gray-800/50 rounded-xl transition-all group border border-transparent hover:border-gray-800"
                >
                  <div className={`p-3 rounded-xl ${t.bg} ${t.color} shrink-0`}>
                    <t.icon size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <span className="block text-sm font-bold text-gray-200 group-hover:text-white mb-0.5">
                      {t.label}
                    </span>
                    <span className="block text-xs text-gray-500 group-hover:text-gray-400">
                      {t.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Mobile) */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        {isFabMenuOpen && (
          <div className="absolute bottom-16 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden mb-2 w-40 animate-slide-up">
            <button
              onClick={() => {
                setIsVaultModalOpen(true);
                setIsFabMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <VaultIcon size={16} /> Add Vault
            </button>
            <button
              onClick={() => {
                setIsTypeModalOpen(true);
                setIsFabMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        )}
        <button
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          className="w-14 h-14 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-full shadow-lg shadow-primary-900/40 flex items-center justify-center transition-transform active:scale-95"
        >
          <Plus
            size={28}
            className={`transition-transform duration-300 ${
              isFabMenuOpen ? "rotate-45" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default Vaults;
