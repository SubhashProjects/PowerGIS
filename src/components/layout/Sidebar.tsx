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
              <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5 text-[10px] uppercase font-bold tracking-wider font-mono text-zinc-500">
                <span>{category.name}</span>
                <span className="text-[9px] px-1 py-0.1 rounded border border-zinc-200 text-zinc-600 font-mono">
                  {categoryItems.length}
                </span>
              </div>
            ) : (
              <div className="my-1.5 border-t border-zinc-100" />
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
                    } rounded-md text-xs transition-colors cursor-pointer group ${
                      isActive
                        ? 'bg-[#09090B] text-white font-medium'
                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 font-normal'
                    }`}
                    title={item.label}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-900'
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
        className={`hidden md:flex bg-white border-r border-[#E4E4E7] flex-col transition-all duration-200 select-none ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {renderCategorizedNav(collapsed)}

        {/* Footer Info */}
        {!collapsed && (
          <div className="p-2.5 border-t border-[#E4E4E7] bg-[#FAFAFA]">
            <div className="text-[10px] text-zinc-500 flex justify-between items-center font-mono">
              <span className="font-medium text-zinc-700">PowerGIS Modular</span>
              <span className="text-zinc-800 font-bold bg-white px-1.5 py-0.2 rounded border border-zinc-200">
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
            className="fixed inset-0 bg-black/30 transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[80vw] bg-white border-r border-[#E4E4E7] flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-13 border-b border-[#E4E4E7] px-4 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-md bg-[#09090B] text-white flex items-center justify-center font-bold text-xs border border-zinc-800">
                  ⚡
                </div>
                <div>
                  <div className="font-bold text-xs text-zinc-950 tracking-tight">POWERGIS</div>
                  <div className="text-[9px] text-zinc-500 font-mono">Enterprise Modules</div>
                </div>
              </div>

              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav list */}
            {renderCategorizedNav(false)}

            {/* Drawer Footer */}
            <div className="p-3 border-t border-[#E4E4E7] bg-[#FAFAFA]">
              <div className="text-[10px] text-zinc-500 flex justify-between items-center font-mono">
                <span className="font-medium text-zinc-700">PowerGIS Mobile</span>
                <span className="text-zinc-800 font-bold bg-white px-2 py-0.5 rounded border border-zinc-200">
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
