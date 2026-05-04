import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserSettings, ActionResponse, ExportData } from '../types';
import { db, WatchlistDBItem, WatchedDBItem } from '../lib/db';
import { useAuth } from './AuthProvider';
import { fastDiff } from '../services/syncService';

export interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  exportData: () => void;
  importData: (jsonString: string) => Promise<ActionResponse>;
  clearData: () => ActionResponse;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    const defaultSettings: UserSettings = {
      autoplayTrailer: true,
      muteTrailer: true,
      compactView: false,
      conflictStrategy: 'lww',
      enableCloudSync: true
    };
    try {
      const stored = localStorage.getItem("av_settings");
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch (e) {
      console.warn("[SettingsProvider] Failed to parse stored settings", e);
      return defaultSettings;
    }
  });

  const updateSettings = useCallback((s: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...s };
      return fastDiff(next, prev) ? next : prev;
    });
  }, []);

  // Persist settings to local storage when changed
  useEffect(() => {
    localStorage.setItem("av_settings", JSON.stringify(settings));
    // Note: Cloud sync for settings is handled in SyncProvider.tsx
  }, [settings]);

  const exportData = useCallback(async () => {
    if (!user) return;
    const dWatchlist = await db.watchlist.where('userEmail').equals(user.email).toArray();
    const dWatched = await db.watched.where('userEmail').equals(user.email).toArray();
    const data: ExportData = {
      version: 2,
      timestamp: new Date().toISOString(),
      watchlist: dWatchlist,
      watched: dWatched,
      settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `av-backup-${user.email}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }, [user, settings]);

  const importData = useCallback(async (jsonString: string): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const data = JSON.parse(jsonString);
      const now = new Date().toISOString();
      
      const taggedWatchlist = (data.watchlist || []).map((i: WatchlistDBItem) => ({ 
        ...i, 
        userEmail: user.email,
        version: i.version || 1,
        updatedAt: i.updatedAt || now
      }));
      
      const taggedWatched = (data.watched || []).map((i: WatchedDBItem) => ({ 
        ...i, 
        userEmail: user.email,
        version: i.version || 1,
        updatedAt: i.updatedAt || now,
        watchedEpisodeIds: Array.from(new Set(i.watchedEpisodeIds || []))
      }));
      
      // FIXED: await the transaction so failures are caught
      await db.transaction('rw', db.watchlist, db.watched, async () => {
        await db.watchlist.where('userEmail').equals(user.email).delete();
        await db.watched.where('userEmail').equals(user.email).delete();
        await db.watchlist.bulkPut(taggedWatchlist);
        await db.watched.bulkPut(taggedWatched);
      });
      if (data.settings) {
        setSettings(data.settings);
      }

      return { success: true, message: "Imported successfully" };
    } catch (err: unknown) {
      console.error("Import failed", err);
      return { success: false, message: err instanceof Error ? err.message : "Invalid backup file" };
    }
  }, [user]);

  const clearData = useCallback((): ActionResponse => {
    if (!user) return { success: false, message: "Not logged in" };
    db.transaction('rw', db.watchlist, db.watched, async () => {
      await db.watchlist.where('userEmail').equals(user.email).delete();
      await db.watched.where('userEmail').equals(user.email).delete();
    });
    return { success: true, message: "Data cleared" };
  }, [user]);

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
