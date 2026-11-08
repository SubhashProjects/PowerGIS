// ============================================================================
// PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
// AUTHENTICATION CONTEXT PROVIDER WITH ROLE SWITCHER EMULATOR
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, RolePermission } from '../types/auth';
import { authService } from '../services/authService';
import { initialUsers } from '../services/mockData';

interface AuthContextType {
  user: UserProfile;
  permissions: RolePermission;
  availableUsers: UserProfile[];
  switchUser: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(authService.getCurrentUser());
  const [permissions, setPermissions] = useState<RolePermission>(
    authService.getRolePermissions(user.role)
  );

  useEffect(() => {
    setPermissions(authService.getRolePermissions(user.role));
  }, [user]);

  const switchUser = (userId: string) => {
    const target = initialUsers.find(u => u.id === userId);
    if (target) {
      authService.setCurrentUser(target);
      setUser(target);
    }
  };

  const logout = () => {
    // Switch to Auditor or Superadmin
    const defaultUser = initialUsers[0];
    authService.setCurrentUser(defaultUser);
    setUser(defaultUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        availableUsers: initialUsers,
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
