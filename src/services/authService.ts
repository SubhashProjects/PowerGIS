// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// AUTHENTICATION & ZERO-TRUST JURISDICTION ENFORCEMENT SERVICE (PHASE 2)
// Multi-Tier Hierarchy: SE -> EE -> AEE -> AE -> JE -> Contractor
// Separate Enclave Jurisdiction: Puducherry, Karaikal, Mahe, Yanam
// Supabase Auth Integration & Mode A Local Offline Fallback
// ============================================================================

import { UserProfile, OfficialRole, RolePermission } from '../types/auth';
import { initialUsers } from './mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SESSION_KEY = 'powergis_active_user_session';
const AUTH_STATUS_KEY = 'powergis_auth_status';
const FAILED_ATTEMPTS_KEY = 'powergis_failed_attempts';
const USERS_STORAGE_KEY = 'powergis_users_store_v2';

export interface LoginResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  remainingAttempts?: number;
}

export class AuthService {
  private static instance: AuthService;
  private users: UserProfile[] = [];
  private currentUser: UserProfile = initialUsers[4]; // Er. M. Sivakumar, EE Urban
  private authenticated: boolean = false; // Strictly defaults to unauthenticated
  private failedAttempts: Record<string, number> = {};

  // Private internal credential vault (Never exposed on UserProfile objects)
  private credentialsVault: Record<string, string> = {
    'user-superadmin': 'Admin@PowerGIS2026',
    'user-se1': 'SEUrban@2026',
    'user-se2': 'SERural@2026',
    'user-se3': 'SEOuter@2026',
    'user-ee': 'EEUrban@2026',
    'user-aee': 'AEETown@2026',
    'user-ae': 'AEMarapalam@2026',
    'user-je': 'JEMarapalam@2026',
    'user-contractor': 'Contractor@2026',
    'user-gisadmin': 'GISAdmin@2026',
    'user-auditor': 'Auditor@2026',
  };

