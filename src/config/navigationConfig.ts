// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// NAVIGATION CONFIGURATION & ROUTING (SSOT)
// Change tab name, role gate, or icon color here to reflect system-wide.
// ============================================================================

import {
  Map, Zap, Gauge, ShieldCheck, AlertTriangle, CheckSquare,
  Smartphone, FileCheck, Cpu, Power, GitFork, Calendar,
  BarChart2, Package, CloudRain, HardHat, Target, Database, Settings, KeyRound, LayoutDashboard, Building2
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
  | 'admin_panel';

export interface NavItemConfig {
  id: NavTabId;
  label: string;
  icon: any;
  color: string;
  roles?: string[];
  description: string;
}

export const NAVIGATION_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Role Dashboard & Tasks', icon: LayoutDashboard, color: 'text-blue-600', description: 'Personalized command center, statutory permissions, and pending assignments' },
  { id: 'gis_map', label: 'GIS Master Map', icon: Map, color: 'text-emerald-600', description: 'Interactive multi-basemap territorial network visualizer with 360° rotation' },
  { id: 'assets', label: 'Electrical Assets', icon: Zap, color: 'text-amber-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor', 'gis_admin'], description: 'Comprehensive registry of substations, DTRs, poles, conductors, and meters' },
  { id: 'capital_projects', label: 'Capital Projects (RDSS)', icon: Building2, color: 'text-teal-600', roles: ['super_admin', 'se', 'ee', 'contractor', 'auditor'], description: 'Revamped Distribution Sector Scheme physical & financial progress tracker' },
  { id: 'smart_meters', label: 'Smart Meter Dashboard', icon: Gauge, color: 'text-cyan-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor', 'gis_admin'], description: 'AMI telecommunications, power quality analytics, and tamper alerts' },
  { id: 'warranties', label: 'Warranties & Lifecycle', icon: ShieldCheck, color: 'text-indigo-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'auditor'], description: 'Asset warranty tracking, vendor claims, and replacement alerts' },
  { id: 'faults', label: 'Faults & Distance Calc', icon: AlertTriangle, color: 'text-rose-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'contractor', 'auditor'], description: '8-stage ticket management lifecycle with geodesic proximity calculations' },
  { id: 'work_orders', label: 'Tasks & Work Orders', icon: CheckSquare, color: 'text-violet-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je'], description: '5-column maintenance task Kanban board and crew dispatch' },
  { id: 'contractor_pwa', label: 'Contractor GPS Survey (PWA)', icon: Smartphone, color: 'text-fuchsia-600', roles: ['contractor', 'super_admin', 'je', 'ae'], description: 'Mobile field survey tool for GPS asset capture and offline syncing' },
  { id: 'survey_approvals', label: 'Survey Approval Queue', icon: FileCheck, color: 'text-emerald-600', roles: ['je', 'ae', 'aee', 'ee', 'se', 'super_admin'], description: 'Multi-tier verification workflow (JE physical check -> AE final approval)' },
  { id: 'scada', label: 'SCADA Telemetry & SLD', icon: Cpu, color: 'text-rose-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'gis_admin'], description: 'IEC-104 live telemetry, interactive single-line diagram, and SBO breaker control' },
  { id: 'outages', label: 'Outages & IEEE Reliability', icon: Power, color: 'text-orange-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'auditor'], description: 'SAIFI, SAIDI, CAIDI, and ENS computations per IEEE 1366 standard' },
  { id: 'topology', label: 'Network Topology Tracing', icon: GitFork, color: 'text-sky-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'gis_admin'], description: 'Upstream/downstream circuit tracing and isolation point analysis' },
  { id: 'preventive', label: 'Preventive Maintenance', icon: Calendar, color: 'text-lime-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je'], description: 'Scheduled maintenance calendar, tree-trimming, and oil testing logs' },
  { id: 'dt_loading', label: 'DT Loading & Imbalance', icon: BarChart2, color: 'text-amber-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'gis_admin'], description: 'Distribution transformer thermal loading, phase imbalance, and loss analysis' },
  { id: 'stores', label: 'Stores & Material Mgmt', icon: Package, color: 'text-yellow-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je'], description: 'Central warehouse inventory, scrap tracking, and material requisitions' },
  { id: 'disaster', label: 'Disaster Management', icon: CloudRain, color: 'text-blue-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae'], description: 'Cyclone vulnerability maps, flood-prone DTRs, and emergency restoration' },
  { id: 'safety_ptw', label: 'Safety Permit to Work (PTW)', icon: HardHat, color: 'text-red-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor'], description: 'Digital line clear permits, earthing confirmation, and safety interlocks' },
  { id: 'asset_risk', label: 'ISO 55000 Asset Risk', icon: Target, color: 'text-purple-600', roles: ['super_admin', 'se', 'ee', 'aee', 'auditor'], description: 'Risk matrix (Probability of Failure × Consequence of Failure)' },
  { id: 'backup_restore', label: 'Backup & Data Exchange', icon: Database, color: 'text-indigo-500', roles: ['super_admin', 'gis_admin', 'auditor'], description: 'Database snapshots, GeoJSON/Shapefile export, and audit archive logs' },
  { id: 'admin_panel', label: 'Admin Control Panel', icon: Settings, color: 'text-slate-600', roles: ['super_admin'], description: 'Staff user accounts, RBAC entitlements, system configuration, and audit logs' },
];
