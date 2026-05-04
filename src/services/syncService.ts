import { WatchlistItem, WatchedItem } from '@/types';
import { WatchlistDBItem, WatchedDBItem } from '@/lib/db';

const GAS_URL = import.meta.env.VITE_GAS_URL;
const GAS_SECRET = import.meta.env.VITE_GAS_SECRET;

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
 * Remove entry from Backend
 */
export const removeFromBackend = async (id: string, userId: string, keepalive: boolean = false): Promise<boolean> => {
  if (!GAS_URL) return false;
  try {
    const result = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'push', token: GAS_SECRET, items: [{ id, userId, action: 'delete' }] }),
      headers: { 'Content-Type': 'application/json' },
      keepalive
    });
    if (!result.ok) return false;
    const json = await result.json();
    return json.success;
  } catch {
    return false;
  }
};

/**
 * Post multiple entries to Backend (Batch Insert or Update)
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

  if (!GAS_URL) {
    return { success: false, processed: 0, results: [], serverTime: "", error: "Missing GAS_URL config" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'push', token: GAS_SECRET, items: entries }),
      headers: { 'Content-Type': 'application/json' },
      keepalive,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok && response.status >= 500 && retries > 0) {
      await new Promise(r => setTimeout(r, backoff));
      return pushBatchToBackend(entries, keepalive, retries - 1, backoff * 2);
    }
    
    if (!response.ok) {
      throw new Error(`GAS Error (${response.status})`);
    }
    
    const result = await response.json();
    
    // Classify GAS errors: lock/timeout are retriable (503), others are permanent
    if (result.success === false || result.error) {
      const msg = result.error || 'Unknown GAS error';
      const isRetriable = /lock|timeout|deadline/i.test(msg);
      throw new Error(isRetriable ? `503: ${msg}` : msg);
    }
    return result;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
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
 * Fetch entries for a specific user (supports Delta Sync in a single batch)
 */
export const fetchFromBackend = async (
  userId: string,
  since?: string
): Promise<{ data: SyncEntry[], serverTime: string }> => {
  if (!GAS_URL) throw new Error("Missing GAS_URL config");

  const parsedSince = (!since || since === "0" || since === "undefined") ? "0" : since;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(GAS_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'pull', token: GAS_SECRET, userId, since: parsedSince }),
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`GAS Error (${response.status})`);
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    
    return { data: result.data || [], serverTime: result.serverTime || "" };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
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
export const checkBackendHealth = async (): Promise<{ success: boolean; message: string }> => {
  try {
    if (!GAS_URL) return { success: false, message: "No GAS URL" };
    if (!navigator.onLine) return { success: false, message: "Offline" };
    
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'ping', token: GAS_SECRET }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) return { success: false, message: `GAS Error (${response.status})` };
    const result = await response.json();
    if (result.error) return { success: false, message: result.error };
    
    return { success: true, message: "GAS Connected" };
  } catch {
    return { success: false, message: "Offline" };
  }
};
