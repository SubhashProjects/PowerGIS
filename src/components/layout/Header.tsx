// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ENTERPRISE HEADER COMPONENT - PURE WHITE THEME & MOBILE ADAPTIVE
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGIS } from '../../context/GISContext';
import { assetService } from '../../services/assetService';
import { notificationService } from '../../services/notificationService';
import { APP_CONFIG } from '../../config/appConfig';
import { NavTabId } from '../../config/navigationConfig';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { LABELS } from '../../config/labelsConfig';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
 Search, Bell, Globe, ChevronDown, LogOut, Menu, X, ShieldCheck, Settings, Zap
} from 'lucide-react';

interface HeaderProps {
 onToggleMobileMenu?: () => void;
 onNavigateTab?: (tab: NavTabId) => void;
 onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onNavigateTab, onOpenCommandPalette }) => {
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
 onOpenCommandPalette?.();
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

 return (
 <header className="pg-header relative bg-white border-b z-30 select-none">
 <div className="h-14 px-3 sm:px-4 flex items-center justify-between gap-3">
 {/* Left: Mobile Menu Button & Brand */}
 <div className="pg-header-brand flex items-center gap-2 sm:gap-2.5 flex-shrink-0 min-w-0">
 {/* Mobile Hamburger Drawer Trigger */}
 <button
 onClick={onToggleMobileMenu}
 className="h-9 w-9 rounded-md text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 md:hidden flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
 aria-label={LABELS.header.menuToggleAria}
 >
 <Menu className="w-5 h-5" />
 </button>

 {/* Logo Emblem (Minimalist Solid High-Craft) */}
 <div className="w-9 h-9 rounded-md bg-[#090909] text-white flex items-center justify-center font-bold text-xs border border-neutral-800 flex-shrink-0">
 <Zap className="w-4 h-4 text-neutral-400 fill-amber-400" />
 </div>

 {/* Title */}
 <div className="flex-shrink-0">
 <div className="flex items-center space-x-1.5 sm:space-x-2">
 <span className="font-bold text-xs sm:text-sm text-[#090909] tracking-tight whitespace-nowrap">{LABELS.header.brandName}</span>
 <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-800 font-semibold border border-neutral-200 whitespace-nowrap">
 {LABELS.header.brandBadge}
 </span>
 </div>
 <p className="text-[10px] hidden sm:block whitespace-nowrap">
 {LABELS.header.brandSubtitle}
 </p>
 </div>
 </div>

 {/* Center: Global Asset Search (Desktop) - Fit to text with Ctrl + K */}
 <div className="hidden md:flex items-center justify-center flex-1 mx-2 lg:mx-4">
 <div className="relative h-9 w-36 sm:w-44 focus-within:w-56 transition-all duration-200 flex-shrink-0">
 <div className="relative h-9 flex items-center">
 <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none flex-shrink-0" />
 <input
 ref={searchInputRef}
 onFocus={() => onOpenCommandPalette?.()}
 type="text"
 value={searchQuery}
 onChange={handleSearch}
 placeholder={LABELS.header.searchPlaceholder}
 className="pg-search-input h-9 w-full bg-white border rounded-md pl-8 pr-12 text-xs placeholder-neutral-400 focus:outline-none transition-colors truncate box-border"
 />
 <div className="absolute right-2 flex items-center space-x-0.5 pointer-events-none flex-shrink-0">
 <kbd className="px-1 py-0.5 text-[9px] font-semibold bg-neutral-100 text-neutral-600 rounded border border-neutral-200 leading-none">
 Ctrl
 </kbd>
 <kbd className="px-1 py-0.5 text-[9px] font-semibold bg-neutral-100 text-neutral-600 rounded border border-neutral-200 leading-none">
 K
 </kbd>
 </div>
 </div>

 {/* Dropdown Results */}
 {searchResults.length > 0 && (
 <div className="absolute top-10 left-0 right-0 sm:w-72 bg-white border border-[#E4E4E4] rounded-md shadow-lg overflow-hidden z-50">
 {searchResults.map(res => (
 <button
 key={res.id || res.code || res.poleNumber}
 onClick={() => handleSelectResult(res)}
 className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 flex items-center justify-between border-b border-neutral-100 last:border-0 cursor-pointer"
 >
 <div>
 <div className="font-semibold text-neutral-950">{res.name || res.code || res.poleNumber}</div>
 <div className="text-[10px] ">{res.type || res.tariffCategory || 'Asset'}</div>
 </div>
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 ">
 {res.voltageClass || res.capacityKVA ? `${res.capacityKVA}kVA` : 'Asset'}
 </span>
 </button>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Right Controls & Toolbar (All boxes equal height h-9 with equal gap-2 spacing) */}
 <div className="flex items-center gap-2 flex-shrink-0">
 {/* Mobile Search Button Toggle */}
 <button
 onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
 className="h-9 w-9 rounded-md bg-white hover:bg-neutral-100 border border-[#E4E4E4] text-neutral-700 md:hidden flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer box-border"
 title={LABELS.header.searchMobileTooltip}
 >
 <Search className="w-4 h-4" />
 </button>

 <ConnectionStatus />

 {/* Notifications Bell Dropdown */}
 <div className="relative h-9 flex-shrink-0">
 <button
 onClick={() => setShowNotifications(!showNotifications)}
 className="relative h-9 w-9 rounded-md bg-white hover:bg-neutral-100 border border-[#E4E4E4] text-neutral-700 hover:text-neutral-950 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer box-border"
 title={LABELS.header.notificationsTooltip}
 >
 <Bell className="w-4 h-4" />
 {unreadCount > 0 && (
 <span className="absolute -top-1 -right-1 w-4 h-4 rounded bg-[#090909] text-white font-bold text-[9px] flex items-center justify-center ">
 {unreadCount}
 </span>
 )}
 </button>

 {showNotifications && (
 <div className="absolute right-0 top-10 w-72 sm:w-96 bg-white border border-[#E4E4E4] rounded-md shadow-xl p-3 z-50">
 <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 text-[10px] font-bold ">
 <span className="text-neutral-950 font-bold">{LABELS.header.notificationsTitle} ({notifications.length})</span>
 <span className="text-neutral-700 px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">
 {user.role.toUpperCase()}
 </span>
 </div>

 <div className="space-y-1.5 max-h-80 overflow-y-auto">
 {notifications.map(n => (
 <div
 key={n.id}
 onClick={() => {
 notificationService.markAsRead(n.id);
 }}
 className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100 transition-all text-left cursor-pointer"
 >
 <div className="flex items-center justify-between text-[10px] mb-1">
 <span className="font-semibold text-neutral-800 bg-white border border-neutral-200 px-1.5 py-0.5 rounded">
 {n.priority}
 </span>
 <span className="">{n.timestamp}</span>
 </div>
 <div className="font-semibold text-xs text-neutral-950 leading-tight">{n.title}</div>
 <div className="text-[11px] text-neutral-600 mt-0.5 leading-snug">{n.message}</div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Master Grid & SCADA Simulator Mode Toggle */}
 {!isSupabaseConfigured && <button
 onClick={handleToggleSimulator}
 title={
 isSimulatorActive
 ? 'Simulator ACTIVE: Streaming simulated test grid & SCADA telemetry. Click to turn OFF (Clean Real Mode).'
 : 'Simulator OFF: Clean real operational mode. Click to turn ON simulated test grid & telemetry.'
 }
 className={`pg-header-simulator h-9 inline-flex items-center space-x-1.5 px-3 rounded-md border text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors cursor-pointer select-none box-border ${
 isSimulatorActive
 ? 'bg-neutral-50 text-neutral-900 border-neutral-300 hover:bg-neutral-100'
 : 'bg-white text-neutral-700 border-[#E4E4E4] hover:bg-neutral-50 hover:text-neutral-950'
 }`}
 >
 <span
 className={`w-2 h-2 rounded-full flex-shrink-0 ${
 isSimulatorActive ? 'bg-neutral-500' : 'bg-neutral-300'
 }`}
 />
 <span className="hidden sm:inline whitespace-nowrap leading-none tracking-tight">SIMULATOR:</span>
 <span className={`whitespace-nowrap font-bold leading-none ${isSimulatorActive ? 'text-neutral-900' : ''}`}>
 {isSimulatorActive ? 'ON' : 'OFF'}
 </span>
 </button>}

 {/* Region Switcher */}
 <div className="relative h-9 flex-shrink-0">
 <button
 onClick={() => setShowRegionDropdown(!showRegionDropdown)}
 className="pg-header-region h-9 flex items-center space-x-1.5 px-3 rounded-md bg-white hover:bg-neutral-50 border border-[#E4E4E4] text-xs text-neutral-800 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer box-border"
 >
 <Globe className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
 <span className="font-medium truncate max-w-[70px] sm:max-w-none whitespace-nowrap leading-none">
 {APP_CONFIG.regions[user.regionId || activeRegion]?.name || APP_CONFIG.regions[activeRegion]?.name || 'Puducherry'}
 </span>
 <ChevronDown className="w-3 h-3 flex-shrink-0" />
 </button>

 {showRegionDropdown && (
 <div className="absolute right-0 top-10 w-48 bg-white border border-[#E4E4E4] rounded-md shadow-xl py-1 z-50">
 <div className="px-3 py-1.5 text-[10px] font-bold border-b border-neutral-100 ">
 {LABELS.header.regionsTitle}
 </div>
 {Object.values(APP_CONFIG.regions).filter(reg => !user.regionId || reg.id === user.regionId || user.role === 'super_admin' || user.role === 'gis_admin').map(reg => (
 <button
 key={reg.id}
 onClick={() => {
 flyToRegion(reg.id);
 setShowRegionDropdown(false);
 }}
 className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 cursor-pointer ${
 activeRegion === reg.id ? 'text-neutral-950 font-bold bg-neutral-100' : 'text-neutral-700'
 }`}
 >
 <span>{reg.name}</span>
 <span className="text-[10px] text-neutral-400 ">{reg.code}</span>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* User Profile Identity Badge */}
 <div className="pg-header-profile h-9 max-h-9 flex items-center space-x-2 px-3 rounded-md bg-white border border-[#E4E4E4] text-xs text-[#090909] whitespace-nowrap flex-shrink-0 box-border">
 <div className="w-6 h-6 rounded bg-[#090909] text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
 {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : user.role.substring(0, 2).toUpperCase()}
 </div>
 <div className="text-left hidden sm:flex flex-col justify-center max-w-[110px] md:max-w-[130px] lg:max-w-[170px] truncate leading-none">
 <div className="flex items-center space-x-1.5">
 <span className="font-bold text-neutral-950 text-xs leading-none truncate whitespace-nowrap">
 {user.fullName.split(',')[0]}
 </span>
 <span className="hidden md:inline-block px-1 py-0.2 rounded bg-neutral-100 text-neutral-700 text-[8px] font-semibold border border-neutral-200 whitespace-nowrap leading-none">
 {user.role}
 </span>
 </div>
 <div className="text-[9px] leading-none truncate whitespace-nowrap mt-1">
 {user.designation}
 </div>
 </div>
 </div>

 {/* Super Admin Direct Access Link */}
 {user.role === 'super_admin' && onNavigateTab && (
 <button
 onClick={() => onNavigateTab('admin_panel')}
 title={LABELS.header.adminConsoleTooltip}
 className="h-9 flex items-center space-x-1.5 px-3 rounded-md bg-white hover:bg-neutral-50 text-neutral-800 border border-[#E4E4E4] text-xs transition-colors font-medium whitespace-nowrap flex-shrink-0 cursor-pointer box-border"
 >
 <ShieldCheck className="w-3.5 h-3.5 text-neutral-700 flex-shrink-0" />
 <span className="hidden lg:inline text-xs whitespace-nowrap leading-none">{LABELS.header.adminConsole}</span>
 </button>
 )}

 {/* Sign Out Button */}
 <button
 onClick={logout}
 title={LABELS.header.signOutTooltip}
 className="h-9 flex items-center space-x-1.5 px-3 rounded-md bg-white hover:bg-neutral-50 hover:text-neutral-700 hover:border-neutral-200 text-neutral-700 border border-[#E4E4E4] text-xs transition-colors font-medium whitespace-nowrap flex-shrink-0 cursor-pointer box-border"
 >
 <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
 <span className="hidden md:inline text-xs whitespace-nowrap leading-none">{LABELS.header.signOut}</span>
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
 className="w-full bg-neutral-100 border border-neutral-200 rounded-md pl-9 pr-9 py-2 text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none focus:border-neutral-900 "
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
 <div className="mt-2 bg-white border border-neutral-200 rounded-md shadow-xl overflow-hidden max-h-60 overflow-y-auto">
 {searchResults.map(res => (
 <button
 key={res.id || res.code || res.poleNumber}
 onClick={() => handleSelectResult(res)}
 className="w-full text-left px-3 py-2.5 text-xs hover:bg-neutral-50 flex items-center justify-between border-b border-neutral-100 last:border-0"
 >
 <div>
 <div className="font-semibold text-neutral-900">{res.name || res.code || res.poleNumber}</div>
 <div className="text-[10px] text-neutral-500 ">{res.type || res.tariffCategory || 'Asset'}</div>
 </div>
 <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 ">
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
