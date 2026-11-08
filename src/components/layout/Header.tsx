// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ENTERPRISE HEADER COMPONENT - MONOCHROME B&W & MOBILE ADAPTIVE
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGIS } from '../../context/GISContext';
import { assetService } from '../../services/assetService';
import { notificationService } from '../../services/notificationService';
import { initialRegions } from '../../services/mockData';
import {
  Search, Bell, Globe, ChevronDown, LogOut, Menu, X, Sun, Moon
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, switchUser, availableUsers, logout } = useAuth();
  const { activeRegion, flyToRegion, setSelectedAsset, themeMode, toggleThemeMode } = useGIS();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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

  return (
    <header className="relative bg-black border-b border-neutral-800 z-30 select-none">
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between">
        {/* Left: Mobile Menu Button & Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile Hamburger Drawer Trigger */}
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 md:hidden transition-colors"
            aria-label="Toggle Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo Emblem */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white text-black flex items-center justify-center font-bold text-sm sm:text-base shadow-lg shadow-white/10 flex-shrink-0">
            ⚡
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-extrabold text-xs sm:text-sm text-white tracking-wider">POWERGIS</span>
              <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded bg-white/10 text-neutral-200 font-semibold border border-white/20 uppercase tracking-wider">
                DISTRIBUTION
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-neutral-400 font-medium hidden sm:block">
              PowerGIS • Asset Management & O&M Platform
            </p>
          </div>
        </div>

        {/* Global Asset Search (Desktop) */}
        <div className="relative w-72 lg:w-96 hidden md:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search assets, feeders, poles..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-mono"
            />
          </div>

          {/* Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-10 left-0 right-0 bg-[#0d0d0d] border border-neutral-800 rounded-lg shadow-2xl overflow-hidden z-50">
              {searchResults.map(res => (
                <button
                  key={res.id || res.code || res.poleNumber}
                  onClick={() => handleSelectResult(res)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-800 flex items-center justify-between border-b border-neutral-800/60 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-white">{res.name || res.code || res.poleNumber}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{res.type || res.tariffCategory || 'Asset'}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
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
            className="p-1.5 sm:p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 md:hidden transition-colors"
            title="Search Assets"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme Mode Toggle (Black / White) */}
          <button
            onClick={toggleThemeMode}
            className="p-1.5 sm:p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title={themeMode === 'black' ? 'Switch to Monochrome White Theme' : 'Switch to Monochrome Black Theme'}
          >
            {themeMode === 'black' ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-white" />}
          </button>

          {/* Notifications Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 sm:p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title="Role Notifications & Assignments"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black font-bold text-[9px] flex items-center justify-center font-mono shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-11 w-72 sm:w-96 bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-400">
                  <span className="text-white">Role Notifications ({notifications.length})</span>
                  <span className="font-mono text-neutral-400">{user.role.toUpperCase()}</span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        notificationService.markAsRead(n.id);
                      }}
                      className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all text-left"
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-mono uppercase font-bold text-white bg-neutral-800 px-1 rounded">
                          {n.priority}
                        </span>
                        <span className="text-neutral-500 font-mono">{n.timestamp}</span>
                      </div>
                      <div className="font-semibold text-xs text-white leading-tight">{n.title}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{n.message}</div>
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
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-neutral-300" />
              <span className="font-medium truncate max-w-[70px] sm:max-w-none">
                {initialRegions.find(r => r.id === activeRegion)?.name || 'Puducherry'}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showRegionDropdown && (
              <div className="absolute right-0 top-10 w-44 bg-[#0d0d0d] border border-neutral-800 rounded-lg shadow-2xl py-1 z-50">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-neutral-500">
                  Union Territory Regions
                </div>
                {initialRegions.map(reg => (
                  <button
                    key={reg.id}
                    onClick={() => {
                      flyToRegion(reg.id);
                      setShowRegionDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-800 ${
                      activeRegion === reg.id ? 'text-white font-semibold bg-white/10' : 'text-neutral-300'
                    }`}
                  >
                    <span>{reg.name}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{reg.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Persona Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center space-x-1.5 sm:space-x-2 px-1.5 sm:px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs transition-colors"
            >
              <div className="w-6 h-6 rounded bg-white text-black font-bold flex items-center justify-center text-[10px] uppercase flex-shrink-0">
                {user.role.substring(0, 2)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-white leading-tight">{user.fullName.split(',')[0]}</div>
                <div className="text-[10px] text-neutral-400 font-medium leading-none">{user.designation}</div>
              </div>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 top-11 w-72 sm:w-80 bg-[#0d0d0d] border border-neutral-800 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 pb-2 mb-1 border-b border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Switch Engineering Persona</span>
                  <span className="text-white font-mono">11 Roles</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {availableUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center space-x-3 hover:bg-neutral-800/80 transition-colors ${
                        user.id === u.id ? 'bg-white/10 border-l-2 border-white' : ''
                      }`}
                    >
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 font-mono text-[10px] uppercase font-bold">
                        {u.role}
                      </span>
                      <div className="flex-1 truncate">
                        <div className="font-semibold text-neutral-100 truncate">{u.fullName}</div>
                        <div className="text-[10px] text-neutral-400 truncate">{u.designation}</div>
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
            className="flex items-center space-x-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-neutral-900 hover:bg-white hover:text-black text-neutral-300 border border-neutral-800 text-xs transition-all font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Search Bar */}
      {mobileSearchOpen && (
        <div className="px-3 py-2 border-t border-neutral-800 bg-[#0a0a0a] md:hidden">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search assets, feeders, poles..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-9 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono"
            />
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-2 p-1 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 bg-[#0d0d0d] border border-neutral-800 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {searchResults.map(res => (
                <button
                  key={res.id || res.code || res.poleNumber}
                  onClick={() => handleSelectResult(res)}
                  className="w-full text-left px-3 py-2.5 text-xs hover:bg-neutral-800 flex items-center justify-between border-b border-neutral-800/60 last:border-0"
                >
                  <div>
                    <div className="font-semibold text-white">{res.name || res.code || res.poleNumber}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{res.type || res.tariffCategory || 'Asset'}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
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
