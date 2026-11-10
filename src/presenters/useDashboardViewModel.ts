// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MVP / MVVM PRESENTER: DASHBOARD VIEW MODEL
// Decouples Role-Based Dashboard View from Service Logic & Domain Entities
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationService, RoleDashboardData, RoleAssignment } from '../services/notificationService';
import { COMMONS } from '../commons';

export type AssignmentFilter = 'ALL' | 'IMMEDIATE' | 'HIGH';

export interface DashboardViewModel {
  user: ReturnType<typeof useAuth>['user'];
  dashboardData: RoleDashboardData;
  activeFilter: AssignmentFilter;
  setActiveFilter: (filter: AssignmentFilter) => void;
  filteredAssignments: RoleAssignment[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  commons: typeof COMMONS;
}

export function useDashboardViewModel(): DashboardViewModel {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<AssignmentFilter>('ALL');
  const [, setTick] = useState(0);

  const dashboardData = useMemo(() => {
    return notificationService.getDashboardData(user);
  }, [user]);

  const filteredAssignments = useMemo(() => {
    if (activeFilter === 'IMMEDIATE') {
      return dashboardData.assignments.filter(a => a.priority === 'Immediate');
    }
    if (activeFilter === 'HIGH') {
      return dashboardData.assignments.filter(
        a => a.priority === 'Immediate' || a.priority === 'High'
      );
    }
    return dashboardData.assignments;
  }, [dashboardData, activeFilter]);

  const unreadNotificationCount = useMemo(() => {
    return dashboardData.notifications.filter(n => !n.read).length;
  }, [dashboardData]);

  const markNotificationAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
    setTick(t => t + 1);
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    notificationService.markAllAsRead(dashboardData.notifications);
    setTick(t => t + 1);
  }, [dashboardData]);

  return {
    user,
    dashboardData,
    activeFilter,
    setActiveFilter,
    filteredAssignments,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    commons: COMMONS,
  };
}
