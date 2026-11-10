// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MOBILE BOTTOM NAVIGATION BAR - PURE WHITE THEME & ROLE-AWARE ACTIONS
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavTabId } from './Sidebar';
import { LayoutDashboard, Map, Zap, FileCheck, Smartphone, Menu } from 'lucide-react';

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
  const { user } = useAuth();

  // Role-appropriate 4th primary tab
  const fourthTab: { id: NavTabId; label: string; icon: any } =
    user.role === 'contractor'
      ? { id: 'contractor_pwa', label: 'PWA Survey', icon: Smartphone }
      : { id: 'survey_approvals', label: 'Approvals', icon: FileCheck };

  const tabs = [
    { id: 'dashboard' as NavTabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gis_map' as NavTabId, label: 'GIS Map', icon: Map },
    { id: 'assets' as NavTabId, label: 'Assets', icon: Zap },
    fourthTab,
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E4E4E7] select-none pb-safe shadow-md">
      <div className="grid grid-cols-5 h-14">
        {tabs.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 relative transition-colors ${
                isActive ? 'text-neutral-950' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {/* Active Indicator Top Line */}
              {isActive && (
                <span className="absolute top-0 left-4 right-4 h-0.5 bg-neutral-950 rounded-full" />
              )}
              <Icon className={`w-5 h-5 ${isActive ? 'text-neutral-950 stroke-[2.5]' : 'text-neutral-500'}`} />
              <span className={`text-[10px] leading-none ${isActive ? 'font-bold text-neutral-950' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Menu Toggle Button (All Modules) */}
        <button
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center space-y-1 text-neutral-500 hover:text-neutral-900 transition-colors relative"
          title="All Modules & Tools"
        >
          {unreadCount > 0 && (
            <span className="absolute top-2 right-5 w-2 h-2 rounded-full bg-neutral-900" />
          )}
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
};
