import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Shield,
  Key,
  LayoutGrid,
  Settings,
  Lock,
  Search,
  X,
  PanelLeft,
  Trash2,
  Bell,
  Check,
  Trash,
  LogOut,
} from "lucide-react";
import { useAuth, useData } from "../App";
import { useAuthStore } from "../src/stores/authStore";
import { useItemStore } from "../src/stores/itemStore";
import { useAutoLock } from "../src/hooks/useAutoLock";
import { NotificationType } from "../types";
import SyncStatus from "./SyncStatus";
import SearchOverlay from "./SearchOverlay";

const HushkeyLogo = ({ size = 24 }: { size?: number }) => (
  <div
    className="relative flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full text-white"
    >
      <path
        d="M20 20V80"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M80 20V80"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M20 50H80"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Key Element interacting with H and K */}
      <path
        d="M45 50L65 30"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M65 30L75 40"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="40" cy="50" r="8" fill="currentColor" />
    </svg>
  </div>
);

const SidebarLink = memo(({
  to,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string;
  icon: any;
  label: string;
  collapsed: boolean;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;
    
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(to);
  }, [navigate, to]);
  
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative w-full text-left ${
        isActive
          ? "bg-primary-600 text-white shadow-lg shadow-primary-900/50"
          : "text-gray-400 hover:bg-gray-850 hover:text-gray-200"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <Icon size={20} strokeWidth={2} className="shrink-0" />
      {!collapsed && (
        <span className="font-medium whitespace-nowrap overflow-hidden transition-opacity duration-300">
          {label}
        </span>
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
          {label}
        </div>
      )}
    </button>
  );
});

const MobileNavLink = memo(({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: any;
  label: string;
}) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
          isActive ? "text-primary-400" : "text-gray-500"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
});

