// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// AUTHENTICATION CONTEXT PROVIDER WITH ROLE SWITCHER EMULATOR
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, RolePermission } from '../types/auth';
import { authService, LoginResult } from '../services/authService';
import { initialUsers } from '../services/mockData';

interface AuthContextType {
  user: UserProfile;
  permissions: RolePermission;
  availableUsers: UserProfile[];
  users: UserProfile[];
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => LoginResult;
  loginAsPersona: (userId: string) => LoginResult;
  switchUser: (userId: string) => void;
  addUser: (userData: Omit<UserProfile, 'id'> & { id?: string; password?: string }) => UserProfile;
  updateUser: (id: string, updates: Partial<UserProfile> & { password?: string }) => boolean;
  deleteUser: (id: string) => { success: boolean; message: string };
  resetUsersToDefault: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(authService.getCurrentUser());
  const [users, setUsers] = useState<UserProfile[]>(authService.getAllUsers());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [permissions, setPermissions] = useState<RolePermission>(
    authService.getRolePermissions(user.role)
  );

  useEffect(() => {
    setPermissions(authService.getRolePermissions(user.role));
  }, [user]);

  useEffect(() => {
    const handleSimToggle = () => {
      setUsers(authService.getAllUsers());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('powergis:simulator-toggled', handleSimToggle);
      return () => window.removeEventListener('powergis:simulator-toggled', handleSimToggle);
    }
  }, []);

  const login = (identifier: string, password: string): LoginResult => {
    const res = authService.login(identifier, password);
    if (res.success && res.user) {
      setUser(res.user);
      setIsAuthenticated(true);
      setUsers(authService.getAllUsers());
    }
    return res;
  };

  const loginAsPersona = (userId: string): LoginResult => {
    const res = authService.loginAsPersona(userId);
    if (res.success && res.user) {
      setUser(res.user);
      setIsAuthenticated(true);
      setUsers(authService.getAllUsers());
    }
    return res;
  };

  const switchUser = (userId: string) => {
    const all = authService.getAllUsers();
    const target = all.find(u => u.id === userId);
    if (target) {
      authService.setCurrentUser(target);
      setUser(target);
      setUsers(all);
    }
  };

  const addUser = (userData: Omit<UserProfile, 'id'> & { id?: string; password?: string }): UserProfile => {
    const created = authService.addUser(userData);
    setUsers(authService.getAllUsers());
    return created;
  };

  const updateUser = (id: string, updates: Partial<UserProfile> & { password?: string }): boolean => {
    const updated = authService.updateUser(id, updates);
    if (updated) {
      setUsers(authService.getAllUsers());
      if (user.id === id) {
        setUser(updated);
      }
      return true;
    }
    return false;
  };

  const deleteUser = (id: string): { success: boolean; message: string } => {
    const res = authService.deleteUser(id);
    if (res.success) {
      setUsers(authService.getAllUsers());
    }
    return res;
  };

  const resetUsersToDefault = () => {
    const reset = authService.resetUsersToDefault();
    setUsers(reset);
    const currentStillExists = reset.find(u => u.id === user.id);
    if (!currentStillExists && reset.length > 0) {
      setUser(reset[0]);
      authService.setCurrentUser(reset[0]);
    }
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        availableUsers: users,
        users,
        isAuthenticated,
        login,
        loginAsPersona,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        resetUsersToDefault,
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
