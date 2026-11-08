// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ROLE-BASED DASHBOARD: STRICT PERMISSIONS, ASSIGNMENTS & NOTIFICATIONS
// PURE WHITE HIGH-CONTRAST THEME
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { notificationService, RoleAssignment, RoleNotification } from '../../services/notificationService';
import { NavTabId } from '../layout/Sidebar';
import { NAVIGATION_ITEMS } from '../../config/navigationConfig';
import { LABELS } from '../../config/labelsConfig';
import { DashboardAnalyticsCharts } from './DashboardAnalyticsCharts';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Bell,
  CheckSquare,
  Sparkles,
  Zap,
  MapPin,
  Lock,
  FileCheck,
  ChevronRight,
  Check,
  XCircle,
  ExternalLink,
} from 'lucide-react';

interface RoleBasedDashboardProps {
  onNavigateTab: (tab: NavTabId) => void;
}

export const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const permissions = authService.getRolePermissions(user.role);
  const dashboardData = notificationService.getDashboardData(user);

  const [notifications, setNotifications] = useState<RoleNotification[]>(dashboardData.notifications);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Ensure notifications re-sync immediately when persona or user role changes
  useEffect(() => {
    const updated = notificationService.getDashboardData(user);
    setNotifications(updated.notifications);
  }, [user.id, user.role]);

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead(notifications);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredAssignments = dashboardData.assignments.filter(a => {
    if (filterPriority === 'immediate') return a.priority === 'Immediate';
    if (filterPriority === 'high') return a.priority === 'High';
    return true;
  });

  // Permission items for statutory audit display
  const permissionCards = [
    { label: 'Submit Field Surveys', granted: permissions.canSubmitSurvey, desc: 'EPC GPS data entry' },
    { label: 'Verify Surveys (JE)', granted: permissions.canVerifySurvey, desc: 'Physical field check' },
    { label: 'Final AE Approval', granted: permissions.canApproveSurvey, desc: 'Promote to live GIS' },
    { label: 'Issue Safety PTWs', granted: permissions.canIssuePTW, desc: 'Feeder line clearance' },
    { label: 'Report / Triage Faults', granted: permissions.canReportFault, desc: 'Calculate fault distance' },
    { label: 'Edit Live Assets', granted: permissions.canEditAssets, desc: 'PostGIS write access' },
    { label: 'Export Spatial Data', granted: permissions.canExportData, desc: 'GeoJSON & CSV export' },
    { label: 'System Configuration', granted: permissions.canConfigureSystem, desc: 'RLS & admin policies' },
  ];

  // Filter granted permissions strictly for this role
  const grantedPermissions = permissionCards.filter(p => p.granted);
  const lockedCount = permissionCards.length - grantedPermissions.length;

  // Colorful card accent themes for KPI metrics
  const metricAccents = [
    { topBorder: 'border-t-4 border-t-blue-500', trendBg: 'bg-blue-50 text-blue-700 border-blue-200' },
    { topBorder: 'border-t-4 border-t-emerald-500', trendBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { topBorder: 'border-t-4 border-t-purple-500', trendBg: 'bg-purple-50 text-purple-700 border-purple-200' },
    { topBorder: 'border-t-4 border-t-amber-500', trendBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  const quickActionIcons = [
    'from-blue-600 to-cyan-500',
    'from-emerald-500 to-teal-600',
    'from-purple-600 to-indigo-600',
    'from-amber-500 to-orange-500',
  ];

  const permittedQuickActions = dashboardData.quickActions.filter(action => {
    const nav = NAVIGATION_ITEMS.find(item => item.id === action.targetTab);
    return !nav?.roles || nav.roles.includes(user.role);
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 selection:bg-blue-600 selection:text-white">
      {/* 1. Identity & Statutory Entitlement Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-black flex items-center justify-center text-2xl shadow-lg shadow-blue-500/25 flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">{user.fullName}</h1>
                <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {user.role.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-2xs">
                  {user.designation}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold text-slate-700">{dashboardData.jurisdictionScope}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-start lg:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-bold">Zero-Trust RLS Active</span>
            </div>
            <button
              onClick={() => onNavigateTab('gis_map')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <span>Launch Master Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Role-Specific Statutory Entitlements Grid (Display only granted privileges) */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Active Statutory Entitlements ({grantedPermissions.length})</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              +{lockedCount} restricted administrative scopes protected by RLS
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {grantedPermissions.map((p, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border bg-gradient-to-b from-emerald-50/90 to-teal-50/40 border-emerald-300 text-emerald-950 shadow-2xs flex items-center space-x-2.5"
                title={p.desc}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="truncate">
                  <div className="text-[11px] font-bold leading-tight truncate text-slate-900">{p.label}</div>
                  <div className="text-[9px] font-mono text-emerald-700 font-semibold truncate">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Role-Scoped KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardData.metrics.map((metric, idx) => {
          const accent = metricAccents[idx % metricAccents.length];
          return (
            <div
              key={idx}
              className={`bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-lg transition-all shadow-xs flex flex-col justify-between ${accent.topBorder}`}
            >
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                  {metric.label}
                </div>
                <div className="text-3xl font-extrabold text-slate-950 font-mono mt-2 tracking-tight">
                  {metric.value}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium truncate">{metric.subtext}</span>
                {metric.trend && (
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border ${accent.trendBg}`}>
                    {metric.trend}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Visual Analytics & Real-Time Telemetry Charts (Strictly Scoped Per Role) */}
      <DashboardAnalyticsCharts role={user.role} />

      {/* 4. Main Operational Split: Pending Assignments & Role Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): My Pending Tasks & Assignments */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">{LABELS.dashboard.assignmentsTitle}</h2>
                <p className="text-xs text-slate-500">
                  Tasks directly assigned to your official jurisdiction & approval tier.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono self-start sm:self-auto">
              <button
                onClick={() => setFilterPriority('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterPriority === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {LABELS.dashboard.filterAll} ({dashboardData.assignments.length})
              </button>
              <button
                onClick={() => setFilterPriority('immediate')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterPriority === 'immediate'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {LABELS.dashboard.filterImmediate}
              </button>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {filteredAssignments.map(task => (
              <div
                key={task.id}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] text-blue-700 font-bold px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                      {task.taskCode}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        task.priority === 'Immediate'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">• {task.category}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                    {task.title}
                  </h3>

                  <div className="flex items-center space-x-4 text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{task.assignedJurisdiction}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Due: {task.dueDate}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab(task.targetTab)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs flex-shrink-0 cursor-pointer"
                >
                  <span>{task.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}

            {filteredAssignments.length === 0 && (
              <div className="text-center py-12 text-xs text-slate-400 font-mono">
                {LABELS.dashboard.noAssignments}
              </div>
            )}
          </div>
        </div>

        {/* Right (1 Col): Role Notifications Feed */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-950">{LABELS.dashboard.notificationsTitle}</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-mono font-bold text-[10px] shadow-xs">
                  {unreadCount} {LABELS.dashboard.notificationsNewSuffix}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-blue-600 hover:text-blue-800 underline font-mono transition-colors cursor-pointer"
              >
                {LABELS.dashboard.markAllRead}
              </button>
            )}
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-slate-50/70 border-slate-200 text-slate-500'
                    : 'bg-white border-blue-200 text-slate-900 shadow-sm ring-1 ring-blue-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span
                    className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                      notif.priority === 'critical'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold'
                        : notif.priority === 'high'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {notif.priority}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{notif.timestamp}</span>
                </div>

                <h4 className="font-bold text-xs text-slate-950 leading-tight mt-1">{notif.title}</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{notif.message}</p>

                {notif.actionLabel && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                        onNavigateTab(notif.targetTab);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold font-mono flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{notif.actionLabel}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Authorized Quick Action Launcher */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-950">{LABELS.dashboard.quickActionsTitle}</h2>
          <span className="text-xs text-slate-500 font-mono">
            {LABELS.dashboard.quickActionsScopedPrefix}{user.role.toUpperCase()}{LABELS.dashboard.quickActionsScopedSuffix}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {permittedQuickActions.map((action, idx) => {
            const iconGradient = quickActionIcons[idx % quickActionIcons.length];
            return (
              <button
                key={idx}
                onClick={() => onNavigateTab(action.targetTab)}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-400 hover:bg-white text-left transition-all group flex flex-col justify-between shadow-2xs hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-5 h-5 rounded-lg bg-gradient-to-tr ${iconGradient} flex items-center justify-center text-white text-[10px] font-bold shadow-2xs`}>
                        {idx + 1}
                      </div>
                      <span>{action.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                    {action.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-blue-600 group-hover:text-blue-800 font-mono uppercase font-bold">
                  {LABELS.dashboard.accessModuleCTA}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
