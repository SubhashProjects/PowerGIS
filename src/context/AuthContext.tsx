// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// AUTHENTICATION CONTEXT PROVIDER WITH ROLE SWITCHER EMULATOR
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, RolePermission } from '../types/auth';
import { authService, LoginResult } from '../services/authService';
import { initialUsers } from '../simulator/mockData';
import { adminService } from '../services/adminService';
import { assetService } from '../services/assetService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile;
  permissions: RolePermission;
  availableUsers: UserProfile[];
  users: UserProfile[];
  isAuthenticated: boolean;
  passwordRecovery: boolean;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  loginAsPersona: (userId: string) => LoginResult;
  switchUser: (userId: string) => void;
  addUser: (userData: Omit<UserProfile, 'id'> & { id?: string; password?: string }) => Promise<UserProfile>;
  updateUser: (id: string, updates: Partial<UserProfile> & { password?: string }) => Promise<boolean>;
  deleteUser: (id: string) => Promise<{ success: boolean; message: string }>;
  resetUsersToDefault: () => Promise<void>;
  updatePassword: (password: string) => Promise<{ success: boolean; message: string }> ;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(authService.getCurrentUser());
  const [users, setUsers] = useState<UserProfile[]>(authService.getAllUsers());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [permissions, setPermissions] = useState<RolePermission>(
    authService.getRolePermissions(user.role)
  );

  useEffect(() => {
    setPermissions(authService.getRolePermissions(user.role));
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthenticated(false);
      return;
    }
    let active = true;
    const applySession = async (sessionUserId: string | null) => {
      if (!sessionUserId) {
        if (active) setIsAuthenticated(false);
        return;
      }
      try {
        const profile = await authService.loadSupabaseProfile(sessionUserId);
        if (active && profile) {
          setUser(profile);
          setIsAuthenticated(true);
          setUsers(authService.getAllUsers());
        } else if (active) {
          await supabase.auth.signOut();
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Unable to restore PowerGIS profile:', error);
        if (active) setIsAuthenticated(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      // Defer profile lookup outside the Supabase auth callback to avoid auth-lock re-entry.
      window.setTimeout(() => { void applySession(session?.user?.id ?? null); }, 0);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      return applySession(data.session?.user?.id ?? null);
    }).catch(error => {
      console.error('Unable to restore Supabase session:', error);
      if (active) setIsAuthenticated(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) {
      adminService.listUsers().then(setUsers).catch(error => console.error('Unable to load authorized user profiles:', error));
    }
    const handleSimToggle = () => {
      setUsers(authService.getAllUsers());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('powergis:simulator-toggled', handleSimToggle);
      return () => window.removeEventListener('powergis:simulator-toggled', handleSimToggle);
    }
  }, []);

  const login = async (identifier: string, password: string): Promise<LoginResult> => {
    if (!isSupabaseConfigured) {
      const normalized = identifier.trim().toLowerCase();
      const demoUser = initialUsers.find(
        u => u.email.toLowerCase() === normalized || u.username.toLowerCase() === normalized
      );
      if (demoUser) {
        assetService.setSimulatorMode(true);
        authService.setCurrentUser(demoUser);
        setUser(demoUser);
        setIsAuthenticated(true);
        setUsers(initialUsers);
        return { success: true, user: demoUser };
      }
      return {
        success: false,
        error: 'Authentication service is not configured. Connect your Supabase project using "Connect Supabase" or sign in with a demo staff persona.',
      };
    }
    const res = await authService.loginWithSupabase(identifier, password);
    if (res.success && res.user) {
      setUser(res.user);
      setIsAuthenticated(true);
      if (isSupabaseConfigured) { void adminService.listUsers().then(setUsers).catch(error => console.error('Unable to refresh authorized users:', error)); } else setUsers(authService.getAllUsers());
    }
    return res;
  };

  const loginAsPersona = (userId: string): LoginResult => {
    const isDev = Boolean((import.meta as any).env?.DEV);
    if (!isDev && isSupabaseConfigured) return { success: false, error: 'Demo login is disabled when Supabase is configured.' };
    const target = initialUsers.find(u => u.id === userId);
    if (target) {
      assetService.setSimulatorMode(true);
      authService.setCurrentUser(target);
      setUser(target);
      setIsAuthenticated(true);
      setUsers(initialUsers);
      return { success: true, user: target };
    }
    return { success: false, error: 'User persona not found.' };
  };

  const switchUser = (userId: string) => {
    const isDev = Boolean((import.meta as any).env?.DEV);
    if (!isDev && isSupabaseConfigured) return;
    const all = isSupabaseConfigured ? users : authService.getAllUsers();
    const target = all.find(u => u.id === userId);
    if (target) {
      authService.setCurrentUser(target);
      setUser(target);
      setUsers(all);
    }
  };

  const addUser = async (userData: Omit<UserProfile, 'id'> & { id?: string; password?: string }): Promise<UserProfile> => {
    if (isSupabaseConfigured) {
      if (!userData.password) throw new Error('A temporary password is required for provisioning.');
      const { password, id: _id, ...profile } = userData;
      const created = await adminService.provisionUser({ ...profile, password });
      setUsers(await adminService.listUsers());
      return created;
    }
    const created = authService.addUser(userData);
    setUsers(authService.getAllUsers());
    return created;
  };

  const updateUser = async (id: string, updates: Partial<UserProfile> & { password?: string }): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { password: _password, ...safeUpdates } = updates;
      await adminService.updateUser(id, safeUpdates);
      setUsers(await adminService.listUsers());
      return true;
    }
    const updated = authService.updateUser(id, updates);
    if (updated) { setUsers(authService.getAllUsers()); if (user.id === id) setUser(updated); return true; }
    return false;
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseConfigured) {
      try { await adminService.deactivateUser(id); setUsers(await adminService.listUsers()); return { success: true, message: 'User account deactivated successfully.' }; }
      catch (error: any) { return { success: false, message: error?.message || 'User deactivation failed.' }; }
    }
    const res = authService.deleteUser(id); if (res.success) setUsers(authService.getAllUsers()); return res;
  };

  const resetUsersToDefault = async () => {
    if (isSupabaseConfigured) throw new Error('Production user reset is intentionally disabled; use individual backend deactivation/provisioning.');
    const reset = authService.resetUsersToDefault(); setUsers(reset);
  };

  const updatePassword = async (password: string) => {
    const result = await authService.updateSupabasePassword(password);
    if (result.success) setPasswordRecovery(false);
    return result;
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setPasswordRecovery(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        availableUsers: users,
        users,
        isAuthenticated,
        passwordRecovery,
        login,
        loginAsPersona,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        resetUsersToDefault,
        updatePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
