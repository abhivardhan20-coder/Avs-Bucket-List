/**
 * TMDB Response Cache (In-Memory with TTL)
 * =========================================
 * Lightweight cache layer for non-user-specific TMDB API responses.
 * Prevents redundant API calls for trending, genres, person credits, etc.
 * 
 * Design decisions:
 * - In-memory Map for sub-ms lookups (no IndexedDB overhead for hot paths)
 * - TTL-based expiry per entry (default: 10 minutes for trending, 1 hour for details)
 * - Max size cap with LRU-style eviction to prevent memory bloat
 * - Separate from Dexie `mediaCache` which handles long-term persistence
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  accessedAt: number;
}

const MAX_CACHE_SIZE = 500;

/** Default TTLs in milliseconds */
export const CACHE_TTL = {
  /** Trending / discover lists — refresh every 10 minutes */
  TRENDING: 10 * 60 * 1000,
  /** Top rated / genre lists — refresh every 30 minutes */
  CURATED: 30 * 60 * 1000,
  /** Individual item details — refresh every 1 hour */
  DETAILS: 60 * 60 * 1000,
  /** Search results — short-lived, 5 minutes */
  SEARCH: 5 * 60 * 1000,
  /** Person credits — refresh every 1 hour */
  CREDITS: 60 * 60 * 1000,
  /** Season/episode details — refresh every 30 minutes */
  SEASON: 30 * 60 * 1000,
  /** Trailer keys — refresh every 1 hour */
  TRAILER: 60 * 60 * 1000,
} as const;

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get a cached response if it exists and hasn't expired.
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  // Update access time for LRU tracking
  entry.accessedAt = Date.now();
  return entry.data as T;
}

/**
 * Store a response in the cache with a TTL.
 */
export function setCached<T>(key: string, data: T, ttlMs: number): void {
  // Evict oldest entries if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    evictOldest(Math.ceil(MAX_CACHE_SIZE * 0.2)); // Remove 20%
  }

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    accessedAt: Date.now(),
  });
}

/**
 * Determine the appropriate TTL for a given TMDB endpoint.
 */
export function getTtlForEndpoint(endpoint: string): number {
  // Trending and discover endpoints
  if (endpoint.includes('/trending/') || endpoint.includes('/discover/')) {
    return CACHE_TTL.TRENDING;
  }
  // Top rated, upcoming, on the air
  if (endpoint.includes('/top_rated') || endpoint.includes('/upcoming') || endpoint.includes('/on_the_air')) {
    return CACHE_TTL.CURATED;
  }
  // Search
  if (endpoint.includes('/search/')) {
    return CACHE_TTL.SEARCH;
  }
  // Season details
  if (/\/tv\/\d+\/season\/\d+/.test(endpoint)) {
    return CACHE_TTL.SEASON;
  }
  // Video/trailer endpoints
  if (endpoint.includes('/videos')) {
    return CACHE_TTL.TRAILER;
  }
  // Person credits
  if (endpoint.includes('/person/') || endpoint.includes('/combined_credits')) {
    return CACHE_TTL.CREDITS;
  }
  // Individual details (movie/tv by ID)
  if (/^\/(movie|tv)\/\d+/.test(endpoint)) {
    return CACHE_TTL.DETAILS;
  }
  // Default: 10 minutes
  return CACHE_TTL.TRENDING;
}

/**
 * Evict the N least-recently-accessed entries.
 */
function evictOldest(count: number): void {
  const entries = Array.from(cache.entries())
    .sort((a, b) => a[1].accessedAt - b[1].accessedAt);

  for (let i = 0; i < Math.min(count, entries.length); i++) {
    cache.delete(entries[i][0]);
  }
}

/**
 * Clear expired entries. Call periodically if needed.
 */
export function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire cache (useful on logout or data reset).
 */
export function clearTmdbCache(): void {
  cache.clear();
}

/**
 * Get cache statistics for debugging.
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return { size: cache.size, maxSize: MAX_CACHE_SIZE };
}
