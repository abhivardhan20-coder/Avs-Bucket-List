import Redis from "ioredis";
import { env } from "../lib/env";

// Initialize Redis client
const cache = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export class CacheService {
  /**
   * Get an item from the cache
   */
  static async get<T>(key: string): Promise<T | undefined> {
    const val = await cache.get(key);
    if (!val) return undefined;
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as unknown as T;
    }
  }

  /**
   * Set an item in the cache
   * @param key The cache key
   * @param val The value to cache
   * @param ttl Optional time-to-live in seconds
   */
  static async set<T>(key: string, val: T, ttl?: number): Promise<boolean> {
    const stringVal = typeof val === 'string' ? val : JSON.stringify(val);
    if (ttl !== undefined) {
      await cache.set(key, stringVal, 'EX', ttl);
    } else {
      await cache.set(key, stringVal);
    }
    return true;
  }

  /**
   * Delete an item from the cache
   */
  static async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      if (key.length === 0) return 0;
      return cache.del(...key);
    }
    return cache.del(key);
  }

  /**
   * Clear the entire cache
   */
  static async flushAll(): Promise<void> {
    await cache.flushall();
  }
}
