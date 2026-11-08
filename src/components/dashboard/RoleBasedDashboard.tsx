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

  return (
    <div className="flex-1 bg-[#f8f9fa] text-neutral-900 p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 selection:bg-neutral-900 selection:text-white">
      {/* 1. Identity & Statutory Entitlement Header Card */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white font-black flex items-center justify-center text-xl shadow-xs flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 className="text-xl font-bold text-neutral-950 tracking-tight">{user.fullName}</h1>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-300">
                  {user.role.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-900 text-white font-bold">
                  {user.designation}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 font-mono flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-medium text-neutral-700">{dashboardData.jurisdictionScope}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-start lg:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-mono text-neutral-700 flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-neutral-900" />
              <span className="font-semibold">Zero-Trust RLS Active</span>
            </div>
            <button
              onClick={() => onNavigateTab('gis_map')}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <span>Launch Master Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Statutory Role Permissions Grid */}
        <div className="mt-5 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 font-mono flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-neutral-700" />
              <span>Statutory Role Permissions & Enforcements</span>
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              Enforced by Zero-Trust RLS Engine
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {permissionCards.map((p, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-xl border text-center transition-all ${
                  p.granted
                    ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                    : 'bg-neutral-50 border-neutral-200/80 text-neutral-400 opacity-60'
                }`}
                title={p.desc}
              >
                <div className="flex items-center justify-center mb-1">
                  {p.granted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </div>
                <div className="text-[10px] font-bold leading-tight truncate">{p.label}</div>
                <div className="text-[9px] font-mono mt-0.5 font-semibold">
                  {p.granted ? 'GRANTED' : 'LOCKED'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Role-Scoped KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardData.metrics.map((metric, idx) => (
          <div
            key={idx}
            className="bg-white border border-neutral-200 rounded-2xl p-5 hover:border-neutral-300 hover:shadow-md transition-all shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider font-mono">
                {metric.label}
              </div>
              <div className="text-3xl font-extrabold text-neutral-950 font-mono mt-2 tracking-tight">
                {metric.value}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
              <span className="text-neutral-600 font-medium truncate">{metric.subtext}</span>
              {metric.trend && (
                <span className="font-mono text-neutral-800 font-semibold px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                  {metric.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Visual Analytics & Real-Time Telemetry Charts (Graphs, Pies, Bars & Gauges) */}
      <DashboardAnalyticsCharts />

      {/* 4. Main Operational Split: Pending Assignments & Role Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): My Pending Tasks & Assignments */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-950">My Pending Assignments</h2>
                <p className="text-xs text-neutral-500">
                  Tasks directly assigned to your official jurisdiction & approval tier.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-mono self-start sm:self-auto">
              <button
                onClick={() => setFilterPriority('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterPriority === 'all'
                    ? 'bg-neutral-900 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All ({dashboardData.assignments.length})
              </button>
              <button
                onClick={() => setFilterPriority('immediate')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterPriority === 'immediate'
                    ? 'bg-neutral-900 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Immediate
              </button>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {filteredAssignments.map(task => (
              <div
                key={task.id}
                className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] text-neutral-600 px-1.5 py-0.5 rounded bg-white border border-neutral-200">
                      {task.taskCode}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        task.priority === 'Immediate'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">• {task.category}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-black transition-colors">
                    {task.title}
                  </h3>

                  <div className="flex items-center space-x-4 text-[11px] text-neutral-500 font-mono">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-neutral-400" />
                      <span>{task.assignedJurisdiction}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>Due: {task.dueDate}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab(task.targetTab)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs flex-shrink-0"
                >
                  <span>{task.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}

            {filteredAssignments.length === 0 && (
              <div className="text-center py-12 text-xs text-neutral-400 font-mono">
                No assignments pending for current filter.
              </div>
            )}
          </div>
        </div>

        {/* Right (1 Col): Role Notifications Feed */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-neutral-900" />
              <h2 className="text-base font-bold text-neutral-950">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white font-mono font-bold text-[10px]">
                  {unreadCount} New
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-neutral-500 hover:text-neutral-950 underline font-mono transition-colors"
              >
                Mark all read
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
                    ? 'bg-neutral-50/70 border-neutral-200 text-neutral-500'
                    : 'bg-white border-neutral-300 text-neutral-900 shadow-sm ring-1 ring-neutral-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span
                    className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded ${
                      notif.priority === 'critical'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold'
                        : notif.priority === 'high'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    {notif.priority}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">{notif.timestamp}</span>
                </div>

                <h4 className="font-semibold text-xs text-neutral-950 leading-tight mt-1">{notif.title}</h4>
                <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">{notif.message}</p>

                {notif.actionLabel && (
                  <div className="mt-2.5 pt-2 border-t border-neutral-100 flex justify-end">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                        onNavigateTab(notif.targetTab);
                      }}
                      className="text-[11px] text-neutral-900 hover:text-black font-semibold font-mono flex items-center space-x-1"
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
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-neutral-100">
          <Sparkles className="w-4 h-4 text-neutral-900" />
          <h2 className="text-base font-bold text-neutral-950">Authorized Quick Actions</h2>
          <span className="text-xs text-neutral-500 font-mono">
            — Enabled specifically for {user.role.toUpperCase()} entitlements
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dashboardData.quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onNavigateTab(action.targetTab)}
              className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:border-neutral-400 hover:bg-white text-left transition-all group flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="text-xs font-bold text-neutral-900 group-hover:text-black transition-colors flex items-center justify-between">
                  <span>{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1.5 line-clamp-2">
                  {action.description}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-neutral-200 text-[10px] text-neutral-600 font-mono uppercase font-bold">
                Access Module →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
