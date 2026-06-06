/* eslint-disable react-refresh/only-export-components */
import React, { useEffect } from 'react';
import { AuthProvider, useAuth, AuthContextType } from './AuthProvider';
import { SettingsProvider, useSettings, SettingsContextType } from './SettingsProvider';
import { SyncProvider, useSync, SyncContextType } from './SyncProvider';
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

const MigrationRunner = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      runMigrations(user).catch(console.error);
    }
  }, [user]);
  return <>{children}</>;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
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