// Desktop Sidebar Component
const Sidebar = memo(({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (val: boolean) => void }) => {
  const { lock, signOut } = useAuthStore();
  const navigate = useNavigate();
  
  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-gray-950 border-r border-gray-850 fixed left-0 top-0 z-20 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div
        className={`p-6 flex items-center ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/40 shrink-0 transition-transform duration-300">
            <HushkeyLogo size={24} />
          </div>
          {!collapsed && (
            <h1 className="text-xl font-bold text-white tracking-tight whitespace-nowrap overflow-hidden animate-fade-in">
              Hushkey
            </h1>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
          >
            <PanelLeft size={18} />
          </button>
        )}
      </div>

      {/* Center collapse button if collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-auto mb-4 text-gray-500 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded"
        >
          <PanelLeft size={18} />
        </button>
      )}

      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-800">
        <SidebarLink
          to="/vaults"
          icon={LayoutGrid}
          label="Vaults"
          collapsed={collapsed}
        />
        <SidebarLink
          to="/items"
          icon={Key}
          label="All Items"
          collapsed={collapsed}
        />
        <SidebarLink
          to="/guardian"
          icon={Shield}
          label="Guardian"
          collapsed={collapsed}
        />
        <SidebarLink
          to="/trash"
          icon={Trash2}
          label="Trash"
          collapsed={collapsed}
        />
        <SidebarLink
          to="/settings"
          icon={Settings}
          label="Settings"
          collapsed={collapsed}
        />
      </nav>

      <div className="p-4 border-t border-gray-850 space-y-2">
        <button
          onClick={() => {
            lock();
            navigate("/login");
          }}
          className={`flex items-center gap-3 px-3 py-2.5 w-full text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
          title="Lock Vault"
        >
          <Lock size={20} className="shrink-0" />
          {!collapsed && (
            <span className="font-medium whitespace-nowrap overflow-hidden">
              Lock
            </span>
          )}
        </button>
        <button
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          className={`flex items-center gap-3 px-3 py-2.5 w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
          title="Sign Out"
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && (
            <span className="font-medium whitespace-nowrap overflow-hidden">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </aside>
  );
});

// Header Component
const Header = memo(({
  searchOpen,
  setSearchOpen,
  items,
  vaults,
  notifications,
  unreadNotificationCount,
  markNotificationsRead,
  clearNotifications,
  showNotifications,
  setShowNotifications,
  notifRef
}: any) => {
  const handleNotificationClick = useCallback(() => {
    setShowNotifications((prev: boolean) => !prev);
  }, [setShowNotifications]);

  const getNotifIcon = useCallback((type: NotificationType) => {
    switch (type) {
      case NotificationType.SECURITY:
        return <Shield size={16} className="text-red-400" />;
      case NotificationType.ALERT:
        return <Bell size={16} className="text-orange-400" />;
      case NotificationType.SUCCESS:
        return <Check size={16} className="text-green-400" />;
      default:
        return <Bell size={16} className="text-blue-400" />;
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-850 px-4 py-3 md:px-8 md:py-4 flex items-center justify-between">
      <div className="md:hidden flex items-center gap-2">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <HushkeyLogo size={16} />
        </div>
        <span className="font-bold text-lg">Hushkey</span>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl mx-4 relative hidden md:block">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full bg-gray-900 border border-gray-800 rounded-full py-2 pl-10 pr-4 text-sm text-gray-500 hover:text-gray-300 hover:border-gray-700 transition-all text-left flex items-center gap-3"
        >
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            size={18}
          />
          <span>Search your vault...</span>
          <div className="ml-auto flex items-center gap-1 text-xs">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] font-mono">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] font-mono">K</kbd>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Sync Status */}
        <SyncStatus />
        
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleNotificationClick}
            className={`p-2 rounded-full transition-colors relative z-50 ${
              showNotifications
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Bell size={24} />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-950"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in origin-top-right ring-1 ring-black/5">
              <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
                <h3 className="text-sm font-bold text-gray-200">
                  Notifications
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={markNotificationsRead}
                    className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-primary-400"
                    title="Mark all read"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={clearNotifications}
                    className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-red-400"
                    title="Clear all"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors ${
                        !notif.read ? "bg-primary-900/5" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">{getNotifIcon(notif.type)}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4
                              className={`text-sm font-medium ${
                                !notif.read ? "text-white" : "text-gray-300"
                              }`}
                            >
                              {notif.title}
                            </h4>
                            {!notif.read && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5"></div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-gray-600 mt-2 block">
                            {new Date(notif.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Search Toggle */}
        <button
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={24} />
        </button>
      </div>
    </header>
  );
});

const AppLayout: React.FC = () => {
  const { lock, signOut } = useAuthStore();
  const navigate = useNavigate();
  const {
    items: dataItems,
    vaults: dataVaults,
    notifications,
    unreadNotificationCount,
    markNotificationsRead,
    clearNotifications,
  } = useData();
  const { items: storeItems, vaults: storeVaults } = useItemStore();
  
  // Use store data if available, fallback to context data
  const items = storeItems.length > 0 ? storeItems : dataItems;
  const vaults = storeVaults.length > 0 ? storeVaults : dataVaults;
  
  useAutoLock();
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  const [pullDistance, setPullDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const startY = useRef(0);
  const lockThreshold = 120;

  const hideHeader = ["/guardian", "/trash", "/settings"].some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <main
        className={`flex-1 flex flex-col relative pb-20 md:pb-0 transition-all duration-300 ${
          collapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        {!hideHeader && <Header 
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          items={items}
          vaults={vaults}
          notifications={notifications}
          unreadNotificationCount={unreadNotificationCount}
          markNotificationsRead={markNotificationsRead}
          clearNotifications={clearNotifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          notifRef={notifRef}
        />}

        {/* Search Overlay */}
        <SearchOverlay
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          items={items}
          vaults={vaults}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Lock Pull Tab */}
      <div className="md:hidden fixed bottom-[70px] left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div 
          className="pointer-events-auto relative"
          style={{
            transform: `translateY(-${pullDistance}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Lock tab */}
          <div
            onTouchStart={(e) => {
              e.preventDefault();
              startY.current = e.touches[0].clientY;
              setIsDragging(true);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              if (!isDragging) return;
              const currentY = e.touches[0].clientY;
              const distance = Math.max(0, startY.current - currentY);
              setPullDistance(Math.min(distance, lockThreshold + 50));
            }}
            onTouchEnd={() => {
              setIsDragging(false);
              if (pullDistance >= lockThreshold) {
                setIsLocking(true);
                setTimeout(() => {
                  lock();
                  navigate("/login");
                }, 800);
              } else {
                setPullDistance(0);
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              startY.current = e.clientY;
              setIsDragging(true);
            }}
            onMouseMove={(e) => {
              e.preventDefault();
              if (!isDragging) return;
              const distance = Math.max(0, startY.current - e.clientY);
              setPullDistance(Math.min(distance, lockThreshold + 50));
            }}
            onMouseUp={() => {
              setIsDragging(false);
              if (pullDistance >= lockThreshold) {
                setIsLocking(true);
                setTimeout(() => {
                  lock();
                  navigate("/login");
                }, 800);
              } else {
                setPullDistance(0);
              }
            }}
            onMouseLeave={() => {
              if (isDragging) {
                setIsDragging(false);
                setPullDistance(0);
              }
            }}
            className="bg-gray-900/90 backdrop-blur border border-gray-800 border-b-0 rounded-t-xl px-8 py-1.5 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none relative overflow-hidden z-10"
          >
            {isLocking && (
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-amber-600/20 animate-pulse" />
            )}
            
            {pullDistance > 0 && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-amber-500 to-amber-600 transition-opacity"
                style={{
                  opacity: Math.min(pullDistance / lockThreshold, 1),
                  boxShadow: pullDistance >= lockThreshold ? '0 0 20px rgba(251, 191, 36, 0.8)' : 'none',
                }}
              />
            )}
            
            <div 
              className="w-8 h-1 rounded-full mb-0.5 transition-all duration-200"
              style={{
                backgroundColor: isLocking 
                  ? '#f59e0b' 
                  : pullDistance >= lockThreshold 
                    ? '#10b981' 
                    : pullDistance > 0 
                      ? `rgb(${Math.min(255, 100 + pullDistance * 1.5)}, ${Math.max(100, 200 - pullDistance)}, 100)` 
                      : '#374151',
                boxShadow: pullDistance >= lockThreshold ? '0 0 10px rgba(16, 185, 129, 0.8)' : 'none',
                transform: `scaleX(${1 + pullDistance / 100})`,
              }}
            />
            
            <div 
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 relative z-10"
              style={{
                color: isLocking 
                  ? '#f59e0b' 
                  : pullDistance >= lockThreshold 
                    ? '#10b981' 
                    : pullDistance > 0 
                      ? '#fbbf24' 
                      : '#9ca3af',
                transform: `scale(${1 + pullDistance / 200})`,
              }}
            >
              <Lock size={10} />
              <span>
                {pullDistance >= lockThreshold ? 'Release!' : 'Lock'}
              </span>
            </div>
          </div>
          
          {/* Hidden expandable section */}
          <div 
            className="bg-gray-900/95 backdrop-blur border border-gray-800 border-t-0 rounded-b-xl shadow-[0_8px_16px_-4px_rgba(0,0,0,0.4)] overflow-hidden"
            style={{
              height: `${Math.max(0, pullDistance)}px`,
              opacity: pullDistance > 10 ? 1 : 0,
              transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="px-8 py-4 flex flex-col items-center justify-start h-full relative">
              {pullDistance > 20 && (
                <div className="flex flex-col items-center space-y-1 mb-2">
                  <div className="text-xs text-gray-500 animate-bounce" style={{ animationDelay: '0.1s' }}>⌃</div>
                  <div className="text-xs text-gray-500 animate-bounce">⌃</div>
                </div>
              )}
              {pullDistance > 40 && (
                <div className="text-center space-y-2 animate-fade-in">
                  <Lock 
                    size={24} 
                    className={isLocking ? 'animate-bounce text-amber-400' : 'text-gray-400'}
                    style={{
                      transform: isLocking ? 'rotate(0deg)' : `rotate(${pullDistance * 2}deg)`,
                      transition: 'transform 0.2s',
                    }}
                  />
                  <div className="text-xs text-gray-400">
                    {isLocking ? 'Locking...' : pullDistance >= lockThreshold ? 'Ready to lock' : 'Keep pulling...'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-lg border-t border-gray-850 flex justify-around items-center p-2 pb-safe z-30">
        <MobileNavLink to="/vaults" icon={LayoutGrid} label="Vaults" />
        <MobileNavLink to="/items" icon={Key} label="Items" />
        <MobileNavLink to="/guardian" icon={Shield} label="Guardian" />
        <MobileNavLink to="/trash" icon={Trash2} label="Trash" />
        <MobileNavLink to="/settings" icon={Settings} label="Settings" />
      </nav>
    </div>
  );
};

export default AppLayout;
