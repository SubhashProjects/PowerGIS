// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ROLE-BASED DASHBOARD: COMPACT, VISUALLY STUNNING & GROUPED MODULE WORKSPACE
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { assetService } from '../../services/assetService';
import { notificationService, RoleAssignment, RoleNotification } from '../../services/notificationService';
import { NavTabId } from '../layout/Sidebar';
import { NAVIGATION_ITEMS } from '../../config/navigationConfig';
import { LABELS } from '../../config/labelsConfig';
import { DashboardAnalyticsCharts } from './DashboardAnalyticsCharts';
import {
  Shield,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bell,
  CheckSquare,
  Sparkles,
  MapPin,
  Lock,
  ChevronRight,
} from 'lucide-react';

interface RoleBasedDashboardProps {
  onNavigateTab: (tab: NavTabId) => void;
}

export const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsub = assetService.subscribe(() => {
      setVersion(v => v + 1);
    });
    return unsub;
  }, []);

  const permissions = authService.getRolePermissions(user.role);
  const dashboardData = notificationService.getDashboardData(user);

  const [notifications, setNotifications] = useState<RoleNotification[]>(dashboardData.notifications);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    const updated = notificationService.getDashboardData(user);
    setNotifications(updated.notifications);
  }, [user.id, user.role, version]);

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

  const permissionCards = [
    { label: 'Field Surveys', granted: permissions.canSubmitSurvey, desc: 'GPS Data Capture' },
    { label: 'JE Verification', granted: permissions.canVerifySurvey, desc: 'Field Physical Check' },
    { label: 'AE Approval', granted: permissions.canApproveSurvey, desc: 'Live PostGIS Write' },
    { label: 'Safety PTWs', granted: permissions.canIssuePTW, desc: 'Feeder Line Clear' },
    { label: 'Fault Restoration', granted: permissions.canReportFault, desc: 'Geodesic Distance' },
    { label: 'Asset Editor', granted: permissions.canEditAssets, desc: 'Write Operations' },
    { label: 'Spatial Export', granted: permissions.canExportData, desc: 'GeoJSON / CSV' },
    { label: 'System Admin', granted: permissions.canConfigureSystem, desc: 'RLS & RBAC Security' },
  ];

  const grantedPermissions = permissionCards.filter(p => p.granted);
  const lockedCount = permissionCards.length - grantedPermissions.length;

  const metricAccents = [
    { topBorder: 'border-t-3 border-t-blue-500', trendBg: 'bg-blue-50 text-blue-700 border-blue-200' },
    { topBorder: 'border-t-3 border-t-emerald-500', trendBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { topBorder: 'border-t-3 border-t-purple-500', trendBg: 'bg-purple-50 text-purple-700 border-purple-200' },
    { topBorder: 'border-t-3 border-t-amber-500', trendBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  const quickActionGradients = [
    'from-blue-600 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-purple-600 to-violet-600',
    'from-amber-500 to-orange-500',
  ];

  const permittedQuickActions = dashboardData.quickActions.filter(action => {
    const nav = NAVIGATION_ITEMS.find(item => item.id === action.targetTab);
    return !nav?.roles || nav.roles.includes(user.role);
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-5 space-y-3.5 sm:space-y-4 selection:bg-blue-600 selection:text-white">
      {/* 1. Compact Header: Identity & Statutory Entitlement Ribbon */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-black flex items-center justify-center text-lg shadow-md shadow-blue-500/20 flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight">{user.fullName}</h1>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {user.role.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-white font-semibold">
                  {user.designation}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono flex items-center space-x-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <span className="font-semibold text-slate-700 truncate">{dashboardData.jurisdictionScope}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 self-start md:self-auto flex-shrink-0">
            <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-emerald-800 flex items-center space-x-1.5">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span className="font-bold">Zero-Trust Active</span>
            </div>
            <button
              onClick={() => onNavigateTab('gis_map')}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <span>Master Map</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Compact Statutory Entitlement Chips */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-1 mr-1">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span>Permitted Scopes:</span>
          </span>
          {grantedPermissions.map((p, idx) => (
            <span
              key={idx}
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-mono font-bold shadow-2xs"
              title={p.desc}
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
              <span>{p.label}</span>
            </span>
          ))}
          <span className="text-[10px] text-slate-400 font-mono ml-auto">
            +{lockedCount} locked scopes
          </span>
        </div>
      </div>

      {/* 2. Compact Metric KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {dashboardData.metrics.map((metric, idx) => {
          const accent = metricAccents[idx % metricAccents.length];
          return (
            <div
              key={idx}
              className={`bg-white border border-slate-200 rounded-xl p-3 sm:p-4 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between ${accent.topBorder}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono truncate">
                  {metric.label}
                </div>
                {metric.trend && (
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border ${accent.trendBg}`}>
                    {metric.trend}
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-slate-950 font-mono mt-1 tracking-tight">
                {metric.value}
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 font-medium truncate">
                {metric.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Role-Scoped Telemetry & Charts (Compact, high-density) */}
      <DashboardAnalyticsCharts role={user.role} />

      {/* 4. Operational Split: Tasks & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Left (2 Cols): Pending Assignments */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-950">{LABELS.dashboard.assignmentsTitle}</h2>
              <span className="text-[10px] font-mono text-slate-400">({dashboardData.assignments.length})</span>
            </div>

            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-mono">
              <button
                onClick={() => setFilterPriority('all')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  filterPriority === 'all'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterPriority('immediate')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  filterPriority === 'immediate'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Immediate
              </button>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
            {filteredAssignments.map(task => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
              >
                <div className="space-y-0.5 truncate">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="font-mono text-[9px] text-blue-700 font-bold px-1.5 py-0.2 rounded bg-blue-50 border border-blue-200">
                      {task.taskCode}
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                        task.priority === 'Immediate'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">• {task.category}</span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-900 transition-colors truncate">
                    {task.title}
                  </h3>

                  <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center space-x-1 truncate">
                      <MapPin className="w-2.5 h-2.5 text-slate-400" />
                      <span className="truncate">{task.assignedJurisdiction}</span>
                    </span>
                    <span className="flex items-center space-x-1 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      <span>{task.dueDate}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab(task.targetTab)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-bold text-[11px] flex items-center justify-center space-x-1 transition-all flex-shrink-0 cursor-pointer shadow-2xs"
                >
                  <span>{task.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}

            {filteredAssignments.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 font-mono">
                {LABELS.dashboard.noAssignments}
              </div>
            )}
          </div>
        </div>

        {/* Right (1 Col): Role Notifications */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Bell className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-950">{LABELS.dashboard.notificationsTitle}</h2>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold text-[9px]">
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[10px] text-blue-600 hover:text-blue-800 underline font-mono cursor-pointer"
              >
                Mark Read
              </button>
            )}
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
            {notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-slate-50/70 border-slate-200 text-slate-500'
                    : 'bg-white border-blue-200 text-slate-900 shadow-2xs ring-1 ring-blue-100'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <span
                    className={`text-[8px] uppercase font-mono font-bold px-1.5 py-0.2 rounded ${
                      notif.priority === 'critical'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : notif.priority === 'high'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {notif.priority}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">{notif.timestamp}</span>
                </div>

                <h4 className="font-bold text-xs text-slate-950 leading-tight mt-0.5">{notif.title}</h4>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-snug line-clamp-2">{notif.message}</p>

                {notif.actionLabel && (
                  <div className="mt-1.5 pt-1 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                        onNavigateTab(notif.targetTab);
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold font-mono flex items-center space-x-0.5 cursor-pointer"
                    >
                      <span>{notif.actionLabel}</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Compact Quick Action Launcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center space-x-1.5 pb-2.5 mb-3 border-b border-slate-100">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-950 uppercase tracking-wider font-mono">Authorized Shortcuts</h2>
          <span className="text-[10px] text-slate-400 font-mono ml-auto">
            {user.role.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {permittedQuickActions.map((action, idx) => {
            const gradient = quickActionGradients[idx % quickActionGradients.length];
            return (
              <button
                key={idx}
                onClick={() => onNavigateTab(action.targetTab)}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-white text-left transition-all group flex flex-col justify-between shadow-2xs cursor-pointer"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-5 h-5 rounded-md bg-gradient-to-tr ${gradient} flex items-center justify-center text-white text-[10px] font-black`}>
                      {idx + 1}
                    </div>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                      {action.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                    {action.description}
                  </p>
                </div>
                <div className="mt-2 pt-1 border-t border-slate-200/80 text-[9px] text-blue-600 group-hover:text-blue-800 font-mono font-bold flex items-center justify-between">
                  <span>LAUNCH</span>
                  <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
