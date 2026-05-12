import { WatchlistItem, WatchedItem } from '@/types';
import { WatchlistDBItem, WatchedDBItem } from '@/lib/db';
import { supabase, getCurrentUserId } from './supabaseClient';
import { Database } from '@/types/database.types';

/**
 * Single-user mode: bypasses conflict detection entirely.
 * Every push is a trusted overwrite. Set to false for multi-device sync.
 */
export const SINGLE_USER_MODE = true;

/**
 * Backend Sync Record Schema Mapping
 */
export interface SyncEntry {
  id: string;
  userId: string;
  status: 'watchlist' | 'watched' | 'deleted' | 'settings';
  title?: string;
  type?: string;
  addedAt?: string | number;
  watchedAt?: string;
  progress?: number;
  rating?: number;
  year?: number;
  updatedAt?: string;
  version?: number;
  payload?: string;
}

/**
 * Optimized difference calculator using shallow comparison.
 * Avoids JSON.stringify and Object.keys overhead.
 */
export function fastDiff<T extends Record<string, any>>(curr: T, prev: T | Partial<T> | undefined): Partial<T> | null {
  if (!prev) return curr;
  const delta: Partial<T> = {};
  let changed = false;

  for (const k in curr) {
    if (curr[k] !== prev[k]) {
      delta[k] = curr[k];
      changed = true;
    }
  }

  return changed ? delta : null;
}

/**
 * Utility to calculate delta between current and previous sync state.
 * Only returns fields that have actually changed, preserving identity keys.
 */
export const calculateDelta = (current: SyncEntry, previous?: Partial<SyncEntry>): Partial<SyncEntry> => {
  const baseDelta: Partial<SyncEntry> = {
    id: current.id,
    userId: current.userId,
    status: current.status,
    version: current.version,
    updatedAt: current.updatedAt
  };

  const diff = fastDiff(current, previous);
  if (!diff) return baseDelta;

  // Merge diff with baseDelta, ensuring we don't duplicate identity keys
  return { ...baseDelta, ...diff };
};

/**
 * Generic patch builder for shallow diffing.
 * Alias for fastDiff to maintain semantic clarity for payloads.
 */
export function buildPatch<T extends Record<string, any>>(oldData: T, newData: T): Partial<T> {
  return fastDiff(newData, oldData) || {};
}

export interface PushResult {
  success: boolean;
  processed: number;
  results: { id: string; status: 'updated' | 'inserted' | 'conflict'; cloudItem?: SyncEntry; version?: number }[];
  serverTime: string;
  error?: string;
}

/**
 * Remove entry from Backend (soft delete via deleted_at)
 */
export const removeFromBackend = async (id: string, userId: string, keepalive: boolean = false): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('media_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
    
    return !error;
  } catch {
    return false;
  }
};

/**
 * Post multiple entries to Supabase (Batch Upsert)
 * Uses version-based conflict detection: if remote.version > local.version - 1,
 * a conflict is logged but the upsert proceeds with remote winning.
 */
export const pushBatchToBackend = async (
  entries: SyncEntry[], 
  keepalive: boolean = false,
  retries: number = 3,
  backoff: number = 500
): Promise<PushResult> => {
  if (entries.length === 0) {
    return { success: true, processed: 0, results: [], serverTime: new Date().toISOString() };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, processed: 0, results: [], serverTime: "", error: "Not authenticated" };
  }

  try {
    const now = new Date().toISOString();
    
    // Convert SyncEntry to media_items format
    const itemsToUpsert: Database['public']['Tables']['media_items']['Insert'][] = entries.map(e => ({
      id: e.id,
      user_id: userId,
      media_type: (e.type as any) || 'movie',
      status: (e.status as any) || 'watchlist',
      title: e.title || '',
      year: e.year || null,
      rating: e.rating || null,
      poster_url: null,
      backdrop_url: null,
      genres: [],
      payload: e.payload ? JSON.parse(e.payload) : {},
      progress: null,
      added_at: e.addedAt ? new Date(e.addedAt).toISOString() : now,
      updated_at: e.updatedAt ? new Date(e.updatedAt).toISOString() : now,
      version: e.version || 1,
      deleted_at: null,
    }));

    // Fetch remote versions to detect conflicts
    const remoteIds = entries.map(e => e.id);
    const { data: remoteItems } = await supabase
      .from('media_items')
      .select('id,version')
      .in('id', remoteIds)
      .eq('user_id', userId);

    const remoteVersionMap = Object.fromEntries((remoteItems || []).map(r => [r.id, r.version]));
    const results: PushResult['results'] = [];
    const conflicts: Array<{ itemId: string; localVersion: number; remoteVersion: number }> = [];

    // Check for version conflicts
    entries.forEach(entry => {
      const remoteVersion = remoteVersionMap[entry.id];
      if (remoteVersion !== undefined && remoteVersion > (entry.version || 0) - 1) {
        conflicts.push({ itemId: entry.id, localVersion: entry.version || 0, remoteVersion });
      }
    });

    // Perform upsert (this will replace entire rows)
    const { error } = await supabase
      .from('media_items')
      .upsert(itemsToUpsert, { onConflict: 'id' });

    if (error) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, backoff));
        return pushBatchToBackend(entries, keepalive, retries - 1, backoff * 2);
      }
      throw error;
    }

    // Log any conflicts to sync_conflicts table
    if (conflicts.length > 0) {
      const conflictRecords = conflicts.map(c => ({
        user_id: userId,
        item_id: c.itemId,
        local_payload: {},
        remote_payload: {},
        detected_at: now,
        resolved_at: null,
        resolution: null,
      }));
      await supabase.from('sync_conflicts').insert(conflictRecords);
    }

    // Build results
    entries.forEach((entry, idx) => {
      results.push({
        id: entry.id,
        status: remoteVersionMap[entry.id] !== undefined ? 'updated' : 'inserted',
        version: (entry.version || 0) + 1,
      });
    });

    return {
      success: true,
      processed: entries.length,
      results,
      serverTime: now,
    };
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoff));
      return pushBatchToBackend(entries, keepalive, retries - 1, backoff * 2);
    }
    return {
      success: false,
      processed: 0,
      results: [],
      serverTime: "",
      error: String(err)
    };
  }
};

