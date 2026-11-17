// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// AUTHENTICATION & ZERO-TRUST JURISDICTION ENFORCEMENT SERVICE (PHASE 2)
// Multi-Tier Hierarchy: SE -> EE -> AEE -> AE -> JE -> Contractor
// Separate Enclave Jurisdiction: Puducherry, Karaikal, Mahe, Yanam
// Supabase Auth Integration & Mode A Local Offline Fallback
// ============================================================================

import { UserProfile, OfficialRole, RolePermission } from '../types/auth';
import { initialUsers } from '../data/simulatorData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SESSION_KEY = 'powergis_active_user_session';
const AUTH_STATUS_KEY = 'powergis_auth_status';

export interface LoginResult {
 success: boolean;
 user?: UserProfile;
 error?: string;
 remainingAttempts?: number;
}

export class AuthService {
 private static instance: AuthService;
 private registeredUsers: UserProfile[] = [];
 private currentUser: UserProfile = initialUsers[0]; // Statutory Super Administrator by default
 private authenticated: boolean = false; // Strictly defaults to unauthenticated
 private isSimulatorActive: boolean = false;


 private constructor() {
 this.loadUsers();
 try {
 if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
 const storedSim = localStorage.getItem('powergis_simulator_mode');
 if (storedSim === 'true') {
 this.isSimulatorActive = true;
 }
 window.addEventListener('powergis:simulator-toggled', (e: any) => {
 this.isSimulatorActive = Boolean(e?.detail?.active);
 });

 // Browser storage is not proof of identity; restore only from Supabase Auth.
 localStorage.removeItem(AUTH_STATUS_KEY);
 localStorage.removeItem(SESSION_KEY);
 }
 } catch {
 // Fallback in non-browser env
 }

