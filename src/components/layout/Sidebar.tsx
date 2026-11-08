// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// NAVIGATION SIDEBAR COMPONENT - RESPONSIVE MOBILE DRAWER + DESKTOP SIDEBAR
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Map, Zap, Gauge, ShieldCheck, AlertTriangle, CheckSquare,
  Smartphone, FileCheck, Cpu, Power, GitFork, Calendar,
  BarChart2, Package, CloudRain, HardHat, Target, Database, Settings, KeyRound, LayoutDashboard, X
} from 'lucide-react';

export type NavTabId =
  | 'dashboard'
  | 'gis_map'
  | 'assets'
  | 'smart_meters'
  | 'warranties'
  | 'faults'
  | 'work_orders'
  | 'contractor_pwa'
  | 'survey_approvals'
  | 'scada'
  | 'outages'
  | 'topology'
  | 'preventive'
  | 'dt_loading'
  | 'stores'
  | 'disaster'
  | 'safety_ptw'
  | 'asset_risk'
  | 'backup_restore'
  | 'admin_panel'
  | 'auth_login';

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

  const navItems: Array<{ id: NavTabId; label: string; icon: any; roles?: string[] }> = [
    { id: 'dashboard', label: 'Role Dashboard & Tasks', icon: LayoutDashboard },
    { id: 'gis_map', label: 'GIS Master Map', icon: Map },
    { id: 'assets', label: 'Electrical Assets', icon: Zap },
    { id: 'smart_meters', label: 'Smart Meter Dashboard', icon: Gauge },
    { id: 'warranties', label: 'Warranties & Lifecycle', icon: ShieldCheck },
    { id: 'faults', label: 'Faults & Distance Calc', icon: AlertTriangle },
    { id: 'work_orders', label: 'Tasks & Work Orders', icon: CheckSquare },
    { id: 'contractor_pwa', label: 'Contractor GPS Survey (PWA)', icon: Smartphone },
    { id: 'survey_approvals', label: 'Survey Approval Queue', icon: FileCheck },
    { id: 'scada', label: 'SCADA Telemetry & SLD', icon: Cpu },
    { id: 'outages', label: 'Outages & IEEE Reliability', icon: Power },
    { id: 'topology', label: 'Network Topology Tracing', icon: GitFork },
    { id: 'preventive', label: 'Preventive Maintenance', icon: Calendar },
    { id: 'dt_loading', label: 'DT Loading & Imbalance', icon: BarChart2 },
    { id: 'stores', label: 'Stores & Material Mgmt', icon: Package },
    { id: 'disaster', label: 'Disaster Management', icon: CloudRain },
    { id: 'safety_ptw', label: 'Safety Permit to Work (PTW)', icon: HardHat },
    { id: 'asset_risk', label: 'ISO 55000 Asset Risk', icon: Target },
    { id: 'backup_restore', label: 'Backup & Data Exchange', icon: Database },
    { id: 'admin_panel', label: 'Admin Control Panel', icon: Settings, roles: ['super_admin', 'se', 'gis_admin'] },
    { id: 'auth_login', label: 'Staff Login & Personas', icon: KeyRound },
  ];

  const handleItemClick = (id: NavTabId) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navList = (
    <div className="flex-1 py-3 overflow-y-auto space-y-1 px-2">
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
                ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
            title={item.label}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
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
        className={`hidden md:flex bg-black border-r border-neutral-800 flex-col transition-all duration-200 select-none ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex-1 py-3 overflow-y-auto space-y-1 px-2">
          {navItems.map(item => {
            if (item.roles && !item.roles.includes(user.role)) return null;

            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Footer Info */}
        {!collapsed && (
          <div className="p-3 border-t border-neutral-800 bg-[#080808]">
            <div className="text-[10px] text-neutral-400 flex justify-between items-center font-mono">
              <span>PowerGIS Enterprise</span>
              <span className="text-white font-bold">B&W Edition</span>
            </div>
          </div>
        )}
      </aside>

      {/* 2. Mobile Drawer & Backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[80vw] bg-black border-r border-neutral-800 flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-14 border-b border-neutral-800 px-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs shadow-md">
                  ⚡
                </div>
                <div>
                  <div className="font-extrabold text-xs text-white tracking-wider">POWERGIS</div>
                  <div className="text-[9px] text-neutral-400">Navigation Menu</div>
                </div>
              </div>

              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav list */}
            {navList}

            {/* Drawer Footer */}
            <div className="p-3 border-t border-neutral-800 bg-[#080808]">
              <div className="text-[10px] text-neutral-400 flex justify-between items-center font-mono">
                <span>PowerGIS Mobile</span>
                <span className="text-white font-bold">{user.role.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
