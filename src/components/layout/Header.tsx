// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ENTERPRISE HEADER COMPONENT WITH TELEMETRY, SEARCH & ROLE EMULATOR
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGIS } from '../../context/GISContext';
import { assetService } from '../../services/assetService';
import { initialRegions } from '../../services/mockData';
import {
  Search, Shield, Bell, Activity, MapPin, ChevronDown, User, Globe, LogOut
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, switchUser, availableUsers, logout } = useAuth();
  const { activeRegion, flyToRegion, setSelectedAsset } = useGIS();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);

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
  };

  return (
    <header className="h-14 bg-[#0a101d] border-b border-slate-800 px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Emblem */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
          ⚡
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-slate-100 tracking-wide">POWERGIS</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
              GIS PORTAL
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">PowerGIS • Distribution Asset Management & O&M</p>
        </div>
      </div>

      {/* Global Asset Search */}
      <div className="relative w-96 hidden md:block">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search substations, feeders, DTs, poles, meters..."
            className="w-full bg-[#131c2e] border border-slate-700/60 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
          />
        </div>

        {/* Dropdown Results */}
        {searchResults.length > 0 && (
          <div className="absolute top-10 left-0 right-0 bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
            {searchResults.map(res => (
              <button
                key={res.id}
                onClick={() => handleSelectResult(res)}
                className="w-full text-left px-3 py-2 text-xs border-b border-slate-800/80 hover:bg-slate-800/60 flex items-center justify-between text-slate-200 transition-colors"
              >
                <div>
                  <div className="font-medium">{res.code}</div>
                  <div className="text-[10px] text-slate-400">{res.name}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono">
                  {res.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: Telemetry, Region Selector, Role Switcher */}
      <div className="flex items-center space-x-3">
        {/* Live Grid Frequency Telemetry Pill */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>GRID: 50.02 Hz</span>
        </div>

        {/* Region Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRegionDropdown(!showRegionDropdown)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#131c2e] hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium">
              {initialRegions.find(r => r.id === activeRegion)?.name || 'Puducherry'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showRegionDropdown && (
            <div className="absolute right-0 top-10 w-44 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500">
                Union Territory Regions
              </div>
              {initialRegions.map(reg => (
                <button
                  key={reg.id}
                  onClick={() => {
                    flyToRegion(reg.id);
                    setShowRegionDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${
                    activeRegion === reg.id ? 'text-sky-400 font-semibold bg-sky-500/10' : 'text-slate-300'
                  }`}
                >
                  <span>{reg.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{reg.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Persona Role Switcher (Crucial for Multi-Tier Hierarchy Testing) */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/40 border border-sky-500/30 text-xs transition-colors"
          >
            <div className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px] uppercase">
              {user.role.substring(0, 2)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-semibold text-sky-200 leading-tight">{user.fullName.split(',')[0]}</div>
              <div className="text-[10px] text-sky-400 font-medium leading-none">{user.designation}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-sky-400 ml-1" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 top-11 w-80 bg-[#0c1424] border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
              <div className="px-3 pb-2 mb-1 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Switch Engineering Persona</span>
                <span className="text-sky-400">11 Official Roles</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {availableUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center space-x-3 hover:bg-slate-800/80 transition-colors ${
                      user.id === u.id ? 'bg-sky-500/15 border-l-2 border-sky-400' : ''
                    }`}
                  >
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px] uppercase font-bold">
                      {u.role}
                    </span>
                    <div className="flex-1 truncate">
                      <div className="font-semibold text-slate-200 truncate">{u.fullName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{u.designation}</div>
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
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-semibold">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
