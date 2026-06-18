/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useQueryClient } from '@tanstack/react-query';
import { UserSettings, ActionResponse, ExportData } from '../types';
import { db } from '../lib/db';
import { useAuth } from './AuthProvider';
import { fastDiff, fetchWatchlistFromSupabase, fetchWatchedFromSupabase } from '../services/syncService';
import { supabase } from '../services/supabaseClient';
import {
  rowToWatchlistItem,
  rowToWatchedItem,
  watchlistItemToRow,
  watchedItemToRow
} from '../utils/dbMappers';

export interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  exportData: () => void;
  importData: (jsonString: string) => Promise<ActionResponse>;
  clearData: () => Promise<ActionResponse>;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { settings, updateSettings, setSettings } = useSettingsStore();

  const isDemo = user?.isDemo || user?.id === 'demo_preview_account_001';

  const exportData = useCallback(async () => {
    if (!user) return;
    try {
      let exportWatchlist: any[] = [];
      let exportWatched: any[] = [];

      if (isDemo) {
        exportWatchlist = await db.watchlist.where('userEmail').equals(user.email).toArray();
        exportWatched = await db.watched.where('userEmail').equals(user.email).toArray();
      } else {
        const watchlistRows = await fetchWatchlistFromSupabase(user.id);
        const watchedRows = await fetchWatchedFromSupabase(user.id);
        
        // Export format expectations: mapped back to the DB schema structure (where Sets are arrays)
        exportWatchlist = watchlistRows.map(row => {
          const item = rowToWatchlistItem(row);
          return {
            ...item,
            watchlistEpisodeIds: Array.from(item.watchlistEpisodeIds),
            watchlistSeasonIds: Array.from(item.watchlistSeasonIds)
          };
        });

        exportWatched = watchedRows.map(row => {
          const item = rowToWatchedItem(row);
          return {
            ...item,
            watchedEpisodeIds: Array.from(item.watchedEpisodeIds)
          };
        });
      }

      const data: ExportData = {
        version: 2,
        timestamp: new Date().toISOString(),
        watchlist: exportWatchlist,
        watched: exportWatched,
        settings
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `av-backup-${user.email}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[SettingsProvider] exportData failed", err);
    }
  }, [user, settings, isDemo]);

  const importData = useCallback(async (jsonString: string): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const data = JSON.parse(jsonString);
      const now = new Date().toISOString();

      if (isDemo) {
        const taggedWatchlist = (data.watchlist || []).map((i: any) => ({
          ...i,
          userEmail: user.email,
          version: i.version || 1,
          updatedAt: i.updatedAt || now
        }));

        const taggedWatched = (data.watched || []).map((i: any) => ({
          ...i,
          userEmail: user.email,
          version: i.version || 1,
          updatedAt: i.updatedAt || now,
          watchedEpisodeIds: Array.from(new Set(i.watchedEpisodeIds || []))
        }));

        await db.transaction('rw', db.watchlist, db.watched, async () => {
          await db.watchlist.where('userEmail').equals(user.email).delete();
          await db.watched.where('userEmail').equals(user.email).delete();
          await db.watchlist.bulkPut(taggedWatchlist);
          await db.watched.bulkPut(taggedWatched);
        });
      } else {
        // Direct Supabase import: clean up existing data first
        const { error: deleteError } = await supabase
          .from('media_items')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Map imported items to Row insert shapes
        const rowItems = [
          ...(data.watchlist || []).map((item: any) => {
            const mappedItem = {
              ...item,
              watchlistEpisodeIds: new Set(item.watchlistEpisodeIds || []),
              watchlistSeasonIds: new Set(item.watchlistSeasonIds || [])
            };
            return watchlistItemToRow(mappedItem, user.id);
          }),
          ...(data.watched || []).map((item: any) => {
            const mappedItem = {
              ...item,
              watchedEpisodeIds: new Set(item.watchedEpisodeIds || [])
            };
            return watchedItemToRow(mappedItem, user.id);
          })
        ];

        // Batch upload
        if (rowItems.length > 0) {
          const chunkSize = 50;
          for (let i = 0; i < rowItems.length; i += chunkSize) {
            const chunk = rowItems.slice(i, i + chunkSize);
            const { error: uploadError } = await supabase
              .from('media_items')
              .upsert(chunk);
            if (uploadError) throw uploadError;
          }
        }
      }

      if (data.settings) {
        setSettings(data.settings);
      }

      // Invalidate queries to trigger UI refresh
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });

      return { success: true, message: "Imported successfully" };
    } catch (err: any) {
      console.error("Import failed", err);
      let errMsg = "Invalid backup file";
      if (err instanceof Error) {
        errMsg = err.message;
      } else if (err && typeof err === 'object') {
        errMsg = err.message || err.details || err.hint || JSON.stringify(err);
      } else if (typeof err === 'string') {
        errMsg = err;
      }
      return { success: false, message: `Import failed: ${errMsg}` };
    }
  }, [user, isDemo, queryClient]);

  const clearData = useCallback(async (): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      if (isDemo) {
        await db.transaction('rw', db.watchlist, db.watched, async () => {
          await db.watchlist.where('userEmail').equals(user.email).delete();
          await db.watched.where('userEmail').equals(user.email).delete();
        });
      } else {
        const { error } = await supabase
          .from('media_items')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
      }

      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });

      return { success: true, message: "Data cleared" };
    } catch (err) {
      console.error('[SettingsProvider] clearData failed', err);
      return { success: false, message: "Clear failed" };
    }
  }, [user, isDemo, queryClient]);

  const settingsValue = useMemo(() => ({ settings, updateSettings, exportData, importData, clearData }), [settings, updateSettings, exportData, importData, clearData]);

  return (
    <SettingsContext.Provider value={settingsValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
