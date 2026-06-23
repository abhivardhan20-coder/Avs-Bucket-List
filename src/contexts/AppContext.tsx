'use client';

/* eslint-disable react-refresh/only-export-components */
import React, { useEffect } from 'react';
import { AuthProvider, useAuth, AuthContextType } from './AuthProvider';
import { SettingsProvider, useSettings, SettingsContextType } from './SettingsProvider';
import { SyncProvider, useSync, SyncContextType } from './SyncProvider';
import { UIProvider } from './UIContext';
import {
  LibraryProvider,
  useLibrary,
  useWatchlist,
  useWatched,
  useShared,
  useLibraryActions,
  useLibraryData,
  useWatchlistData,
  useWatchlistActions,
  useWatchedData,
  useWatchedActions,
  WatchlistContextValue,
  WatchedContextValue,
  SharedContextValue,
  WatchlistDataValue,
  WatchlistActionsValue,
  WatchedDataValue,
  WatchedActionsValue,
} from './LibraryProvider';
import { runMigrations } from '../lib/migrationService';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastProvider } from './ToastProvider';
import { API_KEYS } from '../services/config';

import { useToast } from './ToastProvider';

const MigrationRunner = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  useEffect(() => {
    let isMounted = true;
    
    const attemptMigrations = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          await runMigrations(user!);
          return; // Success
        } catch (error) {
          console.error(`Migration failed (attempt ${i + 1}/${retries}):`, error);
          if (i === retries - 1 && isMounted) {
            showToast("Failed to run data migrations. Some data might be out of date.", "error");
          } else {
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential-ish backoff
          }
        }
      }
    };

    if (user) {
      attemptMigrations();
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, showToast]);
  
  // Note: we could block children from rendering until migrations succeed if we wanted strict consistency, 
  // but for now we just show a toast if all retries fail.
  return <>{children}</>;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={API_KEYS.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'}>
        <ToastProvider>
          <UIProvider>
            <AuthProvider>
              <MigrationRunner>
                <SettingsProvider>
                  <SyncProvider>
                    <LibraryProvider>
                      {children}
                    </LibraryProvider>
                  </SyncProvider>
                </SettingsProvider>
              </MigrationRunner>
            </AuthProvider>
          </UIProvider>
        </ToastProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  );
};

// Re-export specific hooks and types for convenience
export {
  useAuth,
  useSettings,
  useSync,
  useLibrary,
  useWatchlist,
  useWatched,
  useShared,
  useLibraryActions,
  useLibraryData,
  // New granular hooks (preferred for performance)
  useWatchlistData,
  useWatchlistActions,
  useWatchedData,
  useWatchedActions,
};
export type {
  AuthContextType,
  SettingsContextType,
  SyncContextType,
  WatchlistContextValue,
  WatchedContextValue,
  SharedContextValue,
  WatchlistDataValue,
  WatchlistActionsValue,
  WatchedDataValue,
  WatchedActionsValue,
};
