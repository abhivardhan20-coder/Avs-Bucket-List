import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { fetchDeltaFromSupabase, upsertMediaItemInSupabase, deleteMediaItemFromSupabase } from '../services/syncService';
import { rowToWatchlistItem, rowToWatchedItem, watchlistItemToRow, watchedItemToRow, fromWatchlistItem, fromWatchedItem, toWatchlistItem, toWatchedItem } from '../utils/dbMappers';
import { logger } from '../lib/logger';

export function useSyncEngine(
  user: any,
  isDemo: boolean,
  syncInProgressRef: React.MutableRefObject<boolean>,
  setIsSyncing: (val: boolean) => void,
  setSyncStats: (val: any) => void,
  setLastSyncTime: (val: number) => void
) {
  const queryClient = useQueryClient();

  const processSyncQueue = useCallback(async () => {
    if (!user || isDemo) return;
    if (!navigator.onLine || syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const now = Date.now();
      const tasks = await db.syncQueue
        .where('userEmail')
        .equals(user.email)
        .toArray();

      const dueTasks = tasks.filter(t => t.status === 'pending' || (t.status === 'failed' && t.nextRetryAt <= now));
      
      if (dueTasks.length === 0) {
        setSyncStats({ pending: 0, processing: 0, failed: tasks.filter(t => t.status === 'failed').length, total: tasks.length, success: 0, lastError: '' });
        return;
      }

      setSyncStats((prev: any) => ({ ...prev, pending: dueTasks.length, total: tasks.length, processing: 0 }));

      for (const task of dueTasks) {
        try {
          await db.syncQueue.update(task.id, { status: 'processing', lastAttemptAt: Date.now() });

          if (task.reasons.includes('delete') || task.id.endsWith('_del')) {
            await deleteMediaItemFromSupabase(task.appId, user.id);
          } else {
            const wlItem = await db.watchlist.get([user.email, task.appId]);
            const wdItem = await db.watched.get([user.email, task.appId]);

            if (wlItem) {
              await upsertMediaItemInSupabase(watchlistItemToRow(toWatchlistItem(wlItem), user.id));
            } else if (wdItem) {
              await upsertMediaItemInSupabase(watchedItemToRow(toWatchedItem(wdItem), user.id));
            } else {
              await deleteMediaItemFromSupabase(task.appId, user.id);
            }
          }

          await db.syncQueue.delete(task.id);
          setLastSyncTime(Date.now());
        } catch (err) {
          logger.warn(`[SyncProvider] Task ${task.id} failed:`, err);
          const retries = (task.retries || 0) + 1;
          await db.syncQueue.update(task.id, {
            status: 'failed',
            retries,
            nextRetryAt: Date.now() + 5000 * Math.pow(2, Math.min(retries, 5)),
            lastError: err instanceof Error ? err.message : String(err)
          });
        }
      }

      const finalTasks = await db.syncQueue.where('userEmail').equals(user.email).toArray();
      setSyncStats({
        pending: finalTasks.filter(t => t.status === 'pending').length,
        processing: 0,
        failed: finalTasks.filter(t => t.status === 'failed').length,
        total: finalTasks.length,
        success: dueTasks.length - finalTasks.length,
        lastError: finalTasks.find(t => t.status === 'failed')?.lastError || ''
      });

      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
    } catch (err) {
      logger.error('[SyncProvider] Background sync queue failed:', err);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [user, isDemo, queryClient, setIsSyncing, setLastSyncTime, setSyncStats, syncInProgressRef]);

  const pullDeltaFromBackend = useCallback(async () => {
    if (!user || isDemo) return;
    try {
      const cursorKey = `av_last_pull_timestamp_${user.id}`;
      const lastPull = localStorage.getItem(cursorKey) || '1970-01-01T00:00:00.000Z';
      
      logger.debug(`[SyncProvider] Pulling delta updates from Supabase since: ${lastPull}`);
      const rows = await fetchDeltaFromSupabase(user.id, lastPull);
      
      if (rows.length === 0) {
        localStorage.setItem(cursorKey, new Date().toISOString());
        return;
      }

      logger.debug(`[SyncProvider] Applying ${rows.length} remote delta rows locally...`);
      
      await db.transaction('rw', db.watchlist, db.watched, async () => {
        for (const row of rows) {
          if (row.deleted_at) {
            await db.watchlist.delete([user.email, row.id]);
            await db.watched.delete([user.email, row.id]);
          } else if (row.status === 'watchlist') {
            const item = rowToWatchlistItem(row);
            await db.watchlist.put(fromWatchlistItem(item, user.email));
            await db.watched.delete([user.email, row.id]);
          } else {
            const item = rowToWatchedItem(row);
            await db.watched.put(fromWatchedItem(item, user.email));
            await db.watchlist.delete([user.email, row.id]);
          }
        }
      });

      const maxUpdatedAt = rows.reduce((max, row) => row.updated_at > max ? row.updated_at : max, lastPull);
      localStorage.setItem(cursorKey, maxUpdatedAt);
      setLastSyncTime(Date.now());

      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
    } catch (err) {
      logger.error('[SyncProvider] Delta pull failed:', err);
    }
  }, [user, isDemo, queryClient, setLastSyncTime]);

  return { processSyncQueue, pullDeltaFromBackend };
}
