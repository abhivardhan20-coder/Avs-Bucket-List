import { db } from '../lib/db';

const CACHE_LIMIT = 300;
const STALE_TTL = 24 * 60 * 60 * 1000; // 24 Hours
const EXPIRED_TTL = 7 * 24 * 60 * 60 * 1000; // 7 Days

export enum CacheState {
  FRESH = 'fresh',
  STALE = 'stale',
  EXPIRED = 'expired',
  MISS = 'miss'
}

/**
 * Determine the health of a cached media item
 */
export const getCacheState = (lastRefreshedAt?: number): CacheState => {
  if (!lastRefreshedAt) return CacheState.MISS;
  
  const age = Date.now() - lastRefreshedAt;
  if (age > EXPIRED_TTL) return CacheState.EXPIRED;
  if (age > STALE_TTL) return CacheState.STALE;
  return CacheState.FRESH;
};

/**
 * Deterministic LRU Eviction: Enforces the cache limit by removing least recently used items.
 * Uses heavy-weight Dexie indexing for high performance.
 */
export const enforceCacheLimit = async (limit: number = CACHE_LIMIT) => {
  try {
    const count = await db.mediaCache.count();
    
    if (count > limit) {
      const overflow = count - limit;
      console.log(`[CacheManager] Evicting ${overflow} items (LRU) to maintain limit of ${limit}`);
      
      // OPTIMIZED: Fetch only keys to be deleted, avoiding full record loads
      const oldestKeys = await db.mediaCache
        .orderBy('lastAccessedAt')
        .limit(overflow)
        .primaryKeys();
        
      await db.mediaCache.bulkDelete(oldestKeys);
    }
  } catch (err) {
    console.error("[CacheManager] Cache enforcement failed", err);
  }
};

/**
 * Non-blocking wrapper for cache enforcement.
 * Schedules cleanup during idle time or short delay to keep UI snappy.
 */
export const enforceCacheLimitAsync = (limit?: number) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => enforceCacheLimit(limit), { timeout: 2000 });
  } else {
    setTimeout(() => enforceCacheLimit(limit), 100);
  }
};

/**
 * Record a cache hit and update lastAccessedAt for LRU
 */
export const touchCache = async (id: string) => {
  try {
    await db.mediaCache.update(id, { lastAccessedAt: Date.now() });
  } catch {
    // Silent fail for touch (non-critical)
  }
};
