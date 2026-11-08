// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// AUTHENTICATION & ZERO-TRUST JURISDICTION ENFORCEMENT SERVICE
// ============================================================================

import { UserProfile, OfficialRole, RolePermission } from '../types/auth';
import { initialUsers } from './mockData';

const SESSION_KEY = 'powergis_active_user_session';

export class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile = initialUsers[4]; // Default: Er. M. Sivakumar, EE Urban

  private constructor() {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const matched = initialUsers.find(u => u.id === parsed.id);
          if (matched) this.currentUser = matched;
        }
      }
    } catch {
      // Ignore fallback
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile): void {
    this.currentUser = user;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
  }

  public getRolePermissions(role: OfficialRole): RolePermission {
    switch (role) {
      case 'super_admin':
        return {
          canViewAssets: true, canEditAssets: true, canReportFault: true, canAssignFault: true,
          canVerifySurvey: true, canApproveSurvey: true, canSubmitSurvey: true, canIssuePTW: true,
          canManageUsers: true, canConfigureSystem: true, canExportData: true,
        };
      case 'se':
        return {
          canViewAssets: true, canEditAssets: true, canReportFault: true, canAssignFault: true,
          canVerifySurvey: true, canApproveSurvey: true, canSubmitSurvey: false, canIssuePTW: true,
          canManageUsers: false, canConfigureSystem: false, canExportData: true,
        };
      case 'ee':
        return {
          canViewAssets: true, canEditAssets: true, canReportFault: true, canAssignFault: true,
          canVerifySurvey: true, canApproveSurvey: true, canSubmitSurvey: false, canIssuePTW: true,
          canManageUsers: false, canConfigureSystem: false, canExportData: true,
        };
      case 'aee':
      case 'ae':
        return {
          canViewAssets: true, canEditAssets: true, canReportFault: true, canAssignFault: true,
          canVerifySurvey: true, canApproveSurvey: true, canSubmitSurvey: false, canIssuePTW: true,
          canManageUsers: false, canConfigureSystem: false, canExportData: true,
        };
      case 'je':
        return {
          canViewAssets: true, canEditAssets: true, canReportFault: true, canAssignFault: true,
          canVerifySurvey: true, canApproveSurvey: false, canSubmitSurvey: false, canIssuePTW: true,
          canManageUsers: false, canConfigureSystem: false, canExportData: true,
        };
      case 'contractor':
        return {
          canViewAssets: false, canEditAssets: false, canReportFault: true, canAssignFault: false,
          canVerifySurvey: false, canApproveSurvey: false, canSubmitSurvey: true, canIssuePTW: false,
          canManageUsers: false, canConfigureSystem: false, canExportData: false,
        };
      case 'gis_admin':
        return {
          canViewAssets: true, canEditAssets: true, canReportFault: true, canAssignFault: false,
          canVerifySurvey: true, canApproveSurvey: true, canSubmitSurvey: false, canIssuePTW: false,
          canManageUsers: false, canConfigureSystem: true, canExportData: true,
        };
      case 'auditor':
      default:
        return {
          canViewAssets: true, canEditAssets: false, canReportFault: false, canAssignFault: false,
          canVerifySurvey: false, canApproveSurvey: false, canSubmitSurvey: false, canIssuePTW: false,
          canManageUsers: false, canConfigureSystem: false, canExportData: true,
        };
    }
  }

  /**
   * Enforces strict jurisdiction scoping on any entity
   */
  public isWithinJurisdiction(entity: {
    regionId?: string;
    divisionId?: string;
    sectionId?: string;
    jeJurisdictionId?: string;
    contractorId?: string;
  }): boolean {
    const user = this.currentUser;
    if (user.role === 'super_admin' || user.role === 'gis_admin' || user.role === 'auditor') {
      return true;
    }
    if (user.role === 'se') {
      return !entity.regionId || entity.regionId === user.regionId;
    }
    if (user.role === 'ee') {
      return !entity.divisionId || entity.divisionId === user.divisionId;
    }
    if (user.role === 'aee' || user.role === 'ae') {
      return !entity.sectionId || entity.sectionId === user.sectionId;
    }
    if (user.role === 'je') {
      return !entity.jeJurisdictionId || entity.jeJurisdictionId === user.jeJurisdictionId;
    }
    if (user.role === 'contractor') {
      return entity.contractorId === user.id;
    }
    return false;
  }
}

export const authService = AuthService.getInstance();
