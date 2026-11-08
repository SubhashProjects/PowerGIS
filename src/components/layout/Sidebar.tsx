// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// NAVIGATION SIDEBAR COMPONENT - VIBRANT COLORFUL THEME & STRICT ROLE GATING
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NAVIGATION_ITEMS, NavTabId } from '../../config/navigationConfig';
import { X } from 'lucide-react';

export type { NavTabId };

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const navItems = NAVIGATION_ITEMS;

  const handleItemClick = (id: NavTabId) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navList = (
    <div className="flex-1 py-3 overflow-y-auto space-y-1 px-2.5">
      {navItems.map(item => {
        if (item.roles && !item.roles.includes(user.role)) return null;

        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 ring-1 ring-blue-400/30'
                : 'text-slate-700 hover:text-blue-900 hover:bg-blue-50/80'
            }`}
            title={item.label}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-white' : item.color}`} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside
        className={`hidden md:flex bg-white border-r border-slate-200 flex-col transition-all duration-200 select-none shadow-sm ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex-1 py-3 overflow-y-auto space-y-1 px-2.5">
          {navItems.map(item => {
            if (item.roles && !item.roles.includes(user.role)) return null;

            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 ring-1 ring-blue-400/30'
                    : 'text-slate-700 hover:text-blue-900 hover:bg-blue-50/80'
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-white' : item.color}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Footer Info */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-200 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-white">
            <div className="text-[10px] text-slate-500 flex justify-between items-center font-mono">
              <span className="font-semibold text-slate-700">PowerGIS Enterprise</span>
              <span className="text-blue-700 font-extrabold bg-blue-100/80 px-1.5 py-0.2 rounded border border-blue-200">Color Edition</span>
            </div>
          </div>
        )}
      </aside>

      {/* 2. Mobile Drawer & Backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-14 border-b border-slate-200 px-4 flex items-center justify-between bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
                  ⚡
                </div>
                <div>
                  <div className="font-black text-xs text-slate-950 tracking-wider">POWERGIS</div>
                  <div className="text-[9px] text-blue-600 font-semibold font-mono">Operations Menu</div>
                </div>
              </div>

              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav list */}
            {navList}

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-200 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-white">
              <div className="text-[10px] text-slate-500 flex justify-between items-center font-mono">
                <span className="font-medium text-slate-700">PowerGIS Mobile</span>
                <span className="text-blue-700 font-extrabold bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
