

export enum ItemType {
  LOGIN = 'LOGIN',
  CARD = 'CARD',
  IDENTITY = 'IDENTITY',
  NOTE = 'NOTE',
  WIFI = 'WIFI',
  BANK = 'BANK',
  LICENSE = 'LICENSE',
  DATABASE = 'DATABASE',
  SERVER = 'SERVER',
  SSH_KEY = 'SSH_KEY',
  ID_CARD = 'ID_CARD',
  FILE = 'FILE'
}

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex
}

export interface Vault {
  id: string;
  name: string;
  description?: string;
  icon: string; // Lucide icon name
  createdAt: string;
  itemCount: number;
  isShared: boolean;
  sharedWith: string[];
  notes?: string;
  deletedAt?: string;
}

// Base fields
export interface ItemBase {
  id: string;
  vaultId: string;
  categoryId?: string; // New field
  type: ItemType;
  name: string;
  notes?: string;
  isFavorite: boolean;
  lastUpdated: string;
  folder?: string;
  deletedAt?: string;
}

// Specific data structures (simplified for the demo but structured)
export interface LoginData {
  username?: string;
  password?: string;
  url?: string;
  totp?: string;
  passwordExpiryInterval?: number; // Days. 0 = Never
  passwordLastModified?: string;
}

export interface CardData {
  holderName?: string;
  number?: string;
  expiry?: string;
  cvv?: string;
  pin?: string;
  cardType?: 'debit' | 'credit';
  provider?: 'visa' | 'mastercard' | 'amex' | 'rupay' | 'other';
  cardImage?: string; // base64
}

export interface IdentityData {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  username?: string;
  company?: string;
  
  // Personal
  dob?: string;
  gender?: string;
  bloodGroup?: string;

  // Address
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  // Contact
  email?: string;
  phone?: string;
  
  // IDs & Other
  passportNumber?: string;
  licenseNumber?: string;
  spouseName?: string;
}

export interface NoteData {
  content: string;
}

export interface WifiData {
  ssid: string;
  password?: string;
  securityType?: string;
  passwordExpiryInterval?: number;
  passwordLastModified?: string;
}

export interface BankData {
  bankName?: string;
  website?: string; // For logo fetching
  branch?: string;
  accountNumber?: string;
  accountType?: string;
  ifsc?: string; // IFSC/IBAN
  swift?: string; // SWIFT/BIC
  holderName?: string;
}

export interface LicenseData {
  licenseNumber: string;
  expiryDate: string;
  state: string;
}

export interface DatabaseData {
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  databaseName?: string; // "Database" usually implies name
  dbType?: 'mysql' | 'postgres' | 'oracle' | 'mssql' | 'mongo' | 'redis' | 'other';
  passwordExpiryInterval?: number;
  passwordLastModified?: string;
}

export interface ServerData {
  ip?: string;
  hostname?: string;
  os?: string;
  username?: string;
  password?: string;
  hostingProvider?: string;
  passwordExpiryInterval?: number;
  passwordLastModified?: string;
}

export interface SSHKeyData {
  host?: string;
  username?: string;
  publicKey?: string;
  privateKey?: string;
  passphrase?: string;
  totp?: string;
  passwordExpiryInterval?: number;
  passwordLastModified?: string;
}

export interface IdCardData {
  cardTitle?: string;
  idName?: string;
  fullName?: string;
  validTill?: string;
  relationName?: string; // Father/Husband Name
  address?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // Base64
}

export interface FileData {
  fileName?: string;
  attachments?: FileAttachment[];
}

export interface Item extends ItemBase {
  data: LoginData & CardData & IdentityData & NoteData & WifiData & BankData & LicenseData & DatabaseData & ServerData & SSHKeyData & IdCardData & FileData; 
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string; // initials
  pinHash: string; // Mock hash
  recoveryEmail?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'RESTORE' | 'PERMANENT_DELETE' | 'CLEAR_DATA' | 'SYNC';
  details: string;
}

export type AccentColor = 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'cyan';

export interface NotificationSettings {
    // Security
    newDeviceLogin: boolean;
    failedLoginAttempts: boolean;
    weakPasswordAlerts: boolean;
    
    // Reminders
    expiryReminders: boolean;
    backupHealth: boolean;
    monthlyReport: boolean;
    
    // Activity
    sessionAlerts: boolean;
    sharedVaultUpdates: boolean;

    // Channels
    pushNotifications: boolean;
    emailNotifications: boolean;
}

export enum NotificationType {
    SECURITY = 'SECURITY',
    ALERT = 'ALERT',
    INFO = 'INFO',
    SUCCESS = 'SUCCESS'
}

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    timestamp: string;
    read: boolean;
}

export interface AppSettings {
  autoLockMinutes: number; // 0 = disabled
  clipboardClearSeconds: number;
  theme: 'dark' | 'light' | 'system';
  unlockMethod: 'pin' | 'biometric' | 'password';
  allowScreenshots: boolean;
  lastSync: string;
  groupItemsByCategory: boolean; // New setting
  categories: Category[]; // New setting
  accentColor: AccentColor; // New setting
  notifications: NotificationSettings; // New setting
}