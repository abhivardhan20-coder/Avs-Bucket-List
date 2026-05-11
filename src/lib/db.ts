import Dexie, { Table } from 'dexie';
import { MediaItem, MediaType, NextEpisodeInfo } from '@/types';


export interface WatchlistDBItem {
  id: string; // appId like movie_123
  userEmail: string; // Segmentation key
  type: MediaType;
  title: string;
  poster: string;
  addedAt: number;
  updatedAt: string;
  version: number;
  watchlistEpisodeIds: string[];
  watchlistSeasonIds: string[];
  nextEpisode?: NextEpisodeInfo;
  releaseDate?: string;
  rating: number;
  year: number;
  genres: string[];
  totalEpisodes: number;
  status?: string;
  lastAirDate?: string;
}

export interface WatchedDBItem {
  id: string;
  userEmail: string; // Segmentation key
  type: MediaType;
  title: string;
  poster: string;
  backdrop: string;
  genres: string[];
  cast: string[];
  director?: string;
  year: number;
  watchedRuntime: number;
  watchedEpisodes: number;
  watchedEpisodeIds: string[];
  totalEpisodes: number;
  addedAt: number;
  updatedAt: string;
  version: number;
  nextEpisode?: NextEpisodeInfo;
  releaseDate?: string;
  rating: number;
  status?: string;
  lastAirDate?: string;
}

export interface SyncEntrySnapshot {
  id: string;
  userId: string;
  status: string;
  rating: number;
  version: number;
  updatedAt: string;
  addedAt?: string | number;
  payload?: string;
  title?: string;
}

export interface ConflictRecord {
  id: string; // appId
  userEmail: string;
  title: string;
  localSnapshot: SyncEntrySnapshot;
  cloudSnapshot: SyncEntrySnapshot;
  resolved: boolean | number;
  resolvedWith?: 'local' | 'cloud';
  resolvedAt?: string;
  itemId: string; // The appId
}



export interface SyncTask {
  id: string; // userEmail+appId
  userEmail: string;
  appId: string;
  type: 'metadata' | 'cloud_push';
  priority: number;
  reasons: string[]; // Aggregated reasons
  addedAt: number;
  updatedAt: number;
  retries: number;
  nextRetryAt: number;
  status: 'pending' | 'processing' | 'failed';
  lastAttemptAt?: number;
  errorType?: string;
  lastError?: string;
  data?: Record<string, unknown> | null; // Payload for cloud_push or extra context
}

/**
 * AVBucketListDB - Production Edition
 * Implements user-level segmentation and composite indexing.
 */
export class AppDatabase extends Dexie {
  watchlist!: Table<WatchlistDBItem, [string, string]>;
  watched!: Table<WatchedDBItem, [string, string]>;
  mediaCache!: Table<MediaItem & { lastRefreshedAt?: number }, string>;
  syncQueue!: Table<SyncTask, string>;
  conflicts!: Table<ConflictRecord, [string, string]>;
  logs!: Table<LogEntry, number>;

  constructor() {
    super('AVBucketList_v2');
    
    this.on('blocked', () => {
      alert('Database upgrade is blocked by another tab. Please close other tabs of this app to continue.');
    });

    this.version(1).stores({
      watchlist: '[userEmail+id], userEmail, type, addedAt, updatedAt, rating, year',
      watched: '[userEmail+id], userEmail, type, updatedAt, rating',
      mediaCache: 'id, type, year, lastRefreshedAt, lastAccessedAt, dataSource',
      syncQueue: 'id, userEmail, appId, type, priority, status, nextRetryAt, [status+nextRetryAt]'
    });

    // Versions 2-11 consolidated: schema evolved during prototyping,
    // baseline for production migrations starts at v12
    this.version(12).stores({
      mediaCache: 'id, type, year, lastRefreshedAt, lastAccessedAt, dataSource, anilistId'
    });



    this.version(14).stores({
      logs: '++id, time, level, context'
    });

    // ✅ v15: Add compound index for efficient cache eviction by type+lastRefreshedAt
    this.version(15).stores({
      mediaCache: 'id, type, year, lastRefreshedAt, lastAccessedAt, dataSource, anilistId, [type+lastRefreshedAt]'
    });

    // v16: Add conflicts table
    this.version(16).stores({
      conflicts: '[userEmail+id], userEmail, status'
    });
  }
}

export interface LogEntry {
  id?: number;
  msg: string;
  level: 'info' | 'warn' | 'error' | 'success';
  context?: string;
  time: number;
}

export const db = new AppDatabase();

/**
 * Evict stale media cache entries using compound index.
 * Runs once per session using a sessionStorage guard.
 */
export const MOVIE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;  // 30 days
export const SERIES_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days

export async function evictStaleMediaCache(): Promise<void> {
  const already = sessionStorage.getItem('cache_evicted');
  if (already) return;
  try {
    const movieCutoff = Date.now() - MOVIE_CACHE_MAX_AGE_MS;
    const seriesCutoff = Date.now() - SERIES_CACHE_MAX_AGE_MS;

    // ✅ Use compound indexed queries — no in-memory .filter() needed
    // Movies: 30-day TTL
    await db.mediaCache
      .where('[type+lastRefreshedAt]')
      .below([MediaType.Movie, movieCutoff])
      .delete();

    // Series: 7-day TTL
    await db.mediaCache
      .where('[type+lastRefreshedAt]')
      .below([MediaType.Series, seriesCutoff])
      .delete();

    // Anime: split by episode count (using TTL rules above)
    // Anime films (≤1 episode): 30-day TTL
    await db.mediaCache
      .where('[type+lastRefreshedAt]')
      .below([MediaType.Anime, movieCutoff])
      .filter(i => (i.totalEpisodes ?? 0) <= 1)
      .delete();

    // Anime series (>1 episode): 7-day TTL
    await db.mediaCache
      .where('[type+lastRefreshedAt]')
      .below([MediaType.Anime, seriesCutoff])
      .filter(i => (i.totalEpisodes ?? 0) > 1)
      .delete();
  } catch (e) {
    console.warn('[CacheEviction] Failed — compound index may need adding to schema', e);
  }
  sessionStorage.setItem('cache_evicted', '1');
}

/**
 * Evict old log entries.
 * Removes logs older than 7 days and keeps max 1000 most recent entries.
 * Runs once per session using a sessionStorage guard.
 */
export async function evictOldLogs(): Promise<void> {
  const already = sessionStorage.getItem('logs_evicted');
  if (already) return;
  try {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    await db.logs.where('time').below(cutoff).delete();
    
    // Keep only last 1000 entries
    const count = await db.logs.count();
    if (count > 1000) {
      const oldest = await db.logs.orderBy('time').limit(count - 1000).primaryKeys();
      await db.logs.bulkDelete(oldest as number[]);
    }
  } catch (e) {
    console.warn('[LogEviction] Failed', e);
  }
  sessionStorage.setItem('logs_evicted', '1');
}