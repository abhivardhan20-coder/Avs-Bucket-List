import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SyncTask, WatchlistDBItem, WatchedDBItem } from '../lib/db';
import { enforceCacheLimitAsync, touchCache, getCacheState, CacheState } from '../services/cacheManager';
import { MediaItem, MediaType, ActionResponse, ConflictLog } from '../types';
import { fetchMediaItem } from '../lib/api/mediaFetcher';
import { HydrateTmdbToAniList } from '../utils/animeMapper';
import { 
  pushBatchToBackend, fetchFromBackend, checkBackendHealth,
  mapWatchlistToSync, mapWatchedToSync, calculateDelta, fastDiff, fromSyncEntry, SyncEntry,
  SINGLE_USER_MODE
} from '../services/syncService';
import { resolveConflict } from '../lib/conflictResolver';
import { useAuth } from './AuthProvider';
import { useSettings } from './SettingsProvider';
import { toWatchedItem, toWatchlistItem } from '../utils/dbMappers';
import { isTokenExpired } from './slices/useAuthSlice';
import { useToast } from './ToastProvider';

export interface SyncContextType {
  isSyncing: boolean;
  lastSyncTime: number;
  enqueueSyncTask: (appId: string, type: SyncTask['type'], priority: number, data?: unknown) => void;
  performBackupToVault: () => Promise<ActionResponse>;
  testSync: () => Promise<ActionResponse>;
  syncStats: { pending: number; processing: number; failed: number; total: number; success: number; lastError?: string };
  backendStatus: 'online' | 'offline' | 'checking';
  syncItemUpdate: (newItem: WatchlistDBItem | WatchedDBItem, oldItem?: WatchlistDBItem | WatchedDBItem) => void;
  syncItemDelete: (itemId: string) => void;
  getMediaDetails: (id: string, type: MediaType) => Promise<MediaItem | null>;
}

