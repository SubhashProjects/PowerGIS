// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MOBILE BOTTOM NAVIGATION BAR - THUMB-ZONE QUICK ACTIONS
// ============================================================================

import React from 'react';
import { NavTabId } from './Sidebar';
import { LayoutDashboard, Map, Zap, FileCheck, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onOpenMobileMenu: () => void;
  unreadCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMobileMenu,
  unreadCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard' as NavTabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gis_map' as NavTabId, label: 'GIS Map', icon: Map },
    { id: 'assets' as NavTabId, label: 'Assets', icon: Zap },
    { id: 'survey_approvals' as NavTabId, label: 'Approvals', icon: FileCheck },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-neutral-800 select-none pb-safe">
      <div className="grid grid-cols-5 h-14">
        {tabs.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 relative transition-colors ${
                isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {/* Active Indicator Top Line */}
              {isActive && (
                <span className="absolute top-0 left-4 right-4 h-0.5 bg-white rounded-full" />
              )}
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
              <span className={`text-[10px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Menu Toggle Button (All 20 Modules) */}
        <button
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center space-y-1 text-neutral-500 hover:text-white transition-colors relative"
          title="All Modules & Tools"
        >
          {unreadCount > 0 && (
            <span className="absolute top-2 right-5 w-2 h-2 rounded-full bg-white" />
          )}
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
};
