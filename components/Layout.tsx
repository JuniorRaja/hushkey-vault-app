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
import { useAutoLock } from "../src/hooks/useAutoLock";
import { NotificationType } from "../types";
import SyncStatus from "./SyncStatus";

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
  searchQuery,
  setSearchQuery,
  searchOpen,
  setSearchOpen,
  items,
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
    <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-850 px-4 py-3 md:px-8 md:py-4 flex items-center justify-between">
      <div className="md:hidden flex items-center gap-2">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <HushkeyLogo size={16} />
        </div>
        <span className="font-bold text-lg">Hushkey</span>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl mx-4 relative hidden md:block">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          size={18}
        />
        <input
          type="text"
          placeholder="Search your vault..."
          className="w-full bg-gray-900 border border-gray-800 rounded-full py-2 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder-gray-600 z-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto z-50">
            {items
              .filter((i) =>
                i.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((i) => (
                <NavLink
                  to={`/items/${i.id}`}
                  key={i.id}
                  className="block p-2 hover:bg-gray-800 rounded-lg"
                  onClick={() => setSearchQuery("")}
                >
                  <div className="font-medium text-gray-200">{i.name}</div>
                  <div className="text-xs text-gray-500">{i.type}</div>
                </NavLink>
              ))}
            {items.filter((i) =>
              i.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 && (
              <div className="p-2 text-gray-500 text-sm">No results found</div>
            )}
          </div>
        )}
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
          onClick={() => setSearchOpen(!searchOpen)}
        >
          {searchOpen ? <X size={24} /> : <Search size={24} />}
        </button>
      </div>
    </header>
  );
});

const AppLayout: React.FC = () => {
  const { lock, signOut } = useAuthStore();
  const navigate = useNavigate();
  const {
    items,
    notifications,
    unreadNotificationCount,
    markNotificationsRead,
    clearNotifications,
  } = useData();
  
  useAutoLock();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const hideHeader = ["/guardian", "/trash", "/settings"].some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

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
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          items={items}
          notifications={notifications}
          unreadNotificationCount={unreadNotificationCount}
          markNotificationsRead={markNotificationsRead}
          clearNotifications={clearNotifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          notifRef={notifRef}
        />}

        {/* Mobile Search Overlay */}
        {searchOpen && !hideHeader && (
          <div className="md:hidden px-4 pb-4 bg-gray-950 border-b border-gray-850">
            <input
              type="text"
              placeholder="Search..."
              autoFocus
              className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 px-4 text-sm text-gray-200 focus:outline-none focus:border-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <div className="mt-2 space-y-1">
                {items
                  .filter((i) =>
                    i.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 5)
                  .map((i) => (
                    <NavLink
                      to={`/items/${i.id}`}
                      key={i.id}
                      className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <span className="font-medium">{i.name}</span>
                      <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">
                        {i.type}
                      </span>
                    </NavLink>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Lock Pull Tab Indicator */}
      <div className="md:hidden fixed bottom-[60px] left-0 right-0 z-20 flex justify-center pb-1 pointer-events-none">
        <button
          onClick={() => {
            lock();
            navigate("/login");
          }}
          className="pointer-events-auto bg-gray-900/90 backdrop-blur border border-gray-800 border-b-0 rounded-t-xl px-8 py-1.5 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] flex flex-col items-center gap-1 group active:translate-y-1 transition-transform"
        >
          <div className="w-8 h-1 bg-gray-700 rounded-full mb-0.5 group-hover:bg-primary-500 transition-colors" />
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-amber-400">
            <Lock size={10} />
            <span>Lock</span>
          </div>
        </button>
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
