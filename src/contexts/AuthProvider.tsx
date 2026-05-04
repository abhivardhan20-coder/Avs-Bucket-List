import React, { createContext, useContext, useMemo } from 'react';
import { useAuthSlice } from './slices/useAuthSlice';
import { UserProfile } from '../types';

export interface AuthContextType {
  user: UserProfile | null;
  login: (data: Partial<UserProfile>) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, login, logout } = useAuthSlice();

  const authValue = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
