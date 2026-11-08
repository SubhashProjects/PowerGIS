// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// NAVIGATION SIDEBAR COMPONENT WITH FEATURE MODULES
// ============================================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Map, Zap, Gauge, ShieldCheck, AlertTriangle, CheckSquare,
  Smartphone, FileCheck, Cpu, Power, GitFork, Calendar,
  BarChart2, Package, CloudRain, HardHat, Target, Database, Settings, KeyRound
} from 'lucide-react';

export type NavTabId =
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
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, collapsed }) => {
  const { user } = useAuth();

  const navItems: Array<{ id: NavTabId; label: string; icon: any; roles?: string[] }> = [
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

  return (
    <aside
      className={`bg-[#0d1527] border-r border-slate-800 flex flex-col transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex-1 py-3 overflow-y-auto space-y-1 px-2">
        {navItems.map(item => {
          // Check role restrictions
          if (item.roles && !item.roles.includes(user.role)) return null;

          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-[#090f1b]">
          <div className="text-[10px] text-slate-500 flex justify-between items-center font-mono">
            <span>PowerGIS v2.0 Enterprise</span>
            <span className="text-emerald-400">PostGIS 3.4</span>
          </div>
        </div>
      )}
    </aside>
  );
};
