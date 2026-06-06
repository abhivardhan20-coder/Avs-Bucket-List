/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../lib/db';
import { enforceCacheLimitAsync, touchCache, getCacheState, CacheState } from '../services/cacheManager';
import { MediaItem, MediaType, ActionResponse } from '../types';
import { fetchMediaItem } from '../lib/api/mediaFetcher';
import { HydrateTmdbToAniList } from '../utils/animeMapper';
import { checkBackendHealth } from '../services/syncService';
import { useAuth } from './AuthProvider';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useSyncRealtime } from '../hooks/useSyncRealtime';
import { logger } from '../lib/logger';

export interface SyncContextType {
  isSyncing: boolean;
  lastSyncTime: number;
  enqueueSyncTask: (appId: string, type: 'metadata' | 'cloud_push', priority: number, data?: unknown) => void;
  performBackupToVault: () => Promise<ActionResponse>;
  testSync: () => Promise<ActionResponse>;
  syncStats: { pending: number; processing: number; failed: number; total: number; success: number; lastError?: string };
  backendStatus: 'online' | 'offline' | 'checking';
  syncItemUpdate: (newItem: any, oldItem?: any) => void;
  syncItemDelete: (itemId: string) => void;
  getMediaDetails: (id: string, type: MediaType) => Promise<MediaItem | null>;
}

export const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => Date.now());
  const [syncStats, setSyncStats] = useState({ pending: 0, processing: 0, failed: 0, total: 0, success: 0, lastError: '' });
  
  const isDemo = user?.isDemo || user?.id === 'demo_preview_account_001';
  const syncInProgressRef = useRef(false);

  const { processSyncQueue, pullDeltaFromBackend } = useSyncEngine(
    user, isDemo, syncInProgressRef, setIsSyncing, setSyncStats, setLastSyncTime
  );

  const checkStatus = useCallback(async () => {
    if (!navigator.onLine) { setBackendStatus('offline'); return; }
    if (!user) { setBackendStatus('offline'); return; } // not 'offline' from backend POV but no sync anyway
    setBackendStatus('checking');
    try {
      const res = await checkBackendHealth();
      if (res.reason === 'unauthenticated') {
        setBackendStatus('offline'); // session not ready yet, don't alarm user
      } else {
        const isOnline = res.success;
        setBackendStatus(isOnline ? 'online' : 'offline');
        if (isOnline && !isDemo) {
          pullDeltaFromBackend().then(() => {
            processSyncQueue();
          });
        }
      }
    } catch {
      setBackendStatus('offline');
    }
  }, [user, isDemo, pullDeltaFromBackend, processSyncQueue]);



  // Realtime subscription and health checks lifecycle
  useEffect(() => {
    const handleOnline = () => {
      checkStatus();
      processSyncQueue();
    };
    const handleOffline = () => setBackendStatus('offline');

    setTimeout(() => {
      checkStatus();
    }, 0);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic sync checks (every 30 seconds)
    const intervalId = setInterval(() => {
      if (user && !isDemo && navigator.onLine) {
        processSyncQueue();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [checkStatus, processSyncQueue, pullDeltaFromBackend, user, isDemo]);

  useSyncRealtime(user, isDemo, setLastSyncTime);

  const testSync = useCallback(async (): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    if (isDemo) {
      return { success: true, message: "Local storage active (Demo mode)" };
    }
    try {
      const res = await checkBackendHealth();
      return { success: res.success, message: res.success ? "Vault connection successful" : res.message };
    } catch {
      return { success: false, message: "Sync test failed" };
    }
  }, [user, isDemo]);

  const performBackupToVault = useCallback(async (): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    if (isDemo) {
      return { success: true, message: "Demo mode - data stored locally." };
    }
    try {
      await processSyncQueue();
      await pullDeltaFromBackend();
      return { success: true, message: "Real-time sync active. Data synced with Supabase." };
    } catch (err) {
      return { success: false, message: `Backup trigger failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }, [user, isDemo, processSyncQueue, pullDeltaFromBackend]);

  const getMediaDetails = useCallback(async (id: string, type: MediaType): Promise<MediaItem | null> => {
    try {
      const cached = await db.mediaCache.get(id);
      const state = getCacheState(cached?.lastRefreshedAt);

      if (cached) {
        touchCache(id);
        if (state === CacheState.FRESH) return cached;
      }

      // Fetch fresh details inline if missing or stale
      let details = await fetchMediaItem(id, type === MediaType.Movie ? 'movie' : 'tv', type === MediaType.Anime);
      if (details) {
        if (details.type === MediaType.Anime) details = await HydrateTmdbToAniList(details);
        const data = { ...details, lastRefreshedAt: Date.now(), lastAccessedAt: Date.now() };
        await db.mediaCache.put(data);
        enforceCacheLimitAsync();
        return data;
      }
      return cached || null;
    } catch (e) {
      logger.warn('[SyncProvider] Failed to fetch media details', e);
      const cached = await db.mediaCache.get(id);
      return cached || null;
    }
  }, []);

  const enqueueSyncTask = useCallback(async (
    appId: string,
    type: 'metadata' | 'cloud_push',
    priority: number,
    _data?: unknown
  ) => {
    if (!user || isDemo) return;
    await db.syncQueue.put({
      id: `${user.email}_${appId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userEmail: user.email,
      appId,
      type,
      priority,
      reasons: ['manual'],
      addedAt: Date.now(),
      updatedAt: Date.now(),
      retries: 0,
      nextRetryAt: Date.now(),
      status: 'pending',
    });
    processSyncQueue();
  }, [user, isDemo, processSyncQueue]);

  const syncItemUpdate = useCallback(async (newItem: any) => {
    if (!user || isDemo || !newItem?.id) return;
    await enqueueSyncTask(newItem.id, 'cloud_push', 1);
  }, [user, isDemo, enqueueSyncTask]);

  const syncItemDelete = useCallback(async (itemId: string) => {
    if (!user || isDemo) return;
    await db.syncQueue.put({
      id: `${user.email}_${itemId}_del`,
      userEmail: user.email,
      appId: itemId,
      type: 'cloud_push',
      priority: 1,
      reasons: ['delete'],
      addedAt: Date.now(),
      updatedAt: Date.now(),
      retries: 0,
      nextRetryAt: Date.now(),
      status: 'pending',
    });
    processSyncQueue();
  }, [user, isDemo, processSyncQueue]);

  return (
    <SyncContext.Provider value={{
      isSyncing,
      lastSyncTime,
      enqueueSyncTask,
      performBackupToVault,
      testSync,
      syncStats,
      backendStatus,
      syncItemUpdate,
      syncItemDelete,
      getMediaDetails
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within SyncProvider');
  return context;
};
