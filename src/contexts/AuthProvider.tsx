'use client';

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo } from 'react';
import { useAuthSlice } from './slices/useAuthSlice';
import { UserProfile } from '../types';

export interface AuthContextType {
  user: UserProfile | null;
  login: (data?: UserProfile & { token?: string; isDemo?: boolean }) => Promise<void>;
  logout: () => void;
  signInWithGoogle: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, login, logout, signInWithGoogle } = useAuthSlice();

  const authValue = useMemo(() => ({ user, login, logout, signInWithGoogle }), [user, login, logout, signInWithGoogle]);

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