 // AuthProvider restores verified Supabase sessions and subscribes to auth events.
 }

 public isSimulatorMode(): boolean {
 return this.isSimulatorActive;
 }

 public setSimulatorMode(active: boolean): void {
 this.isSimulatorActive = active;
 }

 public async loadSupabaseProfile(authUserId: string): Promise<UserProfile | null> {
 if (!isSupabaseConfigured) return null;
 const { data: profile, error } = await supabase
 .from('user_profiles')
 .select('*')
 .eq('auth_user_id', authUserId)
 .maybeSingle();
 if (error) throw error;
 if (!profile || profile.is_active !== true) return null;

 const mappedUser: UserProfile = {
 id: profile.id, username: profile.username, email: profile.email,
 fullName: profile.full_name, role: profile.role, designation: profile.designation,
 phone: profile.phone, regionId: profile.region_id, divisionId: profile.division_id,
 sectionId: profile.section_id, jeJurisdictionId: profile.je_jurisdiction_id,
 contractorId: profile.contractor_id, isActive: profile.is_active,
 };
 this.currentUser = mappedUser;
 this.authenticated = true;
 return mappedUser;
 }

 private loadUsers(): void {
 // Production user profiles are authoritative in Supabase. Only development simulator personas are kept in memory.
 this.registeredUsers = [];
 }

 private saveUsers(): void {
 // Intentionally no-op: user profiles and credentials must never be persisted in browser storage.
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
 }

 public getAllUsers(includeSimulated?: boolean): UserProfile[] {
 const shouldInclude = includeSimulated ?? this.isSimulatorActive;
 if (shouldInclude) return [...initialUsers];
 return [...this.registeredUsers];
 }

 public addUser(userData: Omit<UserProfile, 'id'> & { id?: string; password?: string }): UserProfile {
 if (!(import.meta as any).env?.DEV) throw new Error('Client-side user provisioning is disabled in production.');
 const newId = userData.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
 const { password, ...cleanUserData } = userData;

 const newUser: UserProfile = {
 ...cleanUserData,
 id: newId,
 isActive: cleanUserData.isActive !== undefined ? cleanUserData.isActive : true,
 };

 // Passwords are never stored in this client-side user cache.
 // Account provisioning must use a trusted Supabase Admin/Edge Function.
 void password;

 this.registeredUsers.unshift(newUser);
 this.saveUsers();
 return newUser;
 }

 public updateUser(id: string, updates: Partial<UserProfile>): UserProfile | null {
 if (!(import.meta as any).env?.DEV) throw new Error('Client-side user profile updates are disabled in production.');
 const index = this.registeredUsers.findIndex(u => u.id === id);
 if (index !== -1) {
 const updatedUser: UserProfile = {
 ...this.registeredUsers[index],
 ...updates,
 };
 this.registeredUsers[index] = updatedUser;

 if (this.currentUser.id === id) {
 this.currentUser = updatedUser;
 }

 this.saveUsers();
 return updatedUser;
 }

 // If updating a simulated persona while simulator is ON, promote to registered users
 const simPersona = initialUsers.find(u => u.id === id);
 if (simPersona) {
 const updatedUser: UserProfile = {
 ...simPersona,
 ...updates,
 };
 this.registeredUsers.unshift(updatedUser);
 if (this.currentUser.id === id) {
 this.currentUser = updatedUser;
 }
 this.saveUsers();
 return updatedUser;
 }

 return null;
 }

 public deleteUser(id: string): { success: boolean; message: string } {
 if (!(import.meta as any).env?.DEV) return { success: false, message: 'Client-side user deactivation is disabled in production.' };
 if (this.currentUser.id === id) {
 return { success: false, message: 'Security Policy Violation: Cannot delete your own active administrator account session.' };
 }
 if (id === 'user-superadmin') {
 return { success: false, message: 'Security Policy Violation: Cannot delete statutory root administrator account.' };
 }
 const beforeCount = this.registeredUsers.length;
 this.registeredUsers = this.registeredUsers.filter(u => u.id !== id);
 if (this.registeredUsers.length < beforeCount) {
 this.saveUsers();
 return { success: true, message: 'User record deleted successfully from database.' };
 }
 if (initialUsers.some(u => u.id === id)) {
 return { success: false, message: 'Simulated pre-seeded personas cannot be permanently deleted. Switch off Simulator to clear them.' };
 }
 return { success: false, message: 'User record not found.' };
 }

 public resetUsersToDefault(): UserProfile[] {
 if (!(import.meta as any).env?.DEV) throw new Error('Development persona reset is disabled in production.');
 this.registeredUsers = [initialUsers[0]];
 this.saveUsers();
 return this.getAllUsers();
 }

 /**
 * Enterprise Credentials Login with Lockout & Validation
 */
 public login(_identifier: string, _password: string): LoginResult {
 return {
 success: false,
 error: 'Local/demo password authentication has been removed. Sign in through the configured Supabase Auth service.',
 };
 }

 /**
 * Async Supabase Auth Login with Session Token
 */
 public async loginWithSupabase(email: string, password: string): Promise<LoginResult> {
 if (!isSupabaseConfigured) {
 return { success: false, error: 'Authentication service is not configured. Contact the system administrator.' };
 }
 try {
 const { data, error } = await supabase.auth.signInWithPassword({
 email: email.trim().toLowerCase(), password,
 });
 if (error || !data.user) return { success: false, error: error?.message || 'Authentication failed.' };

 let user: UserProfile | null;
 try {
 user = await this.loadSupabaseProfile(data.user.id);
 } catch (profileError) {
 await supabase.auth.signOut();
 throw profileError;
 }
 if (!user) {
 await supabase.auth.signOut();
 return { success: false, error: 'Your account has no active PowerGIS profile. Contact the system administrator.' };
 }
 return { success: true, user };
 } catch (e: any) {
 this.authenticated = false;
 return { success: false, error: e?.message || 'Unable to contact the authentication service.' };
 }
 }

 public async updateSupabasePassword(password: string): Promise<{ success: boolean; message: string }> {
 if (!isSupabaseConfigured) return { success: false, message: 'Password update is unavailable because authentication is not configured.' };
 if (password.length < 12) return { success: false, message: 'Password must be at least 12 characters long.' };
 const { error } = await supabase.auth.updateUser({ password });
 if (error) return { success: false, message: error.message };
 return { success: true, message: 'Password updated successfully.' };
 }

 public async requestSupabasePasswordReset(email: string): Promise<{ success: boolean; message: string }> {
 if (!isSupabaseConfigured) return { success: false, message: 'Password reset is unavailable because authentication is not configured.' };
 const normalizedEmail = email.trim().toLowerCase();
 const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
 redirectTo: typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined,
 });
 if (error) return { success: false, message: error.message };
 return { success: true, message: 'If this address belongs to an account, password reset instructions will be sent.' };
 }

 /**
 * Instant 1-Click Persona Login for Testing & Role Verification
 */
 public loginAsPersona(userId: string): LoginResult {
 if (!(import.meta as any).env?.DEV) return { success: false, error: 'Demo persona login is disabled outside development builds.' };
 const all = this.getAllUsers(true);
 const matched = all.find(u => u.id === userId);
 if (!matched) {
 return { success: false, error: 'Persona not found' };
 }

 // Always enable simulator mode for 1-click persona testing
 this.setSimulatorMode(true);
 if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
 localStorage.setItem('powergis_simulator_mode', 'true');
 window.dispatchEvent(new CustomEvent('powergis:simulator-toggled', { detail: { active: true } }));
 }

 this.currentUser = matched;
 this.authenticated = true;

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
 supabase.auth.signOut().catch(error => console.error('Supabase sign-out failed:', error));
 }
 }

 /** @deprecated Use requestSupabasePasswordReset; this legacy method never sends email. */
 public requestPasswordReset(_identifier: string): { success: boolean; message: string } {
 return { success: false, message: 'Password reset is not performed by the local client. Use the Supabase Auth reset flow.' };
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
 if (user.role === 'se') return Boolean(user.regionId && entity.regionId && entity.regionId === user.regionId);
 if (user.role === 'ee') return Boolean(user.divisionId && entity.divisionId && entity.divisionId === user.divisionId);
 if (user.role === 'aee' || user.role === 'ae') return Boolean(user.sectionId && entity.sectionId && entity.sectionId === user.sectionId);
 if (user.role === 'je') return Boolean(user.jeJurisdictionId && entity.jeJurisdictionId && entity.jeJurisdictionId === user.jeJurisdictionId);
 if (user.role === 'contractor') {
 return entity.contractorId === user.id;
 }
 return false;
 }
}

export const authService = AuthService.getInstance();
