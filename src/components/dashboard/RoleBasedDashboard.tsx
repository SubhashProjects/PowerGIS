// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// ROLE-BASED DASHBOARD: STRICT PERMISSIONS, ASSIGNMENTS & NOTIFICATIONS
// MONOCHROME BLACK & WHITE THEME
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificationService, RoleAssignment, RoleNotification } from '../../services/notificationService';
import { NavTabId } from '../layout/Sidebar';
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
  Layers,
  FileCheck,
  ChevronRight,
} from 'lucide-react';

interface RoleBasedDashboardProps {
  onNavigateTab: (tab: NavTabId) => void;
}

export const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const dashboardData = notificationService.getDashboardData(user);

  const [notifications, setNotifications] = useState<RoleNotification[]>(dashboardData.notifications);
  const [filterPriority, setFilterPriority] = useState<string>('all');

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

  return (
    <div className="flex-1 bg-black text-neutral-100 p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 selection:bg-white selection:text-black">
      {/* 1. Identity & Statutory Entitlement Header Card */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white text-black font-extrabold flex items-center justify-center text-xl shadow-lg shadow-white/10 flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 className="text-xl font-bold text-white tracking-tight">{user.fullName}</h1>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-neutral-900 text-white border border-neutral-700">
                  {user.role.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white text-black font-bold">
                  {user.designation}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 font-mono flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span>{dashboardData.jurisdictionScope}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-start lg:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-white" />
              <span>Zero-Trust RLS Active</span>
            </div>
            <button
              onClick={() => onNavigateTab('gis_map')}
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-white/10"
            >
              <span>Launch Master Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Role-Scoped KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardData.metrics.map((metric, idx) => (
          <div
            key={idx}
            className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider font-mono">
                {metric.label}
              </div>
              <div className="text-3xl font-extrabold text-white font-mono mt-2 tracking-tight">
                {metric.value}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400 truncate">{metric.subtext}</span>
              {metric.trend && (
                <span className="font-mono text-neutral-300 font-semibold px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                  {metric.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Operational Split: Pending Assignments & Role Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): My Pending Tasks & Assignments */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">My Pending Assignments</h2>
                <p className="text-xs text-neutral-400">
                  Tasks directly assigned to your official jurisdiction & approval tier.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs font-mono self-start sm:self-auto">
              <button
                onClick={() => setFilterPriority('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterPriority === 'all' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                All ({dashboardData.assignments.length})
              </button>
              <button
                onClick={() => setFilterPriority('immediate')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterPriority === 'immediate' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
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
                className="p-4 rounded-2xl bg-[#111111] border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                      {task.taskCode}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        task.priority === 'Immediate'
                          ? 'bg-neutral-800 text-white border border-neutral-700 font-extrabold'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">• {task.category}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-white group-hover:text-neutral-200 transition-colors">
                    {task.title}
                  </h3>

                  <div className="flex items-center space-x-4 text-[11px] text-neutral-400 font-mono">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-neutral-500" />
                      <span>{task.assignedJurisdiction}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      <span>Due: {task.dueDate}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab(task.targetTab)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm flex-shrink-0"
                >
                  <span>{task.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}

            {filteredAssignments.length === 0 && (
              <div className="text-center py-12 text-xs text-neutral-500 font-mono">
                No assignments pending for current filter.
              </div>
            )}
          </div>
        </div>

        {/* Right (1 Col): Role Notifications Feed */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-white" />
              <h2 className="text-base font-bold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white text-black font-mono font-bold text-[10px]">
                  {unreadCount} New
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-neutral-400 hover:text-white underline font-mono transition-colors"
              >
                Mark read
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
                    ? 'bg-[#111111]/70 border-neutral-800 text-neutral-400'
                    : 'bg-neutral-900/90 border-neutral-700 text-neutral-100 shadow-md ring-1 ring-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span
                    className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded ${
                      notif.priority === 'critical'
                        ? 'bg-neutral-800 text-white font-extrabold border border-neutral-600'
                        : notif.priority === 'high'
                        ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    {notif.priority}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">{notif.timestamp}</span>
                </div>

                <h4 className="font-semibold text-xs text-white leading-tight mt-1">{notif.title}</h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{notif.message}</p>

                {notif.actionLabel && (
                  <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex justify-end">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                        onNavigateTab(notif.targetTab);
                      }}
                      className="text-[11px] text-white hover:text-neutral-300 font-semibold font-mono flex items-center space-x-1"
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
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-neutral-800">
          <Sparkles className="w-4 h-4 text-white" />
          <h2 className="text-base font-bold text-white">Authorized Quick Actions</h2>
          <span className="text-xs text-neutral-400 font-mono">
            — Enabled specifically for {user.role.toUpperCase()} entitlements
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dashboardData.quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onNavigateTab(action.targetTab)}
              className="p-4 rounded-2xl bg-[#111111] border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold text-white group-hover:text-neutral-200 transition-colors flex items-center justify-between">
                  <span>{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5 line-clamp-2">
                  {action.description}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-neutral-800/80 text-[10px] text-neutral-500 font-mono uppercase">
                Access Module →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
