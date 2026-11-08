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
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => LoginResult;
  loginAsPersona: (userId: string) => LoginResult;
  switchUser: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [permissions, setPermissions] = useState<RolePermission>(
    authService.getRolePermissions(user.role)
  );

  useEffect(() => {
    setPermissions(authService.getRolePermissions(user.role));
  }, [user]);

  const login = (identifier: string, password: string): LoginResult => {
    const res = authService.login(identifier, password);
    if (res.success && res.user) {
      setUser(res.user);
      setIsAuthenticated(true);
    }
    return res;
  };

  const loginAsPersona = (userId: string): LoginResult => {
    const res = authService.loginAsPersona(userId);
    if (res.success && res.user) {
      setUser(res.user);
      setIsAuthenticated(true);
    }
    return res;
  };

  const switchUser = (userId: string) => {
    const target = initialUsers.find(u => u.id === userId);
    if (target) {
      authService.setCurrentUser(target);
      setUser(target);
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
        availableUsers: initialUsers,
        isAuthenticated,
        login,
        loginAsPersona,
        switchUser,
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
