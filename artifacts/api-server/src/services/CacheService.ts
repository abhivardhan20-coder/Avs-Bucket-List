import NodeCache from "node-cache";

// Initialize cache with default TTL of 1 hour and check period of 2 hours
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 7200 });

export class CacheService {
  /**
   * Get an item from the cache
   */
  static get<T>(key: string): T | undefined {
    return cache.get<T>(key);
  }

  /**
   * Set an item in the cache
   * @param key The cache key
   * @param val The value to cache
   * @param ttl Optional time-to-live in seconds
   */
  static set<T>(key: string, val: T, ttl?: number): boolean {
    if (ttl !== undefined) {
      return cache.set(key, val, ttl);
    }
    return cache.set(key, val);
  }

  /**
   * Delete an item from the cache
   */
  static del(key: string | string[]): number {
    return cache.del(key);
  }

  /**
   * Clear the entire cache
   */
  static flushAll(): void {
    cache.flushAll();
  }
}
