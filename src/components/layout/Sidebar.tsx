// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// NAVIGATION SIDEBAR COMPONENT - VIBRANT COLORFUL THEME & STRICT ROLE GATING
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Map, Zap, Gauge, ShieldCheck, AlertTriangle, CheckSquare,
  Smartphone, FileCheck, Cpu, Power, GitFork, Calendar,
  BarChart2, Package, CloudRain, HardHat, Target, Database, Settings, KeyRound, LayoutDashboard, X, Building2
} from 'lucide-react';

export type NavTabId =
  | 'dashboard'
  | 'gis_map'
  | 'assets'
  | 'capital_projects'
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

interface NavItemDef {
  id: NavTabId;
  label: string;
  icon: any;
  color: string;
  roles?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();

  const navItems: NavItemDef[] = [
    { id: 'dashboard', label: 'Role Dashboard & Tasks', icon: LayoutDashboard, color: 'text-blue-600' },
    { id: 'gis_map', label: 'GIS Master Map', icon: Map, color: 'text-emerald-600' },
    { id: 'assets', label: 'Electrical Assets', icon: Zap, color: 'text-amber-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor', 'gis_admin'] },
    { id: 'capital_projects', label: 'Capital Projects (RDSS)', icon: Building2, color: 'text-teal-600', roles: ['super_admin', 'se', 'ee', 'contractor', 'auditor'] },
    { id: 'smart_meters', label: 'Smart Meter Dashboard', icon: Gauge, color: 'text-cyan-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor', 'gis_admin'] },
    { id: 'warranties', label: 'Warranties & Lifecycle', icon: ShieldCheck, color: 'text-indigo-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'auditor'] },
    { id: 'faults', label: 'Faults & Distance Calc', icon: AlertTriangle, color: 'text-rose-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'contractor', 'auditor'] },
    { id: 'work_orders', label: 'Tasks & Work Orders', icon: CheckSquare, color: 'text-violet-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je'] },
    { id: 'contractor_pwa', label: 'Contractor GPS Survey (PWA)', icon: Smartphone, color: 'text-fuchsia-600', roles: ['contractor', 'super_admin', 'je', 'ae'] },
    { id: 'survey_approvals', label: 'Survey Approval Queue', icon: FileCheck, color: 'text-emerald-600', roles: ['je', 'ae', 'aee', 'ee', 'se', 'super_admin'] },
    { id: 'scada', label: 'SCADA Telemetry & SLD', icon: Cpu, color: 'text-rose-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'gis_admin'] },
    { id: 'outages', label: 'Outages & IEEE Reliability', icon: Power, color: 'text-orange-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'auditor'] },
    { id: 'topology', label: 'Network Topology Tracing', icon: GitFork, color: 'text-sky-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'gis_admin'] },
    { id: 'preventive', label: 'Preventive Maintenance', icon: Calendar, color: 'text-lime-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je'] },
    { id: 'dt_loading', label: 'DT Loading & Imbalance', icon: BarChart2, color: 'text-amber-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'gis_admin'] },
    { id: 'stores', label: 'Stores & Material Mgmt', icon: Package, color: 'text-yellow-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je'] },
    { id: 'disaster', label: 'Disaster Management', icon: CloudRain, color: 'text-blue-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae'] },
    { id: 'safety_ptw', label: 'Safety Permit to Work (PTW)', icon: HardHat, color: 'text-red-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor'] },
    { id: 'asset_risk', label: 'ISO 55000 Asset Risk', icon: Target, color: 'text-purple-600', roles: ['super_admin', 'se', 'ee', 'aee', 'auditor'] },
    { id: 'backup_restore', label: 'Backup & Data Exchange', icon: Database, color: 'text-indigo-500', roles: ['super_admin', 'gis_admin', 'auditor'] },
    { id: 'admin_panel', label: 'Admin Control Panel', icon: Settings, color: 'text-slate-600', roles: ['super_admin', 'se', 'gis_admin'] },
    { id: 'auth_login', label: 'Staff Login & Personas', icon: KeyRound, color: 'text-blue-700' },
  ];

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
