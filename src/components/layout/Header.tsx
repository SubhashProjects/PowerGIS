// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ENTERPRISE HEADER COMPONENT - PURE WHITE THEME & MOBILE ADAPTIVE
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGIS } from '../../context/GISContext';
import { assetService } from '../../services/assetService';
import { notificationService } from '../../services/notificationService';
import { initialRegions } from '../../services/mockData';
import {
  Search, Bell, Globe, ChevronDown, LogOut, Menu, X, ShieldCheck, Clock, Layers
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, switchUser, availableUsers, logout } = useAuth();
  const { activeRegion, flyToRegion, setSelectedAsset } = useGIS();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live Operational Clock (Ticking every 1 second - IST & UTC)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // IST is UTC+5:30
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      };
      const formatted = new Intl.DateTimeFormat('en-IN', options).format(now);
      setCurrentTime(`${formatted} IST · UTC+05:30`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Ctrl + K Keyboard Shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roleData = notificationService.getDashboardData(user);
  const notifications = roleData.notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 1) {
      const results = assetService.searchAssets(val);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectResult = (item: any) => {
    setSelectedAsset(item);
    setSearchResults([]);
    setSearchQuery('');
    setMobileSearchOpen(false);
  };

  // Breadcrumb determination based on active region & role
  const getBreadcrumb = () => {
    const regionName = initialRegions.find(r => r.id === activeRegion)?.name || 'Puducherry UT';
    return `${regionName} › Circle-I › Div-Urban › Marapalam Section`;
  };

  return (
    <header className="relative bg-white border-b border-neutral-200 z-30 select-none shadow-sm">
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between">
        {/* Left: Mobile Menu Button & Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile Hamburger Drawer Trigger */}
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 md:hidden transition-colors"
            aria-label="Toggle Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo Emblem */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-md shadow-blue-500/25 flex-shrink-0">
            ⚡
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-black text-xs sm:text-sm text-slate-900 tracking-wider">POWERGIS</span>
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold border border-blue-200 uppercase tracking-wider">
                DISTRIBUTION
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium hidden sm:block">
              PowerGIS • Utility Asset Management & Operations Portal
            </p>
          </div>

          {/* Dynamic Breadcrumbs (Desktop) */}
          <div className="hidden xl:flex items-center space-x-1.5 text-[11px] font-mono pl-4 border-l border-slate-200">
            <span className="text-slate-400 font-sans">Jurisdiction:</span>
            <span className="font-bold text-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
              {getBreadcrumb()}
            </span>
          </div>
        </div>

        {/* Global Asset Search (Desktop) with Ctrl + K */}
        <div className="relative w-64 lg:w-80 hidden md:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-blue-500 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search assets, feeders, poles... (Ctrl + K)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-14 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
            />
            <div className="absolute right-2 flex items-center space-x-0.5 pointer-events-none">
              <kbd className="px-1 py-0.5 text-[9px] font-mono font-bold bg-slate-200 text-slate-700 rounded border border-slate-300">
                Ctrl
              </kbd>
              <kbd className="px-1 py-0.5 text-[9px] font-mono font-bold bg-slate-200 text-slate-700 rounded border border-slate-300">
                K
              </kbd>
            </div>
          </div>

          {/* Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-10 left-0 right-0 bg-white border border-neutral-200 rounded-lg shadow-2xl overflow-hidden z-50">
              {searchResults.map(res => (
                <button
                  key={res.id || res.code || res.poleNumber}
                  onClick={() => handleSelectResult(res)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 flex items-center justify-between border-b border-neutral-100 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-neutral-900">{res.name || res.code || res.poleNumber}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">{res.type || res.tariffCategory || 'Asset'}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono">
                    {res.voltageClass || res.capacityKVA ? `${res.capacityKVA}kVA` : 'Asset'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Mobile Search Button Toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="p-1.5 sm:p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 md:hidden transition-colors"
            title="Search Assets"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Live Operational Clock (IST / UTC) */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-[11px] font-mono text-neutral-800 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-neutral-500 animate-pulse" />
            <span className="font-semibold">{currentTime}</span>
          </div>

          {/* White Theme Badge Indicator */}
          <div className="hidden 2xl:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-[11px] font-mono text-neutral-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>White Theme</span>
          </div>

          {/* Notifications Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 sm:p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 hover:text-neutral-900 transition-colors"
              title="Role Notifications & Assignments"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 text-white font-bold text-[9px] flex items-center justify-center font-mono shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-11 w-72 sm:w-96 bg-white border border-neutral-200 rounded-2xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 text-[10px] uppercase font-bold text-neutral-500">
                  <span className="text-neutral-900 font-extrabold">Role Notifications ({notifications.length})</span>
                  <span className="font-mono text-neutral-600 px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                    {user.role.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        notificationService.markAsRead(n.id);
                      }}
                      className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-mono uppercase font-bold text-neutral-800 bg-white border border-neutral-200 px-1.5 py-0.2 rounded shadow-2xs">
                          {n.priority}
                        </span>
                        <span className="text-neutral-500 font-mono">{n.timestamp}</span>
                      </div>
                      <div className="font-semibold text-xs text-neutral-900 leading-tight">{n.title}</div>
                      <div className="text-[11px] text-neutral-600 mt-0.5 leading-snug">{n.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Region Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRegionDropdown(!showRegionDropdown)}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-xs text-neutral-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-neutral-600" />
              <span className="font-medium truncate max-w-[70px] sm:max-w-none">
                {initialRegions.find(r => r.id === activeRegion)?.name || 'Puducherry'}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {showRegionDropdown && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-neutral-200 rounded-xl shadow-2xl py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-500 border-b border-neutral-100">
                  Union Territory Regions
                </div>
                {initialRegions.map(reg => (
                  <button
                    key={reg.id}
                    onClick={() => {
                      flyToRegion(reg.id);
                      setShowRegionDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 ${
                      activeRegion === reg.id ? 'text-neutral-900 font-bold bg-neutral-100' : 'text-neutral-700'
                    }`}
                  >
                    <span>{reg.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{reg.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Persona Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center space-x-1.5 sm:space-x-2 px-1.5 sm:px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-xs text-neutral-900 transition-colors"
            >
              <div className="w-6 h-6 rounded bg-neutral-900 text-white font-bold flex items-center justify-center text-[10px] uppercase flex-shrink-0">
                {user.role.substring(0, 2)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-neutral-900 leading-tight">{user.fullName.split(',')[0]}</div>
                <div className="text-[10px] text-neutral-500 font-medium leading-none">{user.designation}</div>
              </div>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 top-11 w-72 sm:w-80 bg-white border border-neutral-200 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 pb-2 mb-1 border-b border-neutral-200 text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Switch Engineering Persona</span>
                  <span className="text-neutral-900 font-mono font-bold bg-neutral-100 px-1.5 py-0.5 rounded">11 Roles</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {availableUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center space-x-3 hover:bg-neutral-50 transition-colors ${
                        user.id === u.id ? 'bg-neutral-100 border-l-3 border-neutral-900 font-bold' : ''
                      }`}
                    >
                      <span className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono text-[10px] uppercase font-bold">
                        {u.role}
                      </span>
                      <div className="flex-1 truncate">
                        <div className="font-semibold text-neutral-900 truncate">{u.fullName}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{u.designation}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            title="Sign Out of PowerGIS"
            className="flex items-center space-x-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-neutral-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-neutral-700 border border-neutral-200 text-xs transition-all font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Search Bar */}
      {mobileSearchOpen && (
        <div className="px-3 py-2 border-t border-neutral-200 bg-white md:hidden">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search assets, feeders, poles..."
              className="w-full bg-neutral-100 border border-neutral-200 rounded-lg pl-9 pr-9 py-2 text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none focus:border-neutral-900 font-mono"
            />
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-2 p-1 text-neutral-400 hover:text-neutral-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {searchResults.map(res => (
                <button
                  key={res.id || res.code || res.poleNumber}
                  onClick={() => handleSelectResult(res)}
                  className="w-full text-left px-3 py-2.5 text-xs hover:bg-neutral-50 flex items-center justify-between border-b border-neutral-100 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-neutral-900">{res.name || res.code || res.poleNumber}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">{res.type || res.tariffCategory || 'Asset'}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono">
                    {res.voltageClass || res.capacityKVA ? `${res.capacityKVA}kVA` : 'Asset'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
