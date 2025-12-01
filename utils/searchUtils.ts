import { Item, Vault, ItemType } from '../types';

/**
 * Search utility functions for testing and validation
 */

export interface SearchResult {
  items: Item[];
  vaults: Vault[];
  totalCount: number;
}

/**
 * Comprehensive search function that matches the SearchOverlay logic
 */
export function searchVault(query: string, items: Item[], vaults: Vault[]): SearchResult {
  if (!query.trim()) {
    return { items: [], vaults: [], totalCount: 0 };
  }

  const searchTerm = query.toLowerCase().trim();
  
  // Search items with comprehensive field matching
  const matchedItems = items.filter(item => {
    if (item.deletedAt) return false;
    
    // Search in name
    if (item.name.toLowerCase().includes(searchTerm)) return true;
    
    // Search in data fields based on item type
    const data = item.data;
    
    // Common fields across all types
    if (data.username?.toLowerCase().includes(searchTerm)) return true;
    if (data.content?.toLowerCase().includes(searchTerm)) return true;
    
    // Type-specific fields
    switch (item.type) {
      case ItemType.LOGIN:
        if (data.url?.toLowerCase().includes(searchTerm)) return true;
        break;
      case ItemType.WIFI:
        if (data.ssid?.toLowerCase().includes(searchTerm)) return true;
        break;
      case ItemType.BANK:
        if (data.bankName?.toLowerCase().includes(searchTerm)) return true;
        if (data.accountNumber?.toLowerCase().includes(searchTerm)) return true;
        if (data.website?.toLowerCase().includes(searchTerm)) return true;
        break;
      case ItemType.DATABASE:
        if (data.databaseName?.toLowerCase().includes(searchTerm)) return true;
        if (data.host?.toLowerCase().includes(searchTerm)) return true;
        break;
      case ItemType.SERVER:
        if (data.hostname?.toLowerCase().includes(searchTerm)) return true;
        if (data.ip?.toLowerCase().includes(searchTerm)) return true;
        break;
      case ItemType.SSH_KEY:
        if (data.host?.toLowerCase().includes(searchTerm)) return true;
        break;
      case ItemType.FILE:
        if (data.fileName?.toLowerCase().includes(searchTerm)) return true;
        break;
    }
    
    // Search in folder
    if (item.folder?.toLowerCase().includes(searchTerm)) return true;
    
    return false;
  }).slice(0, 8); // Limit to 8 items

  // Search vaults
  const matchedVaults = vaults.filter(vault => {
    if (vault.deletedAt) return false;
    return vault.name.toLowerCase().includes(searchTerm) ||
           vault.description?.toLowerCase().includes(searchTerm);
  }).slice(0, 4); // Limit to 4 vaults

  return {
    items: matchedItems,
    vaults: matchedVaults,
    totalCount: matchedItems.length + matchedVaults.length
  };
}

/**
 * Validate search functionality with mock data
 */
export function validateSearchFunctionality(): boolean {
  // Mock data for testing
  const mockItems: Item[] = [
    {
      id: '1',
      vaultId: 'vault1',
      type: ItemType.LOGIN,
      name: 'Google Account',
      data: { username: 'user@gmail.com', url: 'https://google.com' },
      isFavorite: false,
      lastUpdated: new Date().toISOString()
    },
    {
      id: '2',
      vaultId: 'vault1',
      type: ItemType.WIFI,
      name: 'Home WiFi',
      data: { ssid: 'MyHomeNetwork', password: 'password123' },
      isFavorite: true,
      lastUpdated: new Date().toISOString()
    },
    {
      id: '3',
      vaultId: 'vault2',
      type: ItemType.BANK,
      name: 'Chase Bank',
      data: { bankName: 'Chase', accountNumber: '1234567890' },
      isFavorite: false,
      lastUpdated: new Date().toISOString(),
      deletedAt: new Date().toISOString() // This should be filtered out
    }
  ] as Item[];

  const mockVaults: Vault[] = [
    {
      id: 'vault1',
      name: 'Personal',
      description: 'Personal accounts and passwords',
      icon: 'Folder',
      createdAt: new Date().toISOString(),
      itemCount: 2,
      isShared: false,
      sharedWith: []
    },
    {
      id: 'vault2',
      name: 'Work',
      description: 'Work-related credentials',
      icon: 'Briefcase',
      createdAt: new Date().toISOString(),
      itemCount: 1,
      isShared: true,
      sharedWith: ['user2']
    }
  ];

  // Test cases
  const tests = [
    {
      query: 'google',
      expectedItems: 1,
      expectedVaults: 0,
      description: 'Should find Google account'
    },
    {
      query: 'gmail',
      expectedItems: 1,
      expectedVaults: 0,
      description: 'Should find item by username'
    },
    {
      query: 'personal',
      expectedItems: 0,
      expectedVaults: 1,
      description: 'Should find Personal vault'
    },
    {
      query: 'work',
      expectedItems: 0,
      expectedVaults: 1,
      description: 'Should find Work vault by name'
    },
    {
      query: 'credentials',
      expectedItems: 0,
      expectedVaults: 1,
      description: 'Should find vault by description'
    },
    {
      query: 'chase',
      expectedItems: 0, // Should be 0 because item is deleted
      expectedVaults: 0,
      description: 'Should not find deleted items'
    },
    {
      query: '',
      expectedItems: 0,
      expectedVaults: 0,
      description: 'Empty query should return no results'
    }
  ];

  let allTestsPassed = true;

  tests.forEach(test => {
    const result = searchVault(test.query, mockItems, mockVaults);
    const itemsMatch = result.items.length === test.expectedItems;
    const vaultsMatch = result.vaults.length === test.expectedVaults;
    
    if (!itemsMatch || !vaultsMatch) {
      console.error(`Test failed: ${test.description}`);
      console.error(`Query: "${test.query}"`);
      console.error(`Expected: ${test.expectedItems} items, ${test.expectedVaults} vaults`);
      console.error(`Got: ${result.items.length} items, ${result.vaults.length} vaults`);
      allTestsPassed = false;
    } else {
      console.log(`✓ Test passed: ${test.description}`);
    }
  });

  return allTestsPassed;
}

/**
 * Get search suggestions based on query
 */
export function getSearchSuggestions(query: string, items: Item[], vaults: Vault[]): string[] {
  if (!query.trim()) return [];

  const suggestions = new Set<string>();
  const searchTerm = query.toLowerCase();

  // Add item names that start with the query
  items.forEach(item => {
    if (!item.deletedAt && item.name.toLowerCase().startsWith(searchTerm)) {
      suggestions.add(item.name);
    }
  });

  // Add vault names that start with the query
  vaults.forEach(vault => {
    if (!vault.deletedAt && vault.name.toLowerCase().startsWith(searchTerm)) {
      suggestions.add(vault.name);
    }
  });

  return Array.from(suggestions).slice(0, 5);
}

export default {
  searchVault,
  validateSearchFunctionality,
  getSearchSuggestions
};