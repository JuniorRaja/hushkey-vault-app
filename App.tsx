import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  UserProfile,
  Item,
  Vault,
  LogEntry,
  AppSettings,
  AccentColor,
  AppNotification,
  NotificationType,
} from "./types";
import { storageService } from "./services/storage";
import { INITIAL_USER } from "./services/mockData";
import { useAuthStore } from "./src/stores/authStore";
import DatabaseService from "./src/services/database";
import {
  requestNotificationPermission,
  requestClipboardPermission,
} from "./src/services/pwa";
import { supabase } from "./src/supabaseClient";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Items from "./pages/Items";
import Vaults from "./pages/Vaults";
import Guardian from "./pages/Guardian";
import Settings from "./pages/Settings";
import NotificationsSettings from "./pages/NotificationsSettings";
import CategoriesSettings from "./pages/CategoriesSettings";
import AuditLogsSettings from "./pages/AuditLogsSettings";
import BackupSettings from "./pages/BackupSettings";
import ItemDetail from "./pages/ItemDetail";
import Trash from "./pages/Trash";
import ShareAccess from "./pages/ShareAccess";
import Shares from "./pages/Shares";
import ImportData from "./pages/ImportData";
import OAuthCallback from "./pages/OAuthCallback";
import Onboarding from "./pages/Onboarding";
import AppLayout from "./components/Layout";
import PWAUpdater from "./components/PWAUpdater";

// --- Color Palettes ---
const COLOR_PALETTES: Record<AccentColor, Record<string, string>> = {
  violet: {
    "50": "#f5f3ff",
    "100": "#ede9fe",
    "200": "#ddd6fe",
    "300": "#c4b5fd",
    "400": "#a78bfa",
    "500": "#8b5cf6",
    "600": "#7c3aed",
    "700": "#6d28d9",
    "800": "#5b21b6",
    "900": "#4c1d95",
  },
  blue: {
    "50": "#eff6ff",
    "100": "#dbeafe",
    "200": "#bfdbfe",
    "300": "#93c5fd",
    "400": "#60a5fa",
    "500": "#3b82f6",
    "600": "#2563eb",
    "700": "#1d4ed8",
    "800": "#1e40af",
    "900": "#1e3a8a",
  },
  emerald: {
    "50": "#ecfdf5",
    "100": "#d1fae5",
    "200": "#a7f3d0",
    "300": "#6ee7b7",
    "400": "#34d399",
    "500": "#10b981",
    "600": "#059669",
    "700": "#047857",
    "800": "#065f46",
    "900": "#064e3b",
  },
  rose: {
    "50": "#fff1f2",
    "100": "#ffe4e6",
    "200": "#fecdd3",
    "300": "#fda4af",
    "400": "#fb7185",
    "500": "#f43f5e",
    "600": "#e11d48",
    "700": "#be123c",
    "800": "#9f1239",
    "900": "#881337",
  },
  amber: {
    "50": "#fffbeb",
    "100": "#fef3c7",
    "200": "#fde68a",
    "300": "#fcd34d",
    "400": "#fbbf24",
    "500": "#f59e0b",
    "600": "#d97706",
    "700": "#b45309",
    "800": "#92400e",
    "900": "#78350f",
  },
  cyan: {
    "50": "#ecfeff",
    "100": "#cffafe",
    "200": "#a5f3fc",
    "300": "#67e8f9",
    "400": "#22d3ee",
    "500": "#06b6d4",
    "600": "#0891b2",
    "700": "#0e7490",
    "800": "#155e75",
    "900": "#164e63",
  },
};

// --- Contexts ---

interface AuthContextType {
  user: UserProfile | null;
  updateUserProfile: (user: Partial<UserProfile>) => void;
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  loginWithBiometrics: () => Promise<boolean>;
  logout: () => void;
  reportFailedLogin: () => void;
}

interface DataContextType {
  items: Item[]; // Active items
  vaults: Vault[]; // Active vaults
  trashItems: Item[]; // Deleted items
  trashVaults: Vault[]; // Deleted vaults
  logs: LogEntry[];
  settings: AppSettings;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  addItem: (item: Item) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void; // Soft delete
  restoreItem: (id: string) => void;
  permanentlyDeleteItem: (id: string) => void;
  addVault: (vault: Vault) => void;
  updateVault: (vault: Vault) => void;
  deleteVault: (id: string) => void; // Soft delete
  restoreVault: (id: string) => void;
  permanentlyDeleteVault: (id: string) => void;
  updateSettings: (settings: AppSettings) => void;
  addLog: (action: LogEntry["action"], details: string) => void;
  refreshData: () => void;
  triggerNotification: (
    title: string,
    message: string,
    type: NotificationType,
    configKey?: keyof AppSettings["notifications"]
  ) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DataContext = createContext<DataContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};

