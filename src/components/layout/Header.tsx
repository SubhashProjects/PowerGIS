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
import { NavTabId } from '../../config/navigationConfig';
import { LABELS } from '../../config/labelsConfig';
import {
  Search, Bell, Globe, ChevronDown, LogOut, Menu, X, ShieldCheck, Settings
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onNavigateTab?: (tab: NavTabId) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onNavigateTab }) => {
  const { user, logout } = useAuth();
  const { activeRegion, flyToRegion, setSelectedAsset } = useGIS();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(assetService.isSimulatorMode());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to simulator mode changes
  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setIsSimulatorActive(assetService.isSimulatorMode());
    });
    return unsub;
  }, []);

  const handleToggleSimulator = () => {
    const next = assetService.toggleSimulatorMode();
    setIsSimulatorActive(next);
  };

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
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between gap-2">
        {/* Left: Mobile Menu Button & Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 min-w-0">
          {/* Mobile Hamburger Drawer Trigger */}
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 md:hidden transition-colors flex-shrink-0"
            aria-label={LABELS.header.menuToggleAria}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo Emblem */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-md shadow-blue-500/25 flex-shrink-0">
            ⚡
          </div>

          {/* Title */}
          <div className="flex-shrink-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-black text-xs sm:text-sm text-slate-900 tracking-wider whitespace-nowrap">{LABELS.header.brandName}</span>
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold border border-blue-200 uppercase tracking-wider whitespace-nowrap">
                {LABELS.header.brandBadge}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium hidden sm:block whitespace-nowrap">
              {LABELS.header.brandSubtitle}
            </p>
          </div>

          {/* Dynamic Breadcrumbs (Desktop) */}
          <div className="hidden 2xl:flex items-center space-x-1.5 text-[11px] font-mono pl-3 border-l border-slate-200 min-w-0 flex-shrink">
            <span className="text-slate-400 font-sans flex-shrink-0 whitespace-nowrap">{LABELS.header.jurisdictionPrefix}</span>
            <span className="font-bold text-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs truncate max-w-[200px] xl:max-w-[260px] whitespace-nowrap">
              {getBreadcrumb()}
            </span>
          </div>
        </div>

        {/* Global Asset Search (Desktop) with Ctrl + K */}
        <div className="relative w-36 md:w-48 lg:w-60 xl:w-72 hidden md:block flex-shrink min-w-[120px]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-blue-500 absolute left-3 pointer-events-none flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder={LABELS.header.searchPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-14 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono truncate"
            />
            <div className="absolute right-2 flex items-center space-x-0.5 pointer-events-none flex-shrink-0">
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
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {/* Mobile Search Button Toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="p-1.5 sm:p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 md:hidden transition-colors flex-shrink-0"
            title={LABELS.header.searchMobileTooltip}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Bell Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 sm:p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 hover:text-neutral-900 transition-colors flex-shrink-0"
              title={LABELS.header.notificationsTooltip}
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
                  <span className="text-neutral-900 font-extrabold">{LABELS.header.notificationsTitle} ({notifications.length})</span>
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

          {/* Master Grid & SCADA Simulator Mode Toggle ("Where to ON it") */}
          <button
            onClick={handleToggleSimulator}
            title={
              isSimulatorActive
                ? 'Simulator ACTIVE: Streaming simulated test grid & SCADA telemetry. Click to turn OFF (Clean Real Mode).'
                : 'Simulator OFF: Clean real operational mode. Click to turn ON simulated test grid & telemetry.'
            }
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold whitespace-nowrap flex-shrink-0 transition-all shadow-2xs cursor-pointer ${
              isSimulatorActive
                ? 'bg-amber-500/10 text-amber-800 border-amber-300 hover:bg-amber-500/20 shadow-amber-500/10'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isSimulatorActive ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="hidden sm:inline whitespace-nowrap">⚡ SIMULATOR:</span>
            <span className={`whitespace-nowrap ${isSimulatorActive ? 'text-amber-800 font-extrabold' : 'text-slate-500'}`}>
              {isSimulatorActive ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Region Switcher */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowRegionDropdown(!showRegionDropdown)}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-xs text-neutral-800 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
              <span className="font-medium truncate max-w-[70px] sm:max-w-none whitespace-nowrap">
                {initialRegions.find(r => r.id === activeRegion)?.name || 'Puducherry'}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-500 flex-shrink-0" />
            </button>

            {showRegionDropdown && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-neutral-200 rounded-xl shadow-2xl py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-500 border-b border-neutral-100">
                  {LABELS.header.regionsTitle}
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

          {/* User Profile Identity Badge (Static, Professional) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 shadow-2xs whitespace-nowrap flex-shrink-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-extrabold flex items-center justify-center text-[10px] uppercase flex-shrink-0 shadow-xs">
              {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : user.role.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block max-w-[110px] md:max-w-[130px] lg:max-w-[170px] truncate">
              <div className="font-bold text-slate-900 leading-tight truncate whitespace-nowrap">{user.fullName.split(',')[0]}</div>
              <div className="text-[10px] text-slate-500 font-medium leading-none truncate whitespace-nowrap">{user.designation}</div>
            </div>
            <span className="hidden md:inline-block px-1.5 py-0.5 rounded-md bg-blue-100/80 text-blue-800 font-mono text-[9px] font-extrabold uppercase border border-blue-200 whitespace-nowrap flex-shrink-0">
              {user.role}
            </span>
          </div>

          {/* Super Admin Direct Access Link */}
          {user.role === 'super_admin' && onNavigateTab && (
            <button
              onClick={() => onNavigateTab('admin_panel')}
              title={LABELS.header.adminConsoleTooltip}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs transition-all font-bold whitespace-nowrap flex-shrink-0 cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="hidden lg:inline text-[11px] whitespace-nowrap leading-none">{LABELS.header.adminConsole}</span>
            </button>
          )}

          {/* Sign Out Button */}
          <button
            onClick={logout}
            title={LABELS.header.signOutTooltip}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 border border-slate-200 text-xs transition-all font-semibold whitespace-nowrap flex-shrink-0 cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden md:inline text-[11px] whitespace-nowrap leading-none">{LABELS.header.signOut}</span>
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
              placeholder={LABELS.header.searchMobilePlaceholder}
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
