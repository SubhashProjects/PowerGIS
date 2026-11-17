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
 Command,
 MapPin,
 Lock,
 ChevronRight,
 Zap,
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

 const permittedQuickActions = dashboardData.quickActions.filter(action => {
 const nav = NAVIGATION_ITEMS.find(item => item.id === action.targetTab);
 return !nav?.roles || nav.roles.includes(user.role);
 });

 return (
 <div className="pg-dashboard w-full max-w-7xl mx-auto p-3 sm:p-5 space-y-3.5 sm:space-y-4">
 {/* 1. Identity & Statutory Entitlement Ribbon (Clean Flat High-Contrast) */}
 <div className="bg-white border border-[#E4E4E4] rounded-md p-3.5 sm:p-4">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
 <div className="flex items-center space-x-3">
 <div className="w-9 h-9 rounded-md bg-[#090909] text-white flex items-center justify-center font-bold text-xs border border-neutral-800 flex-shrink-0">
 <Zap className="w-4 h-4 text-neutral-400 fill-amber-400" />
 </div>
 <div>
 <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
 <h1 className="text-base sm:text-lg font-bold text-[#090909] tracking-tight">{user.fullName}</h1>
 <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
 {user.role.replace('_', ' ')}
 </span>
 <span className="text-[10px] px-2 py-0.5 rounded bg-[#090909] text-white font-medium">
 {user.designation}
 </span>
 </div>
 <p className="text-[11px] flex items-center space-x-1.5 mt-0.5">
 <MapPin className="w-3 h-3 text-neutral-400 flex-shrink-0" />
 <span className="font-medium text-neutral-700 truncate">{dashboardData.jurisdictionScope}</span>
 </p>
 </div>
 </div>

 <div className="flex items-center space-x-2.5 self-start md:self-auto flex-shrink-0">
 <div className="px-2.5 py-1 rounded bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-800 flex items-center space-x-1.5">
 <Lock className="w-3 h-3 text-neutral-600" />
 <span className="font-semibold">Zero-Trust Active</span>
 </div>
 <button
 onClick={() => onNavigateTab('gis_map')}
 className="px-3 py-1.5 rounded-md bg-[#090909] hover:bg-neutral-800 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
 >
 <span>Master Map</span>
 <ArrowRight className="w-3 h-3" />
 </button>
 </div>
 </div>

 {/* Statutory Entitlement Chips */}
 <div className="mt-3 pt-2.5 border-t border-neutral-100 flex flex-wrap items-center gap-1.5">
 <span className="text-[10px] font-semibold flex items-center space-x-1 mr-1">
 <Shield className="w-3 h-3 text-neutral-600" />
 <span>Permitted Scopes:</span>
 </span>
 {grantedPermissions.map((p, idx) => (
 <span
 key={idx}
 className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-neutral-800 text-[10px] font-medium"
 title={p.desc}
 >
 <CheckCircle2 className="w-2.5 h-2.5 text-neutral-600" />
 <span>{p.label}</span>
 </span>
 ))}
 <span className="text-[10px] text-neutral-400 ml-auto">
 +{lockedCount} locked scopes
 </span>
 </div>
 </div>

 {/* 2. Compact Metric KPI Grid (Flat, Hairline Borders, Strict Typography) */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
 {dashboardData.metrics.map((metric, idx) => (
 <div
 key={idx}
 className="bg-white border border-[#E4E4E4] rounded-md p-3 sm:p-4 hover:border-neutral-300 transition-colors flex flex-col justify-between"
 >
 <div className="flex items-center justify-between">
 <div className="text-[11px] font-medium truncate">
 {metric.label}
 </div>
 {metric.trend && (
 <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded border bg-neutral-50 text-neutral-700 border-neutral-200">
 {metric.trend}
 </span>
 )}
 </div>
 <div className="text-2xl font-bold text-[#090909] mt-1.5 tracking-tight">
 {metric.value}
 </div>
 <div className="mt-2 pt-1.5 border-t border-neutral-100 text-[10px] font-normal truncate">
 {metric.subtext}
 </div>
 </div>
 ))}
 </div>

 {/* 3. Role-Scoped Telemetry & Charts (Compact, High-Density) */}
 <DashboardAnalyticsCharts role={user.role} />

 {/* 4. Operational Split: Tasks & Notifications */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
 {/* Left (2 Cols): Pending Assignments */}
 <div className="lg:col-span-2 bg-white border border-[#E4E4E4] rounded-md p-4 sm:p-5 flex flex-col">
 <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
 <div className="flex items-center space-x-2">
 <div className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center text-neutral-900 border border-neutral-200">
 <CheckSquare className="w-3.5 h-3.5" />
 </div>
 <h2 className="text-sm font-bold text-neutral-950 tracking-tight">{LABELS.dashboard.assignmentsTitle}</h2>
 <span className="text-[10px] text-neutral-400">({dashboardData.assignments.length})</span>
 </div>

 <div className="flex items-center space-x-1 bg-neutral-100 p-0.5 rounded border border-neutral-200 text-[10px] ">
 <button
 onClick={() => setFilterPriority('all')}
 className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
 filterPriority === 'all'
 ? 'bg-[#090909] text-white font-medium'
 : 'text-neutral-600 hover:text-neutral-950'
 }`}
 >
 All
 </button>
 <button
 onClick={() => setFilterPriority('immediate')}
 className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
 filterPriority === 'immediate'
 ? 'bg-neutral-600 text-white font-medium'
 : 'text-neutral-600 hover:text-neutral-950'
 }`}
 >
 Immediate
 </button>
 </div>
 </div>

 <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
 {filteredAssignments.map(task => (
 <div
 key={task.id}
 className="p-3 rounded-md bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
 >
 <div className="space-y-0.5 truncate">
 <div className="flex items-center space-x-1.5 flex-wrap">
 <span className="text-[9px] text-neutral-800 font-semibold px-1.5 py-0.2 rounded bg-neutral-100 border border-neutral-200">
 {task.taskCode}
 </span>
 <span
 className={` text-[9px] font-semibold px-1.5 py-0.2 rounded ${
 task.priority === 'Immediate'
 ? 'bg-neutral-50 text-neutral-800 border border-neutral-200'
 : 'bg-neutral-50 text-neutral-800 border border-neutral-200'
 }`}
 >
 {task.priority}
 </span>
 <span className="text-[10px] ">• {task.category}</span>
 </div>

 <h3 className="text-xs font-semibold text-neutral-950 truncate">
 {task.title}
 </h3>

 <div className="flex items-center space-x-3 text-[10px] ">
 <span className="flex items-center space-x-1 truncate">
 <MapPin className="w-2.5 h-2.5 text-neutral-400" />
 <span className="truncate">{task.assignedJurisdiction}</span>
 </span>
 <span className="flex items-center space-x-1 flex-shrink-0">
 <Clock className="w-2.5 h-2.5 text-neutral-400" />
 <span>{task.dueDate}</span>
 </span>
 </div>
 </div>

 <button
 onClick={() => onNavigateTab(task.targetTab)}
 className="px-2.5 py-1.5 rounded-md bg-[#090909] hover:bg-neutral-800 text-white font-medium text-[11px] flex items-center justify-center space-x-1 transition-colors flex-shrink-0 cursor-pointer"
 >
 <span>{task.actionLabel}</span>
 <ArrowRight className="w-3 h-3" />
 </button>
 </div>
 ))}

 {filteredAssignments.length === 0 && (
 <div className="text-center py-8 text-xs text-neutral-400 ">
 {LABELS.dashboard.noAssignments}
 </div>
 )}
 </div>
 </div>

 {/* Right (1 Col): Role Notifications */}
 <div className="bg-white border border-[#E4E4E4] rounded-md p-4 sm:p-5 flex flex-col">
 <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
 <div className="flex items-center space-x-1.5">
 <Bell className="w-4 h-4 text-neutral-700" />
 <h2 className="text-sm font-bold text-neutral-950 tracking-tight">{LABELS.dashboard.notificationsTitle}</h2>
 {unreadCount > 0 && (
 <span className="px-1.5 py-0.2 rounded bg-neutral-900 text-white font-bold text-[9px]">
 {unreadCount}
 </span>
 )}
 </div>

 {unreadCount > 0 && (
 <button
 onClick={handleMarkAllAsRead}
 className="text-[10px] text-neutral-600 hover:text-neutral-950 cursor-pointer"
 >
 Mark Read
 </button>
 )}
 </div>

 <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
 {notifications.map(notif => (
 <div
 key={notif.id}
 onClick={() => handleMarkAsRead(notif.id)}
 className={`p-2.5 rounded-md border transition-colors cursor-pointer ${
 notif.read
 ? 'bg-neutral-50 border-neutral-200 '
 : 'bg-white border-neutral-300 text-neutral-950'
 }`}
 >
 <div className="flex items-start justify-between gap-1 mb-0.5">
 <span
 className={`text-[8px] font-semibold px-1.5 py-0.2 rounded ${
 notif.priority === 'critical'
 ? 'bg-neutral-50 text-neutral-800 border border-neutral-200'
 : notif.priority === 'high'
 ? 'bg-neutral-50 text-neutral-800 border border-neutral-200'
 : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
 }`}
 >
 {notif.priority}
 </span>
 <span className="text-[9px] text-neutral-400 ">{notif.timestamp}</span>
 </div>

 <h4 className="font-semibold text-xs text-neutral-950 leading-tight mt-0.5">{notif.title}</h4>
 <p className="text-[10px] text-neutral-600 mt-0.5 leading-snug line-clamp-2">{notif.message}</p>

 {notif.actionLabel && (
 <div className="mt-1.5 pt-1 border-t border-neutral-100 flex justify-end">
 <button
 onClick={e => {
 e.stopPropagation();
 handleMarkAsRead(notif.id);
 onNavigateTab(notif.targetTab);
 }}
 className="text-[10px] text-neutral-800 hover:text-neutral-950 font-medium flex items-center space-x-0.5 cursor-pointer"
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

 {/* 5. Compact Quick Action Launcher (Minimalist Swiss Grid) */}
 <div className="bg-white border border-[#E4E4E4] rounded-md p-4">
 <div className="flex items-center space-x-1.5 pb-2.5 mb-3 border-b border-neutral-100">
 <Command className="w-3.5 h-3.5 text-neutral-700" />
 <h2 className="text-xs font-bold text-neutral-950 ">Authorized Shortcuts</h2>
 <span className="text-[10px] text-neutral-400 ml-auto">
 {user.role.toUpperCase()}
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
 {permittedQuickActions.map((action, idx) => (
 <button
 key={idx}
 onClick={() => onNavigateTab(action.targetTab)}
 className="p-3 rounded-md bg-white border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 text-left transition-colors group flex flex-col justify-between cursor-pointer"
 >
 <div>
 <div className="flex items-center space-x-2">
 <div className="w-5 h-5 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-900 text-[10px] font-bold">
 {idx + 1}
 </div>
 <span className="text-xs font-semibold text-neutral-950 group-hover:text-black truncate">
 {action.label}
 </span>
 </div>
 <p className="text-[10px] mt-1 line-clamp-1">
 {action.description}
 </p>
 </div>
 <div className="mt-2 pt-1 border-t border-neutral-100 text-[9px] text-neutral-600 group-hover:text-neutral-950 font-semibold flex items-center justify-between">
 <span>LAUNCH</span>
 <ArrowRight className="w-2.5 h-2.5" />
 </div>
 </button>
 ))}
 </div>
 </div>
 </div>
 );
};
