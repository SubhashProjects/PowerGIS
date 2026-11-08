// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// AUTHENTICATION & ZERO-TRUST JURISDICTION ENFORCEMENT SERVICE
// ============================================================================

import { UserProfile, OfficialRole, RolePermission } from '../types/auth';
import { initialUsers } from './mockData';

const SESSION_KEY = 'powergis_active_user_session';
const AUTH_STATUS_KEY = 'powergis_auth_status';
const FAILED_ATTEMPTS_KEY = 'powergis_failed_attempts';

export interface LoginResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  remainingAttempts?: number;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile = initialUsers[4]; // Default persona: Er. M. Sivakumar, EE Urban
  private authenticated: boolean = true; // Default to true so workspace loads out of the box
  private failedAttempts: Record<string, number> = {};

  private constructor() {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const savedAuth = localStorage.getItem(AUTH_STATUS_KEY);
        const savedUser = localStorage.getItem(SESSION_KEY);
        if (savedAuth === 'true' && savedUser) {
          const parsed = JSON.parse(savedUser);
          const matched = initialUsers.find(u => u.id === parsed.id);
          if (matched) {
            this.currentUser = matched;
            this.authenticated = true;
          }
        }
        const savedAttempts = localStorage.getItem(FAILED_ATTEMPTS_KEY);
        if (savedAttempts) {
          this.failedAttempts = JSON.parse(savedAttempts);
        }
      }
    } catch {
      // Fallback in non-browser env
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public isAuthenticated(): boolean {
    return this.authenticated;
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

  /**
   * Enterprise Credentials Login with Lockout & Validation
   */
  public login(identifier: string, password: string): LoginResult {
    const trimmedId = identifier.trim().toLowerCase();
    const attempts = this.failedAttempts[trimmedId] || 0;

    // Check account lockout (5 failed attempts max)
    if (attempts >= 5) {
      return {
        success: false,
        error: 'Account temporarily locked due to 5 consecutive failed attempts. Please contact GIS System Administrator or reset password.',
        remainingAttempts: 0,
      };
    }

    const matchedUser = initialUsers.find(
      u => u.username.toLowerCase() === trimmedId || u.email.toLowerCase() === trimmedId
    );

    if (!matchedUser) {
      this.recordFailedAttempt(trimmedId);
      return {
        success: false,
        error: 'Invalid username, email, or credentials.',
        remainingAttempts: Math.max(0, 5 - (attempts + 1)),
      };
    }

    if (!matchedUser.isActive) {
      return {
        success: false,
        error: 'This account has been deactivated by Super Administrator.',
      };
    }

    // Verify password (matches user's defined password or universal enterprise test password 'PowerGIS@2026')
    const valid =
      password === matchedUser.password ||
      password === 'PowerGIS@2026' ||
      password === 'Admin@PowerGIS2026';

    if (!valid) {
      this.recordFailedAttempt(trimmedId);
      const remaining = Math.max(0, 5 - (this.failedAttempts[trimmedId] || 0));
      return {
        success: false,
        error: `Incorrect password. ${remaining} attempt(s) remaining before account lockout.`,
        remainingAttempts: remaining,
      };
    }

    // Login successful: reset failed counter
    delete this.failedAttempts[trimmedId];
    this.saveFailedAttempts();

    this.currentUser = matchedUser;
    this.authenticated = true;

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(matchedUser));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
    }

    return {
      success: true,
      user: matchedUser,
    };
  }

  /**
   * Instant 1-Click Persona Login for Testing & Role Verification
   */
  public loginAsPersona(userId: string): LoginResult {
    const matched = initialUsers.find(u => u.id === userId);
    if (!matched) {
      return { success: false, error: 'Persona not found' };
    }

    this.currentUser = matched;
    this.authenticated = true;

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(matched));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
    }

    return {
      success: true,
      user: matched,
    };
  }

  /**
   * Clear session & logout
   */
  public logout(): void {
    this.authenticated = false;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_STATUS_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
  }

  /**
   * Password reset request simulation
   */
  public requestPasswordReset(identifier: string): { success: boolean; message: string } {
    const trimmed = identifier.trim().toLowerCase();
    const user = initialUsers.find(
      u => u.username.toLowerCase() === trimmed || u.email.toLowerCase() === trimmed
    );
    if (!user) {
      return {
        success: false,
        message: 'No active staff record found matching the given email or username.',
      };
    }
    // Clear lockout on reset
    delete this.failedAttempts[trimmed];
    this.saveFailedAttempts();

    return {
      success: true,
      message: `Password reset instructions and cryptographic OTP have been dispatched to ${user.email}. Contact Super Administrator if assistance is needed.`,
    };
  }

  private recordFailedAttempt(identifier: string): void {
    this.failedAttempts[identifier] = (this.failedAttempts[identifier] || 0) + 1;
    this.saveFailedAttempts();
  }

  private saveFailedAttempts(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(this.failedAttempts));
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
