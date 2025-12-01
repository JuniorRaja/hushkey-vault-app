import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Globe, CreditCard, StickyNote, Wifi, User, Landmark, RectangleHorizontal, Database, Server, Terminal, IdCard, FileText, Folder, Star } from 'lucide-react';
import { Item, Vault, ItemType } from '../types';
import { searchVault } from '../utils/searchUtils';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  vaults: Vault[];
}

const ItemTypeIcon = ({ type, size = 16 }: { type: ItemType, size?: number }) => {
  switch(type) {
    case ItemType.LOGIN: return <Globe className="text-blue-400" size={size} />;
    case ItemType.CARD: return <CreditCard className="text-green-400" size={size} />;
    case ItemType.NOTE: return <StickyNote className="text-yellow-400" size={size} />;
    case ItemType.WIFI: return <Wifi className="text-purple-400" size={size} />;
    case ItemType.IDENTITY: return <User className="text-pink-400" size={size} />;
    case ItemType.BANK: return <Landmark className="text-emerald-400" size={size} />;
    case ItemType.LICENSE: return <RectangleHorizontal className="text-orange-400" size={size} />;
    case ItemType.DATABASE: return <Database className="text-cyan-400" size={size} />;
    case ItemType.SERVER: return <Server className="text-indigo-400" size={size} />;
    case ItemType.SSH_KEY: return <Terminal className="text-slate-400" size={size} />;
    case ItemType.ID_CARD: return <IdCard className="text-teal-400" size={size} />;
    case ItemType.FILE: return <FileText className="text-rose-400" size={size} />;
    default: return <FileText className="text-gray-400" size={size} />;
  }
};

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, items, vaults }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Filter and search logic using utility function
  const searchResults = useMemo(() => {
    return searchVault(query, items, vaults);
  }, [query, items, vaults]);

  const totalResults = searchResults.totalCount;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          setQuery('');
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelectResult(selectedIndex);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, totalResults]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleSelectResult = (index: number) => {
    if (index < searchResults.vaults.length) {
      // Navigate to vault
      const vault = searchResults.vaults[index];
      navigate(`/items?vault=${vault.id}`);
    } else {
      // Navigate to item
      const itemIndex = index - searchResults.vaults.length;
      const item = searchResults.items[itemIndex];
      navigate(`/items/${item.id}`);
    }
    setQuery('');
    onClose();
  };

  const getItemSubtext = (item: Item) => {
    switch (item.type) {
      case ItemType.LOGIN:
        return item.data.username || item.data.url || 'Login';
      case ItemType.WIFI:
        return item.data.ssid || 'WiFi Network';
      case ItemType.DATABASE:
        return item.data.databaseName || item.data.host || 'Database';
      case ItemType.SERVER:
        return item.data.hostname || item.data.ip || 'Server';
      case ItemType.SSH_KEY:
        return item.data.host || 'SSH Key';
      case ItemType.BANK:
        return item.data.bankName || item.data.accountNumber || 'Bank Account';
      case ItemType.FILE:
        return item.data.fileName || 'File';
      case ItemType.NOTE:
        return item.data.content?.slice(0, 50) || 'Secure Note';
      default:
        return item.type.replace('_', ' ');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 search-blur-background animate-fade-in">
      {/* Blur overlay for background */}
      <div className="absolute inset-0" onClick={() => { setQuery(''); onClose(); }} />
      
      {/* Search container */}
      <div className="relative max-w-2xl mx-auto mt-8 md:mt-24 px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden search-mobile-spacing md:mx-0">
          {/* Search input */}
          <div className="flex items-center gap-3 p-4 md:p-6 border-b border-gray-800 search-mobile-spacing">
            <Search className="text-gray-500 shrink-0" size={20} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search items and vaults..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-lg outline-none"
            />
            <button
              onClick={() => { setQuery(''); onClose(); }}
              className="p-1 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Results */}
          <div 
            ref={resultsRef}
            className="max-h-96 md:max-h-96 search-results-mobile overflow-y-auto custom-scrollbar"
          >
            {!query.trim() ? (
              <div className="p-6 md:p-8 text-center text-gray-500">
                <Search size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Start typing to search your vault...</p>
                <p className="text-xs mt-2 text-gray-600">Search items, vaults, usernames, and more</p>
              </div>
            ) : totalResults === 0 ? (
              <div className="p-6 md:p-8 text-center text-gray-500">
                <Search size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No results found for "{query}"</p>
                <p className="text-xs mt-2 text-gray-600">Try different keywords or check spelling</p>
              </div>
            ) : (
              <div className="py-2">
                {/* Vaults section */}
                {searchResults.vaults.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Vaults ({searchResults.vaults.length})
                    </div>
                    {searchResults.vaults.map((vault, index) => (
                      <button
                        key={vault.id}
                        onClick={() => handleSelectResult(index)}
                        className={`w-full flex items-center gap-3 px-4 md:px-4 py-3 text-left transition-colors ${
                          selectedIndex === index 
                            ? 'bg-primary-600/20 border-l-2 border-primary-500' 
                            : 'hover:bg-gray-800/50 active:bg-gray-800'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                          <Folder size={16} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white truncate">{vault.name}</span>
                            {vault.isShared && (
                              <span className="px-1.5 py-0.5 bg-primary-900/30 text-primary-300 text-[9px] uppercase font-bold rounded tracking-wider">
                                Shared
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {vault.itemCount} items • {vault.description || 'No description'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Items section */}
                {searchResults.items.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Items ({searchResults.items.length})
                    </div>
                    {searchResults.items.map((item, index) => {
                      const resultIndex = searchResults.vaults.length + index;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectResult(resultIndex)}
                          className={`w-full flex items-center gap-3 px-4 md:px-4 py-3 text-left transition-colors ${
                            selectedIndex === resultIndex 
                              ? 'bg-primary-600/20 border-l-2 border-primary-500' 
                              : 'hover:bg-gray-800/50 active:bg-gray-800'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                            <ItemTypeIcon type={item.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white truncate">{item.name}</span>
                              {item.isFavorite && (
                                <Star size={12} className="text-yellow-500 fill-yellow-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {getItemSubtext(item)}
                              {item.folder && ` • ${item.folder}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer with keyboard shortcuts */}
          {totalResults > 0 && (
            <div className="px-4 py-3 border-t border-gray-800 bg-gray-950/50">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px]">Enter</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px]">Esc</kbd>
                    Close
                  </span>
                </div>
                <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;