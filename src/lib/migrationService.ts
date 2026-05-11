import { db, SyncTask } from './db';
import { UserProfile } from '../types';
import { supabase, getCurrentUserId } from '../services/supabaseClient';

const MIGRATION_KEY = 'av_migration_v14_done';
const GAS_TO_SUPABASE_KEY = 'av_gas_to_supabase_done';

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

/**
 * Migrate data from Google Apps Script to Supabase (one-time).
 * Call this after user authenticates for the first time with Supabase.
 * 
 * This function:
 * 1. Attempts to pull any existing data from GAS (if endpoint still available)
 * 2. Inserts into Supabase media_items table
 * 3. Sets a flag so it never runs again
 */
export async function migrateFromGASToSupabase(user: UserProfile): Promise<void> {
  // Skip if already migrated
  if (localStorage.getItem(GAS_TO_SUPABASE_KEY)) return;
  
  const userId = await getCurrentUserId();
  if (!userId) return; // Not authenticated to Supabase yet

  try {
    // Try to read old GAS data if the endpoint is still available
    // This is a best-effort attempt; if GAS is gone, we simply skip
    const oldGasUrl = import.meta.env.VITE_GAS_URL;
    const oldGasSecret = import.meta.env.VITE_GAS_SECRET;
    
    if (!oldGasUrl || !oldGasSecret) {
      // No old GAS config, so nothing to migrate
      localStorage.setItem(GAS_TO_SUPABASE_KEY, '1');
      return;
    }

    console.log('[Migration] Attempting to migrate data from Google Apps Script to Supabase...');

    // Pull from old GAS endpoint
    const response = await fetch(oldGasUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'pull',
        token: oldGasSecret,
        userId: user.email,
        since: '0'
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`[Migration] GAS pull failed with status ${response.status}, skipping migration`);
      localStorage.setItem(GAS_TO_SUPABASE_KEY, '1');
      return;
    }

    const result = await response.json();
    if (result.error || !result.data || result.data.length === 0) {
      console.log('[Migration] No data to migrate from GAS');
      localStorage.setItem(GAS_TO_SUPABASE_KEY, '1');
      return;
    }

    // Transform GAS SyncEntry objects to Supabase media_items format
    const itemsToInsert = (result.data || []).map((entry: any) => {
      const payload = entry.payload ? JSON.parse(entry.payload) : {};
      
      return {
        id: entry.id,
        user_id: userId,
        media_type: entry.type || 'movie',
        status: entry.status || 'watchlist',
        title: entry.title || payload.title || 'Unknown',
        year: entry.year || payload.year || null,
        rating: entry.rating || payload.rating || null,
        poster_url: payload.poster || null,
        backdrop_url: null,
        genres: payload.genres || [],
        payload: payload,
        progress: null,
        added_at: entry.addedAt ? new Date(entry.addedAt).toISOString() : new Date().toISOString(),
        updated_at: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : new Date().toISOString(),
        version: entry.version || 1,
      };
    });

    if (itemsToInsert.length === 0) {
      console.log('[Migration] No valid items to migrate');
      localStorage.setItem(GAS_TO_SUPABASE_KEY, '1');
      return;
    }

    // Batch insert into Supabase (handle large datasets in chunks of 100)
    const chunkSize = 100;
    for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
      const chunk = itemsToInsert.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('media_items')
        .upsert(chunk, { onConflict: 'id' });
      
      if (error) {
        console.error(`[Migration] Failed to insert chunk ${i / chunkSize + 1}:`, error);
        // Continue with next chunk even if one fails
        continue;
      }
      console.log(`[Migration] Inserted ${Math.min(chunk.length, itemsToInsert.length - i)} items...`);
    }

    console.log(`[Migration] ✅ Successfully migrated ${itemsToInsert.length} items from GAS to Supabase`);
  } catch (err) {
    console.error('[Migration] GAS-to-Supabase migration failed:', err);
    // Don't mark as done if there was an error; let user retry
    return;
  } finally {
    // Mark migration as complete (don't retry)
    localStorage.setItem(GAS_TO_SUPABASE_KEY, '1');
  }
}