export const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const settingsRef = useRef(settings);
  const lastSyncCursorRef = useRef<string>("0");
  const lastPulledAt = useRef<number>(0);
  
  // Namespace cursor by user email so switching accounts doesn't reuse stale cursors
  const cursorKey = user?.email ? `av_sync_cursor_${user.email}` : 'av_sync_cursor';
  const [lastSyncCursor, setLastSyncCursor] = useState<string>(() => localStorage.getItem(cursorKey) || "0");
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    const saved = localStorage.getItem('av_last_sync_time');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const isProcessingRef = useRef(false);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstEnqueuedAtRef = useRef<number | null>(null);
  
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const isPullingRef = useRef(false);

  useEffect(() => {
    syncChannelRef.current = new BroadcastChannel('av_sync_channel');
    syncChannelRef.current.onmessage = (ev) => {
      if (ev.data === 'PULL_COMPLETED') pullFromCloud();
    };
    return () => syncChannelRef.current?.close();
  }, []);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { lastSyncCursorRef.current = lastSyncCursor; }, [lastSyncCursor]);

  // Issue 7 Fix: reset the pull ref when a user logs out so a new login triggers the pull correctly.
  useEffect(() => {
    if (!user) {
      lastPulledAt.current = 0;
    }
  }, [user]);

  // ✅ CONSOLIDATED PULL: Single pullFromCloud replaces duplicate performInitialPull + runPull
  const pullFromCloud = useCallback(async () => {
    if (!user || backendStatus !== 'online' || isPullingRef.current) return;
    
    // Auth Guard
    if (!user.token || isTokenExpired(user.token)) {
      logout();
      showToast('Session expired. Please sign in again.', 'error');
      return;
    }
    
    isPullingRef.current = true;
    try {
      const { data, serverTime } = await fetchFromBackend(user.email, lastSyncCursorRef.current);
      if (!data.length) {
        lastPulledAt.current = Date.now();
        return;
      }

      await db.transaction('rw', db.watchlist, db.watched, async () => {
        // Separate incoming items by type
        const wlEntries = data.filter(e => e.status === 'watchlist');
        const wdEntries = data.filter(e => e.status !== 'watchlist');

        // Batch-fetch all local counterparts in two queries
        const localWl = await db.watchlist
          .where('[userEmail+id]')
          .anyOf(wlEntries.map(e => [user.email, e.id]))
          .toArray();
        const localWd = await db.watched
          .where('[userEmail+id]')
          .anyOf(wdEntries.map(e => [user.email, e.id]))
          .toArray();

        const localWlMap = Object.fromEntries(localWl.map(i => [i.id, i]));
        const localWdMap = Object.fromEntries(localWd.map(i => [i.id, i]));

        const wlToPut: WatchlistDBItem[] = [];
        const wdToPut: WatchedDBItem[] = [];

        for (const entry of wlEntries) {
          const local = localWlMap[entry.id];
          if ((entry.version ?? 0) > (local?.version ?? 0)) {
            wlToPut.push(fromSyncEntry(entry, user.email) as WatchlistDBItem);
          }
        }
        for (const entry of wdEntries) {
          const local = localWdMap[entry.id];
          if ((entry.version ?? 0) > (local?.version ?? 0)) {
            wdToPut.push(fromSyncEntry(entry, user.email) as WatchedDBItem);
          }
        }

        if (wlToPut.length) await db.watchlist.bulkPut(wlToPut);
        if (wdToPut.length) await db.watched.bulkPut(wdToPut);
      });

      setLastSyncCursor(serverTime);
      localStorage.setItem(cursorKey, serverTime);
      lastPulledAt.current = Date.now();
      syncChannelRef.current?.postMessage('PULL_COMPLETED');
    } catch (e) {
      console.warn('[Pull] failed', e);
    } finally {
      isPullingRef.current = false;
    }
  }, [user, backendStatus, cursorKey]);

  // On mount: pull once when backend comes online
  useEffect(() => {
    if (backendStatus === 'online') pullFromCloud();
  }, [backendStatus, pullFromCloud]);

  // On visibility restore: re-pull only if user was away 5+ minutes
  useEffect(() => {
    if (backendStatus !== 'online' || !user) return;
    const AWAY_THRESHOLD_MS = 5 * 60 * 1000;
    let lastHiddenAt = 0;

    const handleVisibility = () => {
      if (document.hidden) {
        lastHiddenAt = Date.now();
      } else if (Date.now() - lastHiddenAt > AWAY_THRESHOLD_MS) {
        pullFromCloud();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [backendStatus, user, pullFromCloud]);

  // Polling removed in single-user mode to save quota
  useEffect(() => {
    if (backendStatus !== 'online' || !user || SINGLE_USER_MODE) return;
    
    const PULL_INTERVAL_MS = 5 * 60 * 1000;
    const pollInterval = setInterval(() => {
      pullFromCloud();
    }, PULL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [backendStatus, user, pullFromCloud]);

  // ✅ OPTIMIZED: Use indexed counts instead of loading full syncQueue table
  const syncStats = useLiveQuery(async () => {
    const [pending, processing, failed] = await Promise.all([
      db.syncQueue.where('status').equals('pending').count(),
      db.syncQueue.where('status').equals('processing').count(),
      db.syncQueue.where('status').equals('failed').count(),
    ]);
    const failedTask = await db.syncQueue.where('status').equals('failed').first();
    return { pending, processing, failed, success: 0, total: pending + processing + failed, lastError: failedTask?.lastError };
  }, [], { pending: 0, processing: 0, failed: 0, success: 0, total: 0 });

  const handleTaskFailure = useCallback(async (task: SyncTask, error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isQuotaOrNetwork = errorMessage.includes('429') || 
                             errorMessage.includes('503') || 
                             errorMessage.includes('Failed to fetch');
    const isPermanent = errorMessage.includes('400') || 
                        errorMessage.includes('401') ||
                        errorMessage.includes('Unauthorized');

    const newRetries = (task.retries || 0) + 1;
    const MAX_RETRIES = 5;

    if (isPermanent || newRetries >= MAX_RETRIES) {
      await db.syncQueue.update(task.id, { 
        status: 'failed', 
        lastError: errorMessage, 
        errorType: isPermanent ? 'permanent' : 'max_retries' 
      });
    } else {
      // Exponential backoff: 5s, 10s, 20s, 40s...
      const backoffMs = isQuotaOrNetwork 
        ? Math.min(5000 * Math.pow(2, newRetries), 120000)
        : 5000 * newRetries;
      await db.syncQueue.update(task.id, {
        status: 'pending',
        retries: newRetries,
        nextRetryAt: Date.now() + backoffMs,
        lastError: errorMessage,
        errorType: isQuotaOrNetwork ? 'quota' : 'unknown'
      });
    }
  }, []);

  const processQueue = useCallback(async (isClosing: boolean = false) => {
    if (!user || (!isClosing && isProcessingRef.current) || backendStatus === 'offline') return;
    
    // Auth Guard
    if (!isClosing && (!user.token || isTokenExpired(user.token))) {
      logout();
      showToast('Session expired. Please sign in again.', 'error');
      return;
    }

    isProcessingRef.current = true;

    try {
      const pendingTasks = await db.syncQueue
        .where('[status+nextRetryAt]')
        .between(['pending', 0], ['pending', Date.now()])
        .limit(100)
        .toArray();
      // Filter out any that slipped through as processing from a prior cycle
      const safeTasks = pendingTasks.filter(t => t.status === 'pending');
      
      if (safeTasks.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      const tasks = safeTasks.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 50);
      setIsSyncing(true);

      const cloudPushTasksById: Record<string, SyncTask> = {};
      const metadataTasks: SyncTask[] = [];

      tasks.forEach(task => {
        if (task.type === 'cloud_push') cloudPushTasksById[task.appId] = task;
        else metadataTasks.push(task);
      });

      const cloudPushTasks = Object.values(cloudPushTasksById);

      if (cloudPushTasks.length > 0) {
        const items = cloudPushTasks.map(t => t.data).filter(Boolean);
        try {
          await db.syncQueue.bulkUpdate(cloudPushTasks.map(t => ({ 
            key: t.id, changes: { status: 'processing', lastAttemptAt: Date.now() } 
          })));
          
          const result = await pushBatchToBackend(items as any, isClosing);
          if (result.success && result.results) {
            await db.transaction('rw', db.watchlist, db.watched, db.syncQueue, async () => {
              for (const itemResult of result.results) {
                const originalTask = cloudPushTasks.find(t => t.appId === itemResult.id);
                if (!originalTask) continue;

                if (itemResult.status === 'conflict' && itemResult.cloudItem) {
                  if (SINGLE_USER_MODE) {
                    // In single-user mode, skip conflict resolution — local always wins
                    await db.syncQueue.delete(originalTask.id);
                  } else {
                    const cloud = itemResult.cloudItem;
                    const localRaw = await (cloud.status === 'watchlist' ? db.watchlist : db.watched).get([user.email, cloud.id]);
                    if (localRaw) {
                      const localEntry = cloud.status === 'watchlist' 
                        ? mapWatchlistToSync(localRaw as WatchlistDBItem, user.id)
                        : mapWatchedToSync(toWatchedItem(localRaw as WatchedDBItem), user.id);

                      const resolved = resolveConflict(localEntry, cloud, settingsRef.current.conflictStrategy);
                      let fullData: Record<string, unknown> = {};
                      try { if (resolved.payload) fullData = JSON.parse(resolved.payload) as Record<string, unknown>; } catch { /* ignore parse error */ }
                      
                      const itemData = { ...fullData, id: resolved.id, userEmail: user.email, version: resolved.version, updatedAt: resolved.updatedAt };
                      if (resolved.status === 'watchlist') {
                        await db.watchlist.put(itemData as unknown as WatchlistDBItem);
                        await db.watched.delete([user.email, resolved.id]);
                      } else {
                        await db.watched.put(itemData as unknown as WatchedDBItem);
                        await db.watchlist.delete([user.email, resolved.id]);
                      }
                    }
                    await db.syncQueue.delete(originalTask.id);
                  }
                } else if (itemResult.status === 'updated' || itemResult.status === 'inserted') {
                  if (itemResult.version) {
                    const table = (await db.watchlist.get([user.email, itemResult.id])) ? db.watchlist : db.watched;
                    await (table as any).where({ userEmail: user.email, id: itemResult.id }).modify({ version: itemResult.version });
                  }
                  await db.syncQueue.delete(originalTask.id);
                }
              }
            });
          } else {
            throw new Error(result.error || "Batch push failed");
          }
        } catch (e) {
          for (const task of cloudPushTasks) await handleTaskFailure(task, e instanceof Error ? e : new Error(String(e)));
        }
      }

      // Process Metadata tasks sequentially directly mapped
      for (const task of metadataTasks) {
        try {
          await db.syncQueue.update(task.id, { status: 'processing', lastAttemptAt: Date.now() });
          const cached = await db.mediaCache.get(task.appId);
          const itemType = cached?.type || (task.appId.startsWith('movie') ? MediaType.Movie : MediaType.Series);
          
          let details = await fetchMediaItem(task.appId, itemType === MediaType.Movie ? 'movie' : 'tv', itemType === MediaType.Anime);
          if (details) {
            if (details.type === MediaType.Anime) details = await HydrateTmdbToAniList(details);
            await db.mediaCache.put({ ...details, lastRefreshedAt: Date.now(), lastAccessedAt: Date.now() });
            
            const watchedItem = await db.watched.get([user.email, task.appId]);
            const watchlistItem = await db.watchlist.get([user.email, task.appId]);
            const localItem = watchedItem || watchlistItem;

            if (localItem) {
              const updates: any = { updatedAt: new Date().toISOString() };
              if (!localItem.genres?.length && details.genres?.length) updates.genres = details.genres;
              if (!localItem.poster && details.posterUrl) updates.poster = details.posterUrl;
              if (!('watchedEpisodes' in localItem) && !localItem.releaseDate && details.releaseDate) updates.releaseDate = details.releaseDate;
              await (watchedItem ? db.watched : db.watchlist).update([user.email, task.appId], updates);
            }
          }
          await db.syncQueue.delete(task.id);
        } catch (e) {
          await handleTaskFailure(task, e instanceof Error ? e : new Error(String(e)));
        }
      }
    } finally {
      setIsSyncing(false);
      setLastSyncTime(Date.now());
      localStorage.setItem('av_last_sync_time', Date.now().toString());
      isProcessingRef.current = false;
      enforceCacheLimitAsync();
    }
  }, [user, backendStatus, handleTaskFailure]);

  const enqueueSyncTask = useCallback(async (appId: string, type: 'metadata' | 'cloud_push', priority: number, data?: unknown) => {
    if (!user?.email) return;
    
    const taskId = `${user.email}_${appId}`;
    const debounceDelay = (typeof data === 'object' && data !== null && 'status' in (data as any) && (data as any).status === 'settings') ? 10000 : 4000; 
    const now = Date.now();
    const targetNextRunAt = now + debounceDelay;

    await db.transaction('rw', db.syncQueue, async () => {
      const existing = await db.syncQueue.get(taskId);
      const reasons = ((data as any)?.status ? [(data as any).status] : ['update']);

      if (existing) {
        const mergedData = { ...((existing.data as Record<string, unknown>) || {}), ...((data as Record<string, unknown>) || {}) };
        const newType = type === 'cloud_push' ? 'cloud_push' : existing.type;

        if (!fastDiff(mergedData as Record<string, any>, (existing.data as Record<string, any>) || {}) && existing.status === 'pending' && existing.type === newType) {
          return; 
        }

        await db.syncQueue.put({
          ...existing, type: newType, data: mergedData as any, priority: Math.max(existing.priority, priority),
          reasons: Array.from(new Set([...existing.reasons, ...reasons])),
          status: 'pending', nextRetryAt: targetNextRunAt, updatedAt: now
        });
      } else {
        await db.syncQueue.add({
          id: taskId, userEmail: user.email, appId, type, priority, data: data as any,
          reasons: ['initial', ...reasons], addedAt: now, updatedAt: now, nextRetryAt: targetNextRunAt,
          retries: 0, status: 'pending'
        });
      }
    });

    // Set firstEnqueuedAt only when starting a new flush window
    if (firstEnqueuedAtRef.current === null) {
      firstEnqueuedAtRef.current = now;
    }

    if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    
    const elapsed = now - firstEnqueuedAtRef.current;

    const flush = () => {
      flushTimeoutRef.current = null;
      firstEnqueuedAtRef.current = null; // reset for next window
      if ('requestIdleCallback' in window) window.requestIdleCallback(() => processQueue());
      else processQueue();
    };

    // Cap: if we've been accumulating for ≥5s, flush immediately
    if (elapsed >= 5000) {
      setTimeout(flush, 0);   // yield to let current db.transaction commit first
    } else {
      // Normal debounce: wait 1500ms after last enqueue
      flushTimeoutRef.current = setTimeout(flush, 1500);
    }
  }, [user?.email, processQueue]);

  const pushToCloudDebounced = useCallback((entry: Partial<SyncEntry>) => {
    if (!user?.id) return;
    enqueueSyncTask(entry.id!, 'cloud_push', entry.status === 'settings' ? 2 : 1, entry);
  }, [user?.id, enqueueSyncTask]);

  const syncItemUpdate = useCallback((newItem: WatchlistDBItem | WatchedDBItem, oldItem?: WatchlistDBItem | WatchedDBItem) => {
    if (!user?.id) return;
    if (oldItem && !fastDiff(newItem as any, oldItem as any)) return;

    const isWatched = 'watchedEpisodes' in newItem;
    const newEntry = isWatched 
      ? mapWatchedToSync(newItem as WatchedDBItem, user.id, oldItem as WatchedDBItem)
      : mapWatchlistToSync(newItem as WatchlistDBItem, user.id, oldItem as WatchlistDBItem);
    
    let oldEntry: SyncEntry | undefined;
    if (oldItem) {
      oldEntry = isWatched 
        ? mapWatchedToSync(oldItem as WatchedDBItem, user.id)
        : mapWatchlistToSync(oldItem as WatchlistDBItem, user.id);
    }

    pushToCloudDebounced(calculateDelta(newEntry, oldEntry));
  }, [user?.id, pushToCloudDebounced]);

  const syncItemDelete = useCallback((itemId: string) => {
    if (!user?.id) return;
    pushToCloudDebounced({ id: itemId, userId: user.id, status: 'deleted' });
  }, [user?.id, pushToCloudDebounced]);

  const getMediaDetails = useCallback(async (id: string, type: MediaType): Promise<MediaItem | null> => {
    const cached = await db.mediaCache.get(id);
    const state = getCacheState(cached?.lastRefreshedAt);

    if (cached) {
      touchCache(id);
      if (state === CacheState.FRESH) return cached;
      if (state === CacheState.STALE) {
        enqueueSyncTask(id, 'metadata', 1);
        const taskId = `${user?.email}_${id}`;
        db.syncQueue.update(taskId, { nextRetryAt: Date.now() + 1000 }).catch(() => {});
        return cached;
      }
    }

    let details = await fetchMediaItem(id, type === MediaType.Movie ? 'movie' : 'tv', type === MediaType.Anime);
    if (details) {
      if (details.type === MediaType.Anime) details = await HydrateTmdbToAniList(details);
      const data = { ...details, lastRefreshedAt: Date.now(), lastAccessedAt: Date.now() };
      await db.mediaCache.put(data);
      enforceCacheLimitAsync();
      return data;
    }
    return null;
  }, [enqueueSyncTask, user?.email]);

  const performBackupToVault = useCallback(async (): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    setIsSyncing(true);

    try {
      const allWatched = await db.watched.where('userEmail').equals(user.email).toArray();
      const allWatchlist = await db.watchlist.where('userEmail').equals(user.email).toArray();
      
      const items = [
        ...allWatched.map(w => mapWatchedToSync(toWatchedItem(w), user.id)),
        ...allWatchlist.map(w => mapWatchlistToSync(toWatchlistItem(w), user.id))
      ];

      if (items.length === 0) return { success: true, message: "Watchlist is empty, no backup needed." };

      const result = await pushBatchToBackend(items);
      if (result.success) {
        localStorage.setItem('av_last_backup', new Date().toISOString());
        return { success: true, message: `Backed up ${items.length} items.` };
      } else {
        throw new Error(result.error || "Backup failed");
      }
    } catch (err) {
      return { success: false, message: "Backup failed - check connection." };
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  // Issue 6 fix: replace fake empty push with checkBackendHealth
  const testSync = useCallback(async (): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const res = await checkBackendHealth();
      return { success: res.success, message: res.success ? "Vault connection successful" : res.message };
    } catch {
      return { success: false, message: "Sync test failed" };
    }
  }, [user]);

  const checkStatus = useCallback(async () => {
    setBackendStatus('checking');
    try {
      const res = await checkBackendHealth();
      setBackendStatus(res.success ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => checkStatus();
    const handleOffline = () => setBackendStatus('offline');

    checkStatus();
    
    // Immediate check on network recovery
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkStatus]);

  // Settings sync listener
  const settingsVersionRef = useRef(1);

  const settingsPayloadRef = useRef<string>('');
  const settingsPayload = React.useMemo(() => {
    const next = JSON.stringify(settings);
    if (next === settingsPayloadRef.current) return settingsPayloadRef.current;
    settingsPayloadRef.current = next;
    return next;
  }, [settings]);

  // Optimized settings sync: hash guard + skip first mount
  const isFirstSettingsRunRef = useRef(true);
  useEffect(() => {
    if (!user?.id || !settingsPayload || SINGLE_USER_MODE) return;
    
    const settingsHash = btoa(settingsPayload).slice(0, 16);
    const lastHash = localStorage.getItem('av_settings_hash');
    
    if (isFirstSettingsRunRef.current) {
      isFirstSettingsRunRef.current = false;
      if (lastHash === settingsHash) return;
    }
    
    if (lastHash !== settingsHash) {
      localStorage.setItem('av_settings_hash', settingsHash);
      settingsVersionRef.current = parseInt(localStorage.getItem('av_settings_version') || '1', 10) + 1;
      localStorage.setItem('av_settings_version', settingsVersionRef.current.toString());
      
      const entry = {
        id: "settings_global", userId: user.id, type: MediaType.Movie, title: "User Settings",
        status: "settings" as const, progress: 0, addedAt: Date.now(), watchedAt: "",
        updatedAt: new Date().toISOString(), version: settingsVersionRef.current, payload: settingsPayload
      };
      pushToCloudDebounced(entry);
    }
  }, [settingsPayload, user?.id, user?.email, pushToCloudDebounced]);

  useEffect(() => {
    const handleTermination = () => processQueue(true);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") handleTermination();
    };
    window.addEventListener("beforeunload", handleTermination);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", handleTermination);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [processQueue]);

  return (
    <SyncContext.Provider value={{
      isSyncing, lastSyncTime, enqueueSyncTask, performBackupToVault, testSync,
      syncStats: syncStats || { pending: 0, processing: 0, failed: 0, success: 0, total: 0 }, 
      backendStatus, syncItemUpdate, syncItemDelete, getMediaDetails
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
