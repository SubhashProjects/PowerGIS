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
import { LABELS } from './labelsConfig';

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

export type NavCategory =
  | 'Core Operations'
  | 'Network & Assets'
  | 'Field & Maintenance'
  | 'Surveys & Projects'
  | 'Governance & Security';

export interface NavCategoryConfig {
  name: NavCategory;
  shortLabel: string;
  badge: string;
  accentColor: string;
}

export const NAVIGATION_CATEGORIES: NavCategoryConfig[] = [
  { name: 'Core Operations', shortLabel: 'Core', badge: 'LIVE', accentColor: 'text-blue-600 bg-blue-50 border-blue-200' },
  { name: 'Network & Assets', shortLabel: 'Assets', badge: 'INFRA', accentColor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { name: 'Field & Maintenance', shortLabel: 'Field Ops', badge: 'OPS', accentColor: 'text-amber-600 bg-amber-50 border-amber-200' },
  { name: 'Surveys & Projects', shortLabel: 'Projects', badge: 'RDSS', accentColor: 'text-purple-600 bg-purple-50 border-purple-200' },
  { name: 'Governance & Security', shortLabel: 'Security', badge: 'RLS', accentColor: 'text-rose-600 bg-rose-50 border-rose-200' },
];

export interface NavItemConfig {
  id: NavTabId;
  label: string;
  icon: any;
  color: string;
  roles?: string[];
  description: string;
  category: NavCategory;
}

export const NAVIGATION_ITEMS: NavItemConfig[] = [
  // 1. Core Operations
  { id: 'dashboard', label: LABELS.navigation.dashboard, icon: LayoutDashboard, color: 'text-blue-600', category: 'Core Operations', description: 'Personalized command center, statutory permissions, and pending assignments' },
  { id: 'gis_map', label: LABELS.navigation.gisMap, icon: Map, color: 'text-emerald-600', category: 'Core Operations', description: 'Interactive multi-basemap territorial network visualizer with 360° rotation' },
  { id: 'topology', label: LABELS.navigation.topology, icon: GitFork, color: 'text-sky-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'gis_admin'], category: 'Core Operations', description: 'Upstream/downstream circuit tracing and isolation point analysis' },
  { id: 'scada', label: LABELS.navigation.scada, icon: Cpu, color: 'text-rose-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'gis_admin'], category: 'Core Operations', description: 'IEC-104 live telemetry, interactive single-line diagram, and SBO breaker control' },

  // 2. Network & Assets
  { id: 'assets', label: LABELS.navigation.assets, icon: Zap, color: 'text-amber-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor', 'gis_admin'], category: 'Network & Assets', description: 'Comprehensive registry of substations, DTRs, poles, conductors, and meters' },
  { id: 'dt_loading', label: LABELS.navigation.dtLoading, icon: BarChart2, color: 'text-amber-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'gis_admin'], category: 'Network & Assets', description: 'Distribution transformer thermal loading, phase imbalance, and loss analysis' },
  { id: 'smart_meters', label: LABELS.navigation.smartMeters, icon: Gauge, color: 'text-cyan-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor', 'gis_admin'], category: 'Network & Assets', description: 'AMI telecommunications, power quality analytics, and tamper alerts' },
  { id: 'warranties', label: LABELS.navigation.warranties, icon: ShieldCheck, color: 'text-indigo-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'auditor'], category: 'Network & Assets', description: 'Asset warranty tracking, vendor claims, and replacement alerts' },
  { id: 'asset_risk', label: LABELS.navigation.assetRisk, icon: Target, color: 'text-purple-600', roles: ['super_admin', 'se', 'ee', 'aee', 'auditor'], category: 'Network & Assets', description: 'Risk matrix (Probability of Failure × Consequence of Failure)' },

  // 3. Field & Maintenance
  { id: 'faults', label: LABELS.navigation.faults, icon: AlertTriangle, color: 'text-rose-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'contractor', 'auditor'], category: 'Field & Maintenance', description: '8-stage ticket management lifecycle with geodesic proximity calculations' },
  { id: 'work_orders', label: LABELS.navigation.workOrders, icon: CheckSquare, color: 'text-violet-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je'], category: 'Field & Maintenance', description: '5-column maintenance task Kanban board and crew dispatch' },
  { id: 'preventive', label: LABELS.navigation.preventive, icon: Calendar, color: 'text-lime-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je'], category: 'Field & Maintenance', description: 'Scheduled maintenance calendar, tree-trimming, and oil testing logs' },
  { id: 'safety_ptw', label: LABELS.navigation.safetyPTW, icon: HardHat, color: 'text-red-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor'], category: 'Field & Maintenance', description: 'Digital line clear permits, earthing confirmation, and safety interlocks' },
  { id: 'stores', label: LABELS.navigation.stores, icon: Package, color: 'text-yellow-600', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'je'], category: 'Field & Maintenance', description: 'Central warehouse inventory, scrap tracking, and material requisitions' },

  // 4. Surveys & Projects
  { id: 'contractor_pwa', label: LABELS.navigation.contractorPWA, icon: Smartphone, color: 'text-fuchsia-600', roles: ['contractor', 'super_admin', 'je', 'ae'], category: 'Surveys & Projects', description: 'Mobile field survey tool for GPS asset capture and offline syncing' },
  { id: 'survey_approvals', label: LABELS.navigation.surveyApprovals, icon: FileCheck, color: 'text-emerald-600', roles: ['je', 'ae', 'aee', 'ee', 'se', 'super_admin'], category: 'Surveys & Projects', description: 'Multi-tier verification workflow (JE physical check -> AE final approval)' },
  { id: 'capital_projects', label: LABELS.navigation.capitalProjects, icon: Building2, color: 'text-teal-600', roles: ['super_admin', 'se', 'ee', 'contractor', 'auditor'], category: 'Surveys & Projects', description: 'Revamped Distribution Sector Scheme physical & financial progress tracker' },
  { id: 'disaster', label: LABELS.navigation.disaster, icon: CloudRain, color: 'text-blue-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae'], category: 'Surveys & Projects', description: 'Cyclone vulnerability maps, flood-prone DTRs, and emergency restoration' },
  { id: 'outages', label: LABELS.navigation.outages, icon: Power, color: 'text-orange-500', roles: ['super_admin', 'se', 'ee', 'aee', 'ae', 'auditor'], category: 'Surveys & Projects', description: 'SAIFI, SAIDI, CAIDI, and ENS computations per IEEE 1366 standard' },

  // 5. Governance & Security
  { id: 'admin_panel', label: LABELS.navigation.adminPanel, icon: Settings, color: 'text-slate-600', roles: ['super_admin'], category: 'Governance & Security', description: 'Staff user accounts, RBAC entitlements, system configuration, and audit logs' },
  { id: 'backup_restore', label: LABELS.navigation.backupRestore, icon: Database, color: 'text-indigo-500', roles: ['super_admin', 'gis_admin', 'auditor'], category: 'Governance & Security', description: 'Database snapshots, GeoJSON/Shapefile export, and audit archive logs' },
];