// --- Providers ---

const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [allVaults, setAllVaults] = useState<Vault[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(
    storageService.getSettings()
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refreshData = useCallback(() => {
    setAllItems(storageService.getItems());
    setAllVaults(storageService.getVaults());
    setLogs(storageService.getLogs());
    setSettings(storageService.getSettings());
    setNotifications(storageService.getNotifications());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Check system health on load (Expiry, Backup)
  useEffect(() => {
    if (allItems.length === 0) return;

    const checkHealth = () => {
      const currentSettings = storageService.getSettings();

      // 1. Expiry Check
      if (currentSettings.notifications.expiryReminders) {
        const now = new Date();
        let expiringCount = 0;
        allItems.forEach((i) => {
          if (i.deletedAt) return;
          let expiryDate: Date | null = null;
          if (i.data.expiry) {
            const [m, y] = i.data.expiry.split("/");
            if (m && y)
              expiryDate = new Date(2000 + parseInt(y), parseInt(m) - 1);
          }
          if (i.data.validTill || i.data.expiryDate) {
            const dStr = i.data.validTill || i.data.expiryDate;
            if (dStr && !isNaN(Date.parse(dStr))) expiryDate = new Date(dStr);
          }
          if (expiryDate) {
            const diffTime = expiryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 0 && diffDays < 30) {
              expiringCount++;
            }
          }
        });

        if (expiringCount > 0) {
          // Only notify if we haven't today (simple check omitted for brevity, in real app store 'lastCheck')
          // For demo, we just trigger it once per session load
        }
      }

      // 2. Backup Check
      if (currentSettings.notifications.backupHealth) {
        const lastSync = new Date(currentSettings.lastSync);
        const daysSinceSync =
          (new Date().getTime() - lastSync.getTime()) / (1000 * 3600 * 24);
        if (daysSinceSync > 7) {
          triggerNotification(
            "Backup Overdue",
            `Your last backup was ${Math.floor(
              daysSinceSync
            )} days ago. Please sync your vault.`,
            NotificationType.ALERT,
            "backupHealth"
          );
        }
      }

      // 3. Monthly Report (Simulated)
      if (currentSettings.notifications.monthlyReport) {
        // Mock check: if it's the 1st of the month
        if (new Date().getDate() === 1) {
          triggerNotification(
            "Monthly Security Report",
            "Your monthly vault security analysis is ready to view.",
            NotificationType.INFO,
            "monthlyReport"
          );
        }
      }
    };

    // Delay check slightly to not block render
    const timer = setTimeout(checkHealth, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems.length]);

  // Apply Accent Color Effect
  useEffect(() => {
    const palette =
      COLOR_PALETTES[settings.accentColor] || COLOR_PALETTES.violet;
    const root = document.documentElement;
    Object.entries(palette).forEach(([shade, value]) => {
      root.style.setProperty(`--color-primary-${shade}`, value as string);
    });
  }, [settings.accentColor]);

  const addLog = (action: LogEntry["action"], details: string) => {
    const log: LogEntry = {
      id: String((window.crypto as any).randomUUID()),
      timestamp: new Date().toISOString(),
      action,
      details,
    };
    storageService.addLog(log);
    setLogs(storageService.getLogs());
  };

  const triggerNotification = (
    title: string,
    message: string,
    type: NotificationType,
    configKey?: keyof AppSettings["notifications"]
  ) => {
    // Check if this type of notification is enabled in settings
    const currentSettings = storageService.getSettings();
    if (configKey && !currentSettings.notifications[configKey]) {
      return;
    }

    // Add to internal list
    const newNotification: AppNotification = {
      id: String((window.crypto as any).randomUUID()),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updatedList = [
      newNotification,
      ...storageService.getNotifications(),
    ].slice(0, 50); // Keep last 50
    setNotifications(updatedList);
    storageService.saveNotifications(updatedList);

    // Trigger Browser Push if enabled and supported
    if (
      currentSettings.notifications.pushNotifications &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(title, { body: message, icon: "/favicon.ico" });
    }

    // Simulate Email if enabled
    if (
      currentSettings.notifications.emailNotifications &&
      (type === NotificationType.SECURITY || type === NotificationType.ALERT)
    ) {
      console.log(
        `[EMAIL SENT to ${
          storageService.getUser().email
        }]: ${title} - ${message}`
      );
    }
  };

  const markNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    storageService.saveNotifications(updated);
  };

  const clearNotifications = () => {
    setNotifications([]);
    storageService.saveNotifications([]);
  };

  // Derived state for consumers
  const items = useMemo(() => allItems.filter((i) => !i.deletedAt), [allItems]);
  const trashItems = useMemo(
    () => allItems.filter((i) => i.deletedAt),
    [allItems]
  );

  const vaults = useMemo(
    () => allVaults.filter((v) => !v.deletedAt),
    [allVaults]
  );
  const trashVaults = useMemo(
    () => allVaults.filter((v) => v.deletedAt),
    [allVaults]
  );
  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // --- Items ---

  const addItem = (item: Item) => {
    const newItems = [...allItems, item];
    setAllItems(newItems);
    storageService.saveItems(newItems);
    addLog("CREATE", `Created item ${String(item.name)}`);

    // Check shared vault
    const vault = allVaults.find((v) => v.id === item.vaultId);
    if (vault && vault.isShared) {
      triggerNotification(
        "Shared Vault Update",
        `New item '${item.name}' added to shared vault '${vault.name}'`,
        NotificationType.INFO,
        "sharedVaultUpdates"
      );
    }
  };

  const updateItem = (updatedItem: Item) => {
    const newItems = allItems.map((i) =>
      i.id === updatedItem.id ? updatedItem : i
    );
    setAllItems(newItems);
    storageService.saveItems(newItems);
    addLog("UPDATE", `Updated item ${updatedItem.name}`);

    // Check shared vault
    const vault = allVaults.find((v) => v.id === updatedItem.vaultId);
    if (vault && vault.isShared) {
      triggerNotification(
        "Shared Vault Update",
        `Item '${updatedItem.name}' updated in shared vault '${vault.name}'`,
        NotificationType.INFO,
        "sharedVaultUpdates"
      );
    }
  };

  const deleteItem = (id: string) => {
    // Soft delete
    const item = allItems.find((i) => i.id === id);
    if (item) {
      const updatedItem = { ...item, deletedAt: new Date().toISOString() };
      const newItems = allItems.map((i) => (i.id === id ? updatedItem : i));
      setAllItems(newItems);
      storageService.saveItems(newItems);
      addLog("DELETE", `Moved item ${item.name} to trash`);

      // Check shared vault
      const vault = allVaults.find((v) => v.id === item.vaultId);
      if (vault && vault.isShared) {
        triggerNotification(
          "Shared Vault Update",
          `Item '${item.name}' removed from shared vault '${vault.name}'`,
          NotificationType.INFO,
          "sharedVaultUpdates"
        );
      }
    }
  };

  const restoreItem = (id: string) => {
    const item = allItems.find((i) => i.id === id);
    if (item) {
      const updatedItem = { ...item, deletedAt: undefined };
      const newItems = allItems.map((i) => (i.id === id ? updatedItem : i));
      setAllItems(newItems);
      storageService.saveItems(newItems);
      addLog("RESTORE", `Restored item ${item.name}`);
    }
  };

  const permanentlyDeleteItem = (id: string) => {
    const item = allItems.find((i) => i.id === id);
    const newItems = allItems.filter((i) => i.id !== id);
    setAllItems(newItems);
    storageService.saveItems(newItems);
    if (item) {
      addLog("PERMANENT_DELETE", `Permanently deleted item ${item.name}`);
    }
  };

  // --- Vaults ---

  const addVault = (vault: Vault) => {
    const newVaults = [...allVaults, vault];
    setAllVaults(newVaults);
    storageService.saveVaults(newVaults);
    addLog("CREATE", `Created vault ${vault.name}`);
  };

  const updateVault = (updatedVault: Vault) => {
    const newVaults = allVaults.map((v) =>
      v.id === updatedVault.id ? updatedVault : v
    );
    setAllVaults(newVaults);
    storageService.saveVaults(newVaults);
    addLog("UPDATE", `Updated vault ${updatedVault.name}`);
  };

  const deleteVault = (id: string) => {
    // Soft delete
    const vault = allVaults.find((v) => v.id === id);
    if (vault) {
      const timestamp = new Date().toISOString();

      // Update Vault
      const updatedVault = { ...vault, deletedAt: timestamp };
      const newVaults = allVaults.map((v) => (v.id === id ? updatedVault : v));
      setAllVaults(newVaults);
      storageService.saveVaults(newVaults);

      // Update Items (Soft delete items in this vault)
      const newItems = allItems.map((i) => {
        if (i.vaultId === id && !i.deletedAt) {
          return { ...i, deletedAt: timestamp };
        }
        return i;
      });
      setAllItems(newItems);
      storageService.saveItems(newItems);

      addLog("DELETE", `Moved vault ${vault.name} to trash`);
    }
  };

  const restoreVault = (id: string) => {
    const vault = allVaults.find((v) => v.id === id);
    if (vault) {
      const vaultDeletedAt = vault.deletedAt;
      const updatedVault = { ...vault, deletedAt: undefined };
      const newVaults = allVaults.map((v) => (v.id === id ? updatedVault : v));
      setAllVaults(newVaults);
      storageService.saveVaults(newVaults);

      // Restore items that were deleted at the same time as the vault
      if (vaultDeletedAt) {
        const newItems = allItems.map((i) => {
          if (i.vaultId === id && i.deletedAt === vaultDeletedAt) {
            return { ...i, deletedAt: undefined };
          }
          return i;
        });
        setAllItems(newItems);
        storageService.saveItems(newItems);
      }

      addLog("RESTORE", `Restored vault ${vault.name}`);
    }
  };

  const permanentlyDeleteVault = (id: string) => {
    const vault = allVaults.find((v) => v.id === id);
    const newVaults = allVaults.filter((v) => v.id !== id);
    setAllVaults(newVaults);
    storageService.saveVaults(newVaults);

    // Also permanently delete all items in this vault (both active and trash)
    const newItems = allItems.filter((i) => i.vaultId !== id);
    setAllItems(newItems);
    storageService.saveItems(newItems);

    if (vault) {
      addLog("PERMANENT_DELETE", `Permanently deleted vault ${vault.name}`);
    }
  };

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
    // Not logging setting changes to avoid spam

    // If push notifications enabled, request permission
    if (
      newSettings.notifications.pushNotifications &&
      "Notification" in window &&
      Notification.permission !== "granted"
    ) {
      Notification.requestPermission();
    }
  };

  return (
    <DataContext.Provider
      value={{
        items,
        vaults,
        trashItems,
        trashVaults,
        logs,
        settings,
        notifications,
        unreadNotificationCount,
        addItem,
        updateItem,
        deleteItem,
        restoreItem,
        permanentlyDeleteItem,
        addVault,
        updateVault,
        deleteVault,
        restoreVault,
        permanentlyDeleteVault,
        updateSettings,
        addLog,
        refreshData,
        triggerNotification,
        markNotificationsRead,
        clearNotifications,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile>(storageService.getUser());
  const { triggerNotification } = useData() || {
    triggerNotification: () => {},
  }; // Handle context not ready initial render
  const navigate = useNavigate();

  const login = (pin: string) => {
    if (pin === user.pinHash) {
      setIsAuthenticated(true);
      storageService.addLog({
        id: String((window.crypto as any).randomUUID()),
        timestamp: new Date().toISOString(),
        action: "LOGIN",
        details: "User logged in via PIN",
      });
      // Simulate New Device Login Check
      // In reality, check local storage for a device UUID. If new, trigger.
      const deviceId = localStorage.getItem("sentinel_device_id");
      if (!deviceId) {
        localStorage.setItem("sentinel_device_id", crypto.randomUUID());
        // Need to defer this slightly as triggerNotification relies on DataContext which is parent/sibling
        // Actually AuthProvider wraps DataProvider is WRONG order if Auth needs Data.
        // FIX: DataProvider should be inside AuthProvider, OR they should be independent.
        // Current structure: AuthProvider -> DataProvider.
        // But useData() won't work inside AuthProvider component body because it's not a child of DataProvider.
        // Refactoring: Move trigger logic for login OUT of here or restructure.
        // Alternative: Pass trigger to login function from the component calling it?
        // Simplest fix for this architecture: Handle the notification in the Login Component upon success.
      }
      return true;
    }
    return false;
  };

  const loginWithBiometrics = async () => {
    // Simulation of biometric delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const success = true;

    if (success) {
      setIsAuthenticated(true);
      storageService.addLog({
        id: String((window.crypto as any).randomUUID()),
        timestamp: new Date().toISOString(),
        action: "LOGIN",
        details: "User logged in via Biometrics",
      });
    }
    return success;
  };

  const reportFailedLogin = () => {
    // Logic handled in Login component to access DataContext
  };

  const logout = () => {
    setIsAuthenticated(false);
    navigate("/login");
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      const newUser = { ...prev, ...updates };
      storageService.saveUser(newUser);
      return newUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        loginWithBiometrics,
        logout,
        updateUserProfile,
        reportFailedLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// --- Main App Logic ---

const AppRoutes = () => {
  const { user, isUnlocked, onboardingStep, hasPinSet, isLoading } =
    useAuthStore();
  const location = useLocation();

  // Allow share route without authentication
  if (location.pathname.startsWith("/share/")) {
    return (
      <Routes>
        <Route path="/share/:token" element={<ShareAccess />} />
      </Routes>
    );
  }

  // Allow OAuth callback route
  if (location.pathname === "/oauth-callback") {
    return (
      <Routes>
        <Route path="/oauth-callback" element={<OAuthCallback />} />
      </Routes>
    );
  }

  // If not authenticated or not unlocked, show Login or Onboarding
  if (!user || !isUnlocked) {
    // Check if user is in onboarding flow
    if (user && onboardingStep !== null) {
      return <Onboarding />;
    }
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/vaults" replace />} />
        <Route path="vaults" element={<Vaults />} />
        <Route path="items" element={<Items />} />
        <Route path="items/:itemId" element={<ItemDetail />} />
        <Route path="items/new" element={<ItemDetail isNew />} />
        <Route path="guardian" element={<Guardian />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="settings/notifications"
          element={<NotificationsSettings />}
        />
        <Route path="settings/categories" element={<CategoriesSettings />} />
        <Route path="settings/audit-logs" element={<AuditLogsSettings />} />
        <Route path="settings/backup" element={<BackupSettings />} />
        <Route path="import" element={<ImportData />} />
        <Route path="trash" element={<Trash />} />
        <Route path="shares" element={<Shares />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  const { hydrate, isLoading, user, isUnlocked } = useAuthStore();
  // Use ref to prevent double-execution in React Strict Mode
  const isHydratingRef = React.useRef(false);

  useEffect(() => {
    const initializeAuth = async () => {
      if (isHydratingRef.current) return;
      isHydratingRef.current = true;
      try {
        await hydrate();
      } finally {
        isHydratingRef.current = false;
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION as it fires on page load and hydrate already ran
      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (!isHydratingRef.current) {
          isHydratingRef.current = true;
          try {
            await hydrate();
          } finally {
            isHydratingRef.current = false;
          }
        }
      } else if (event === "SIGNED_OUT") {
        useAuthStore.getState().clearState();
      }
    });

    // Request PWA permissions
    requestNotificationPermission();
    requestClipboardPermission();

    return () => {
      subscription.unsubscribe();
    };
  }, [hydrate]);

  // Sync on app start and online events
  useEffect(() => {
    if (!user || !isUnlocked) return;

    const syncData = async () => {
      if (navigator.onLine) {
        try {
          const SyncService = (await import("./src/services/syncService"))
            .default;
          await SyncService.processSyncQueue();
        } catch (error) {
          console.error("Sync failed:", error);
        }
      }
    };

    // Sync on app start
    syncData();

    // Sync when coming back online
    const handleOnline = () => {
      console.log("Back online, syncing...");
      syncData();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user, isUnlocked]);

  // Auto-cleanup expired trash on app launch
  // TODO: Change to cron job
  useEffect(() => {
    const cleanupTrash = async () => {
      if (!user || !isUnlocked) return;

      try {
        const { useTrashStore } = await import("./src/stores/trashStore");
        const { cleanupExpiredTrash } = useTrashStore.getState();
        const autoDeleteDays = await DatabaseService.getAutoDeleteDays(user.id);
        await cleanupExpiredTrash(autoDeleteDays);
      } catch (error) {
        console.error("Failed to cleanup expired trash:", error);
      }
    };

    if (user && isUnlocked) {
      cleanupTrash();
    }
  }, [user, isUnlocked]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Wrap everything in HashRouter so Login can use useNavigate
  return (
    <HashRouter>
      <DataProvider>
        <AuthProvider>
          <PWAUpdater />
          <AppRoutes />
        </AuthProvider>
      </DataProvider>
    </HashRouter>
  );
};

export default App;