/**
 * Fetch entries for a specific user from Supabase (supports Delta Sync via updated_at cursor)
 * Returns items updated after the given timestamp, ordered by updated_at descending.
 */
export const fetchFromBackend = async (
  userId: string,
  since?: string
): Promise<{ data: SyncEntry[], serverTime: string }> => {
  const authenticatedUserId = await getCurrentUserId();
  if (!authenticatedUserId) {
    throw new Error("Not authenticated");
  }

  try {
    const now = new Date().toISOString();
    
    // Parse the cursor (timestamp string or "0")
    let sinceTimestamp = now;
    if (since && since !== "0" && since !== "undefined") {
      try {
        sinceTimestamp = new Date(since).toISOString();
      } catch {
        sinceTimestamp = now;
      }
    }

    // Fetch items updated after the cursor, ordered by updated_at descending
    // Limit to 100 items per request for pagination
    const { data: items, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('user_id', authenticatedUserId)
      .gt('updated_at', sinceTimestamp)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    // Convert Supabase rows back to SyncEntry format
    const syncEntries: SyncEntry[] = (items || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      status: item.status as any,
      title: item.title || undefined,
      type: item.media_type,
      addedAt: item.added_at,
      watchedAt: item.updated_at,
      rating: item.rating || undefined,
      year: item.year || undefined,
      updatedAt: item.updated_at,
      version: item.version,
      payload: JSON.stringify(item.payload || {}),
    }));

    return {
      data: syncEntries,
      serverTime: now,
    };
  } catch (err: unknown) {
    console.error("fetchFromBackend failed", err);
    throw err;
  }
};

/**
 * Map local Watchlist item to Sync Entry.
 * If previousItem is provided, generates a partial payload for bandwidth optimization.
 */
export const mapWatchlistToSync = (item: WatchlistDBItem | WatchlistItem, userId: string, previousItem?: WatchlistDBItem | WatchlistItem): SyncEntry => {
  if (previousItem) {
    const diff = buildPatch(previousItem, item);
    return {
      id: item.id,
      userId,
      status: 'watchlist',
      updatedAt: item.updatedAt || new Date().toISOString(),
      version: item.version || 1,
      payload: JSON.stringify({ id: item.id, ...diff })
    } as SyncEntry;
  }

  const payloadObj = item;
  
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    status: 'watchlist',
    userId: userId,
    rating: item.rating || 0,
    year: item.year || 0,
    addedAt: item.addedAt || Date.now(),
    watchedAt: "",
    progress: 0,
    updatedAt: item.updatedAt || new Date().toISOString(),
    version: item.version || 1,
    payload: JSON.stringify(payloadObj)
  };
};

/**
 * Map local Watched item to Sync Entry.
 * If previousItem is provided, generates a partial payload for bandwidth optimization.
 */
export const mapWatchedToSync = (item: WatchedDBItem | WatchedItem, userId: string, previousItem?: WatchedDBItem | WatchedItem): SyncEntry => {
  if (previousItem) {
    const diff = buildPatch(previousItem, item);
    return {
      id: item.id,
      userId,
      status: 'watched',
      updatedAt: item.updatedAt || new Date().toISOString(),
      version: item.version || 1,
      payload: JSON.stringify({ id: item.id, ...diff })
    } as SyncEntry;
  }

  const payloadObj = item;

  return {
    id: item.id,
    title: item.title,
    type: item.type,
    status: 'watched',
    userId: userId,
    rating: item.rating || 0,
    year: item.year || 0,
    addedAt: item.addedAt || Date.now(),
    watchedAt: item.updatedAt || new Date().toISOString(),
    progress: (item.totalEpisodes > 0 && item.watchedEpisodes > 0) ? Math.min(100, Math.round((item.watchedEpisodes / item.totalEpisodes) * 100)) : 100,
    updatedAt: item.updatedAt || new Date().toISOString(),
    version: item.version || 1,
    payload: JSON.stringify(payloadObj)
  };
};

/**
 * Map Backend Sync Entry back to local DB Item
 */
export const fromSyncEntry = (entry: SyncEntry, userEmail: string): WatchlistDBItem | WatchedDBItem => {
  const base = JSON.parse(entry.payload || '{}');
  return {
    ...base,
    id: entry.id, // Explicit identity from core record
    userEmail,    // Explicit segmentation
    version: entry.version || base.version || 1,
    updatedAt: entry.updatedAt || base.updatedAt || new Date().toISOString()
  } as any;
};

/**
 * Check Supabase connection health
 */
export const checkBackendHealth = async (): Promise<{ success: boolean; message: string }> => {
  try {
    if (!navigator.onLine) return { success: false, message: "Offline" };
    
    // Simple health check: try to get current user
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    // Try a simple query to verify connection
    const { error } = await supabase
      .from('media_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .limit(1);
    
    if (error) {
      return { success: false, message: `Supabase Error: ${error.message}` };
    }

    return { success: true, message: "Supabase Connected" };
  } catch (err) {
    return { success: false, message: "Connection check failed" };
  }
};
