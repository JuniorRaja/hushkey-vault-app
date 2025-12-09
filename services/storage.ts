

import { Item, Vault, LogEntry, AppSettings, UserProfile, Category, AppNotification, NotificationType } from '../types';
import { INITIAL_ITEMS, INITIAL_VAULTS, INITIAL_LOGS, INITIAL_USER } from './mockData';

const KEYS = {
  VAULTS: 'sentinel_vaults',
  ITEMS: 'sentinel_items',
  LOGS: 'sentinel_logs',
  SETTINGS: 'sentinel_settings',
  USER: 'sentinel_user',
  NOTIFICATIONS: 'sentinel_notifications'
};

const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat_personal', name: 'Personal', color: 'bg-blue-500' },
    { id: 'cat_work', name: 'Work', color: 'bg-purple-500' },
    { id: 'cat_finance', name: 'Finance', color: 'bg-green-500' },
    { id: 'cat_social', name: 'Social Media', color: 'bg-pink-500' },
    { id: 'cat_utilities', name: 'Utilities', color: 'bg-yellow-500' },
];

const DEFAULT_NOTIFICATION_SETTINGS = {
    newDeviceLogin: true,
    failedLoginAttempts: true,
    weakPasswordAlerts: true,
    expiryReminders: true,
    backupHealth: true,
    monthlyReport: true,
    sessionAlerts: false,
    sharedVaultUpdates: true,
    pushNotifications: false,
    emailNotifications: true
};

const DEFAULT_SETTINGS: AppSettings = {
    autoLockMinutes: 5,
    clipboardClearSeconds: 30,
    theme: 'dark',
    unlockMethod: 'pin',
    allowScreenshots: false,
    lastSync: new Date().toISOString(),
    groupItemsByCategory: false,
    categories: DEFAULT_CATEGORIES,
    accentColor: 'violet',
    notifications: DEFAULT_NOTIFICATION_SETTINGS
};

// Initial welcome notification
const INITIAL_NOTIFICATIONS: AppNotification[] = [
    {
        id: 'welcome_notif',
        title: 'Welcome to Hushkey',
        message: 'Your vault is ready. Enable push notifications for security alerts.',
        type: NotificationType.INFO,
        timestamp: new Date().toISOString(),
        read: false
    }
];

export const storageService = {
  getVaults: (): Vault[] => {
    const stored = sessionStorage.getItem(KEYS.VAULTS);
    return stored ? JSON.parse(stored) : INITIAL_VAULTS;
  },
  saveVaults: (vaults: Vault[]) => {
    sessionStorage.setItem(KEYS.VAULTS, JSON.stringify(vaults));
  },
  getItems: (): Item[] => {
    const stored = sessionStorage.getItem(KEYS.ITEMS);
    return stored ? JSON.parse(stored) : INITIAL_ITEMS;
  },
  saveItems: (items: Item[]) => {
    sessionStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
  },
  getLogs: (): LogEntry[] => {
    const stored = sessionStorage.getItem(KEYS.LOGS);
    return stored ? JSON.parse(stored) : INITIAL_LOGS;
  },
  addLog: (log: LogEntry) => {
    const logs = storageService.getLogs();
    const newLogs = [log, ...logs].slice(0, 100); // Keep last 100
    sessionStorage.setItem(KEYS.LOGS, JSON.stringify(newLogs));
  },
  getSettings: (): AppSettings => {
    const stored = sessionStorage.getItem(KEYS.SETTINGS);
    const parsed = stored ? JSON.parse(stored) : {};
    return { 
        ...DEFAULT_SETTINGS, 
        ...parsed, 
        categories: parsed.categories || DEFAULT_SETTINGS.categories,
        notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) }
    };
  },
  saveSettings: (settings: AppSettings) => {
      sessionStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },
  getUser: (): UserProfile => {
      const stored = sessionStorage.getItem(KEYS.USER);
      return stored ? JSON.parse(stored) : INITIAL_USER;
  },
  saveUser: (user: UserProfile) => {
      sessionStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  getNotifications: (): AppNotification[] => {
      const stored = sessionStorage.getItem(KEYS.NOTIFICATIONS);
      return stored ? JSON.parse(stored) : INITIAL_NOTIFICATIONS;
  },
  saveNotifications: (notifications: AppNotification[]) => {
      sessionStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },
  clearAll: () => {
      sessionStorage.clear();
  },
  clearDataOnly: () => {
      sessionStorage.removeItem(KEYS.VAULTS);
      sessionStorage.removeItem(KEYS.ITEMS);
      sessionStorage.removeItem(KEYS.LOGS);
      sessionStorage.removeItem(KEYS.SETTINGS);
      sessionStorage.removeItem(KEYS.NOTIFICATIONS);
  },
  clearIndexedDB: async () => {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
          if (db.name && !db.name.includes('auth')) {
              indexedDB.deleteDatabase(db.name);
          }
      }
  }
};