  private constructor() {
    this.loadUsers();
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const savedAuth = localStorage.getItem(AUTH_STATUS_KEY);
        const savedUser = localStorage.getItem(SESSION_KEY);
        if (savedAuth === 'true' && savedUser) {
          const parsed = JSON.parse(savedUser);
          const matched = this.users.find(u => u.id === parsed.id);
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

    // Attempt Supabase session restore if configured
    if (isSupabaseConfigured) {
      this.restoreSupabaseSession();
    }
  }

  private async restoreSupabaseSession(): Promise<void> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_user_id', data.session.user.id)
          .single();

        if (profile) {
          const mappedUser: UserProfile = {
            id: profile.id,
            username: profile.username,
            email: profile.email,
            fullName: profile.full_name,
            role: profile.role,
            designation: profile.designation,
            phone: profile.phone,
            regionId: profile.region_id,
            divisionId: profile.division_id,
            sectionId: profile.section_id,
            jeJurisdictionId: profile.je_jurisdiction_id,
            contractorId: profile.contractor_id,
            isActive: profile.is_active,
          };
          this.currentUser = mappedUser;
          this.authenticated = true;
          this.saveSession();
        }
      }
    } catch (err) {
      console.warn('Supabase session restore skipped in offline mode:', err);
    }
  }

  private loadUsers(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.users = parsed;
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to parse stored users:', e);
      }
    }
    this.users = [...initialUsers];
    this.saveUsers();
  }

  private saveUsers(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
      } catch (e) {
        console.warn('Failed to persist users to localStorage:', e);
      }
    }
  }

  private saveSession(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
      localStorage.setItem(AUTH_STATUS_KEY, 'true');
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
    this.authenticated = true;
    this.saveSession();
  }

  public getAllUsers(): UserProfile[] {
    return [...this.users];
  }

  public addUser(userData: Omit<UserProfile, 'id'> & { id?: string; password?: string }): UserProfile {
    const newId = userData.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const { password, ...cleanUserData } = userData;

    const newUser: UserProfile = {
      ...cleanUserData,
      id: newId,
      isActive: cleanUserData.isActive !== undefined ? cleanUserData.isActive : true,
    };

    if (password) {
      this.credentialsVault[newId] = password;
    } else {
      this.credentialsVault[newId] = 'PowerGIS@2026';
    }

    this.users.unshift(newUser);
    this.saveUsers();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    const updatedUser: UserProfile = {
      ...this.users[index],
      ...updates,
    };
    this.users[index] = updatedUser;

    if (this.currentUser.id === id) {
      this.currentUser = updatedUser;
      this.saveSession();
    }

    this.saveUsers();
    return updatedUser;
  }

  public deleteUser(id: string): { success: boolean; message: string } {
    if (this.currentUser.id === id) {
      return { success: false, message: 'Security Policy Violation: Cannot delete your own active administrator account session.' };
    }
    const beforeCount = this.users.length;
    this.users = this.users.filter(u => u.id !== id);
    if (this.users.length === beforeCount) {
      return { success: false, message: 'User record not found.' };
    }
    this.saveUsers();
    return { success: true, message: 'User record deleted successfully from database.' };
  }

  public resetUsersToDefault(): UserProfile[] {
    this.users = [...initialUsers];
    this.saveUsers();
    return [...this.users];
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

    const matchedUser = this.users.find(
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

    // Verify password against private credentials vault or enterprise test passwords
    const expectedPassword = this.credentialsVault[matchedUser.id];
    const valid =
      password === expectedPassword ||
      password === 'PowerGIS@2026' ||
      password === 'Admin@PowerGIS2026' ||
      password === 'EEUrban@2026';

    if (!valid) {
      this.recordFailedAttempt(trimmedId);
      const remaining = Math.max(0, 5 - (this.failedAttempts[trimmedId] || 0));
      return {
        success: false,
        error: `Incorrect password. ${remaining} attempt(s) remaining before account lockout.`,
        remainingAttempts: remaining,
      };
    }

    // Login successful
    delete this.failedAttempts[trimmedId];
    this.saveFailedAttempts();

    this.currentUser = matchedUser;
    this.authenticated = true;
    this.saveSession();

    return {
      success: true,
      user: matchedUser,
    };
  }

  /**
   * Async Supabase Auth Login with Session Token
   */
  public async loginWithSupabase(email: string, password: string): Promise<LoginResult> {
    if (!isSupabaseConfigured) {
      return this.login(email, password);
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return {
          success: false,
          error: error?.message || 'Supabase authentication failed',
        };
      }

      // Fetch user profile from database
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single();

      if (profile) {
        const user: UserProfile = {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          designation: profile.designation,
          phone: profile.phone,
          regionId: profile.region_id,
          divisionId: profile.division_id,
          sectionId: profile.section_id,
          jeJurisdictionId: profile.je_jurisdiction_id,
          contractorId: profile.contractor_id,
          isActive: profile.is_active,
        };
        this.currentUser = user;
        this.authenticated = true;
        this.saveSession();
        return { success: true, user };
      }

      return this.login(email, password);
    } catch (e: any) {
      console.warn('Supabase auth network error, fallback to local:', e);
      return this.login(email, password);
    }
  }

  /**
   * Instant 1-Click Persona Login for Testing & Role Verification
   */
  public loginAsPersona(userId: string): LoginResult {
    const matched = this.users.find(u => u.id === userId);
    if (!matched) {
      return { success: false, error: 'Persona not found' };
    }

    this.currentUser = matched;
    this.authenticated = true;
    this.saveSession();

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
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
  }

  /**
   * Password reset request simulation
   */
  public requestPasswordReset(identifier: string): { success: boolean; message: string } {
    const trimmed = identifier.trim().toLowerCase();
    const user = this.users.find(
      u => u.username.toLowerCase() === trimmed || u.email.toLowerCase() === trimmed
    );
    if (!user) {
      return {
        success: false,
        message: 'No active staff record found matching the given email or username.',
      };
    }
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
   * Enforces strict jurisdiction scoping across 6 tiers & 4 enclaves:
   * SE -> Region (Puducherry, Karaikal, Mahe, Yanam)
   * EE -> Division
   * AEE / AE -> Section
   * JE -> Ward / Jurisdiction
   * Contractor -> Assigned contract
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
