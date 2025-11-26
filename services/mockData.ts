import { Item, ItemType, Vault, UserProfile, LogEntry } from '../types';

export const INITIAL_USER: UserProfile = {
  name: "Alex Sterling",
  email: "alex.sterling@example.com",
  avatar: "AS",
  pinHash: "1234" // For demo purposes, PIN is 1234
};

export const INITIAL_VAULTS: Vault[] = [
  {
    id: 'v1',
    name: 'Personal',
    description: 'My personal secure items',
    icon: 'User',
    createdAt: new Date().toISOString(),
    itemCount: 4,
    isShared: false,
    sharedWith: []
  },
  {
    id: 'v2',
    name: 'Work',
    description: 'Company credentials',
    icon: 'Briefcase',
    createdAt: new Date().toISOString(),
    itemCount: 2,
    isShared: true,
    sharedWith: ['boss@company.com']
  },
  {
    id: 'v3',
    name: 'Finance',
    description: 'Bank accounts and cards',
    icon: 'CreditCard',
    createdAt: new Date().toISOString(),
    itemCount: 3,
    isShared: false,
    sharedWith: []
  }
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'i1',
    vaultId: 'v1',
    type: ItemType.LOGIN,
    name: 'Netflix',
    isFavorite: true,
    lastUpdated: new Date().toISOString(),
    data: {
      username: 'alex@example.com',
      password: 'correct-horse-battery-staple', // strong
      url: 'https://netflix.com',
    } as any
  },
  {
    id: 'i2',
    vaultId: 'v1',
    type: ItemType.LOGIN,
    name: 'Google Account',
    isFavorite: false,
    lastUpdated: new Date().toISOString(),
    data: {
      username: 'alex.sterling@gmail.com',
      password: 'password123', // weak
      url: 'https://google.com',
      totp: 'JBSWY3DPEHPK3PXP'
    } as any
  },
  {
    id: 'i3',
    vaultId: 'v3',
    type: ItemType.CARD,
    name: 'Chase Sapphire',
    isFavorite: true,
    lastUpdated: new Date().toISOString(),
    data: {
      holderName: 'ALEX STERLING',
      number: '4111 1111 1111 1111',
      expiry: '12/28',
      cvv: '123'
    } as any
  },
  {
    id: 'i4',
    vaultId: 'v2',
    type: ItemType.WIFI,
    name: 'Office Guest',
    isFavorite: false,
    lastUpdated: new Date().toISOString(),
    data: {
      ssid: 'Office_Guest_5G',
      password: 'GuestPassword2024!',
      securityType: 'WPA2'
    } as any
  },
  {
    id: 'i5',
    vaultId: 'v2',
    type: ItemType.NOTE,
    name: 'Server Configs',
    isFavorite: false,
    lastUpdated: new Date().toISOString(),
    data: {
      content: 'IP: 192.168.1.55\nSSH Key: stored in secure drive'
    } as any
  }
];

export const INITIAL_LOGS: LogEntry[] = [
  { id: 'l1', timestamp: new Date(Date.now() - 1000000).toISOString(), action: 'LOGIN', details: 'Successful login' },
  { id: 'l2', timestamp: new Date(Date.now() - 500000).toISOString(), action: 'CREATE', details: 'Created item "Netflix"' },
];
