import { db, SyncTask } from './db';
import { UserProfile } from '../types';

const MIGRATION_KEY = 'av_migration_v14_done';

export async function runMigrations(user: UserProfile): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY)) return;
  if (!user) return;
  
  const v1WatchCnt = await db.watchlist.count();
  const v1WatchedCnt = await db.watched.count();
  const v1QueueCnt = await db.syncQueue.count();
  
  if (v1WatchCnt > 0 || v1WatchedCnt > 0) {
    const allWatch = await db.watchlist.toArray();
    const allWatched = await db.watched.toArray();
    const now = new Date().toISOString();

    const watchlistUpdates = [];
    const watchlistDeletes = [];
    for (const item of allWatch) {
      const lowerEmail = (item.userEmail || user.email).toLowerCase();
      if (item.userEmail !== lowerEmail || !item.version || !item.updatedAt) {
        if (item.userEmail && item.userEmail !== lowerEmail) {
          watchlistDeletes.push([item.userEmail, item.id]);
        }
        watchlistUpdates.push({ ...item, userEmail: lowerEmail, version: item.version || 1, updatedAt: item.updatedAt || now });
      }
    }
    if (watchlistDeletes.length > 0) await db.watchlist.bulkDelete(watchlistDeletes as any);
    if (watchlistUpdates.length > 0) await db.watchlist.bulkPut(watchlistUpdates as any);

    const watchedUpdates = [];
    const watchedDeletes = [];
    for (const item of allWatched) {
      const lowerEmail = (item.userEmail || user.email).toLowerCase();
      if (item.userEmail !== lowerEmail || !item.version || !item.updatedAt) {
        if (item.userEmail && item.userEmail !== lowerEmail) {
          watchedDeletes.push([item.userEmail, item.id]);
        }
        watchedUpdates.push({ ...item, userEmail: lowerEmail, version: item.version || 1, updatedAt: item.updatedAt || now });
      }
    }
    if (watchedDeletes.length > 0) await db.watched.bulkDelete(watchedDeletes as any);
    if (watchedUpdates.length > 0) await db.watched.bulkPut(watchedUpdates as any);
  }

  if (user.id && user.email) {
    const settingsTaskId = `${user.email}_settings_global`;
    const settingsTask = await db.syncQueue.get(settingsTaskId);
    if (settingsTask && (settingsTask.data as any)?.userId === user.email) {
      await db.syncQueue.update(settingsTaskId, { data: { ...(settingsTask.data as any), userId: user.id } });
    }
  }

  if (v1QueueCnt > 0) {
    const allTasks = await db.syncQueue.toArray();
    const now = Date.now();
    const aggregated: Record<string, SyncTask> = {};

    for (const task of allTasks) {
      if ((task as any).reasons === undefined) {
         const newId = `${task.userEmail}_${task.appId}`;
         const reason = ((task as any).reason as string) || 'metadata';
         
         if (aggregated[newId]) {
           aggregated[newId].reasons = Array.from(new Set([...aggregated[newId].reasons, reason]));
           aggregated[newId].priority = Math.max(aggregated[newId].priority, task.priority);
         } else {
           aggregated[newId] = {
             ...task, id: newId, reasons: [reason], status: task.status || 'pending',
              retries: (task as any).retryCount || 0, nextRetryAt: (task as any).nextRunAt || now
            };
         }
         await db.syncQueue.delete(task.id);
      }
    }
    for (const task of Object.values(aggregated)) {
      await db.syncQueue.put(task);
    }
  }

  const oldWatchlistRaw = JSON.parse(localStorage.getItem("watchlist") || "[]");
  const oldWatchedRaw = JSON.parse(localStorage.getItem("watched") || "[]");
  if (oldWatchlistRaw.length > 0 || oldWatchedRaw.length > 0) {
    const now = new Date().toISOString();
    if (oldWatchlistRaw.length > 0) {
      const items = oldWatchlistRaw.map((i: Record<string, unknown>) => ({ 
        ...i, userEmail: user.email, version: (i.version as number) || 1, updatedAt: (i.updatedAt as string) || now 
      }));
      await db.watchlist.bulkPut(items as any);
      localStorage.removeItem("watchlist");
    }
    if (oldWatchedRaw.length > 0) {
      const items = oldWatchedRaw.map((i: Record<string, unknown>) => ({ 
        ...i, userEmail: user.email, version: (i.version as number) || 1, updatedAt: (i.updatedAt as string) || now,
        watchedEpisodeIds: Array.from((i.watchedEpisodeIds as string[]) || []) 
      }));
      await db.watched.bulkPut(items as any);
      localStorage.removeItem("watched");
    }
  }

  localStorage.setItem(MIGRATION_KEY, '1');
}
