export enum ItemType {
  LOGIN = "LOGIN",
  CARD = "CARD",
  IDENTITY = "IDENTITY",
  NOTE = "NOTE",
  WIFI = "WIFI",
  BANK = "BANK",
  DATABASE = "DATABASE",
  SERVER = "SERVER",
  SSH_KEY = "SSH_KEY",
  ID_CARD = "ID_CARD",
  FILE = "FILE",
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Vault {
  id: string;
  name: string;
  description?: string;
  icon: string;
  createdAt: string;
  itemCount: number;
  isShared: boolean;
  sharedWith: string[];
  notes?: string;
  deletedAt?: string;
}

export interface ItemBase {
  id: string;
  vaultId: string;
  categoryId?: string;
  type: ItemType;
  name: string;
  notes?: string;
  isFavorite: boolean;
  lastUpdated: string;
  folder?: string;
  deletedAt?: string;
  faviconData?: string;
}

export interface LoginData {
  username?: string;
  password?: string;
  url?: string;
  totp?: string;
  passwordExpiryInterval?: number;
  passwordLastModified?: string;
}

export interface CardData {
  holderName?: string;
  number?: string;
  expiry?: string;
  cvv?: string;
  pin?: string;
  cardType?: "debit" | "credit";
  provider?: "visa" | "mastercard" | "amex" | "rupay" | "other";
  cardImage?: string;
}

export interface IdentityData {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  username?: string;
  company?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  email?: string;
  phone?: string;
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
  website?: string;
  branch?: string;
  accountNumber?: string;
  accountType?: string;
  ifsc?: string;
  swift?: string;
  holderName?: string;
}

export interface DatabaseData {
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  databaseName?: string;
  dbType?:
    | "mysql"
    | "postgres"
    | "oracle"
    | "mssql"
    | "mongo"
    | "redis"
    | "other";
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
  relationName?: string;
  address?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string;
  createdAt?: string;
}

export interface FileData {
  fileName?: string;
  attachments?: FileAttachment[];
}

export interface Item extends ItemBase {
  data: LoginData &
    CardData &
    IdentityData &
    NoteData &
    WifiData &
    BankData &
    DatabaseData &
    ServerData &
    SSHKeyData &
    IdCardData &
    FileData;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  pinHash: string;
  recoveryEmail?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action:
    | "LOGIN"
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "VIEW"
    | "EXPORT"
    | "RESTORE"
    | "PERMANENT_DELETE"
    | "CLEAR_DATA"
    | "SYNC";
  details: string;
}

export type AccentColor =
  | "violet"
  | "blue"
  | "emerald"
  | "rose"
  | "amber"
  | "cyan";
export type ThemePattern =
  | "none"
  | "waves"
  | "geometric"
  | "dots"
  | "gradient"
  | "mesh"
  | "circuit"
  | "hexagon";

export interface NotificationSettings {
  newDeviceLogin: boolean;
  failedLoginAttempts: boolean;
  weakPasswordAlerts: boolean;
  expiryReminders: boolean;
  backupHealth: boolean;
  monthlyReport: boolean;
  sessionAlerts: boolean;
  sharedVaultUpdates: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
}

export function isValidNotificationSettings(
  obj: any
): obj is NotificationSettings {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.newDeviceLogin === "boolean" &&
    typeof obj.failedLoginAttempts === "boolean" &&
    typeof obj.weakPasswordAlerts === "boolean" &&
    typeof obj.expiryReminders === "boolean" &&
    typeof obj.backupHealth === "boolean" &&
    typeof obj.monthlyReport === "boolean" &&
    typeof obj.sessionAlerts === "boolean" &&
    typeof obj.sharedVaultUpdates === "boolean" &&
    typeof obj.pushNotifications === "boolean" &&
    typeof obj.emailNotifications === "boolean"
  );
}

export enum NotificationType {
  SECURITY = "SECURITY",
  ALERT = "ALERT",
  INFO = "INFO",
  SUCCESS = "SUCCESS",
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
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  theme: "dark" | "light" | "system";
  unlockMethod: "pin" | "biometric" | "password";
  allowScreenshots: boolean;
  lastSync: string;
  groupItemsByCategory: boolean;
  categories: Category[];
  accentColor: AccentColor;
  themePattern: ThemePattern;
  notifications: NotificationSettings;
}

export interface Share {
  id: string;
  userId: string;
  shareType: "item" | "vault";
  itemId?: string;
  vaultId?: string;
  shareMethod: "in_app" | "qr" | "url";
  shareToken: string;
  encryptedShareKey: string; // Share key encrypted with user's master key
  encryptedData: string;
  expiresAt?: string;
  maxViews?: number;
  viewCount: number;
  oneTimeAccess: boolean;
  passwordProtected: boolean;
  recipientEmail?: string;
  createdAt: string;
  lastAccessedAt?: string;
  revoked: boolean;
  revokedAt?: string;
}

export type UserSettings = AppSettings;
