// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// NAVIGATION SIDEBAR COMPONENT - GROUPED MODULE CATEGORIES & COMPACT STUNNING UI
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  NAVIGATION_ITEMS,
  NAVIGATION_CATEGORIES,
  NavTabId,
  NavCategory,
} from '../../config/navigationConfig';
import { X, ChevronRight } from 'lucide-react';

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

  const handleItemClick = (id: NavTabId) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Render grouped items by category
  const renderCategorizedNav = (isCompactView: boolean) => (
    <div className="flex-1 py-2 overflow-y-auto space-y-3 px-2">
      {NAVIGATION_CATEGORIES.map(category => {
        const categoryItems = NAVIGATION_ITEMS.filter(
          item =>
            item.category === category.name &&
            (!item.roles || item.roles.includes(user.role))
        );

        // If no items permitted in this category for user role, hide the whole category
        if (categoryItems.length === 0) return null;

        return (
          <div key={category.name} className="space-y-0.5">
            {/* Category Header */}
            {!isCompactView ? (
              <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[10px] uppercase font-bold tracking-wider font-mono text-slate-600">
                <span>{category.name}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${category.accentColor}`}>
                  {categoryItems.length}
                </span>
              </div>
            ) : (
              <div className="my-1.5 border-t border-slate-100" />
            )}

            {/* Category Items */}
            <div className="space-y-0.5">
              {categoryItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center ${
                      isCompactView ? 'justify-center p-2' : 'space-x-2.5 px-2.5 py-1.5'
                    } rounded-xl text-xs transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20 ring-1 ring-blue-400/30'
                        : 'text-slate-700 hover:text-blue-900 hover:bg-blue-50/70 font-medium'
                    }`}
                    title={item.label}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : item.color
                      }`}
                    />
                    {!isCompactView && (
                      <span className="truncate text-left text-[12px]">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
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
        {renderCategorizedNav(collapsed)}

        {/* Footer Info */}
        {!collapsed && (
          <div className="p-2.5 border-t border-slate-200 bg-gradient-to-br from-blue-50/50 to-white">
            <div className="text-[10px] text-slate-500 flex justify-between items-center font-mono">
              <span className="font-semibold text-slate-700">PowerGIS Modular</span>
              <span className="text-blue-700 font-extrabold bg-blue-100 px-1.5 py-0.2 rounded border border-blue-200">
                {user.role.toUpperCase()}
              </span>
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
            <div className="h-13 border-b border-slate-200 px-4 flex items-center justify-between bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
                  ⚡
                </div>
                <div>
                  <div className="font-black text-xs text-slate-950 tracking-wider">POWERGIS</div>
                  <div className="text-[9px] text-blue-600 font-semibold font-mono">Grouped Modules</div>
                </div>
              </div>

              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav list */}
            {renderCategorizedNav(false)}

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-200 bg-gradient-to-br from-blue-50/60 to-white">
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
