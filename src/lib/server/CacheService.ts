import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

// Initialize Redis client
const cache = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1, // Do not retry infinitely if redis is down
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
});

const memoryCache = new Map<string, { value: any, expiresAt: number | null }>();

export class CacheService {
  /**
   * Get an item from the cache
   */
  static async get<T>(key: string): Promise<T | undefined> {
    try {
      const val = await cache.get(key);
      if (!val) {
        return CacheService.getMemory<T>(key);
      }
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as unknown as T;
      }
    } catch (error) {
      logger.warn({ err: error, key }, "Redis get failed, falling back to in-memory cache");
      return CacheService.getMemory<T>(key);
    }
  }

  private static getMemory<T>(key: string): T | undefined {
    const item = memoryCache.get(key);
    if (!item) return undefined;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      memoryCache.delete(key);
      return undefined;
    }
    return item.value as T;
  }

  /**
   * Set an item in the cache
   * @param key The cache key
   * @param val The value to cache
   * @param ttl Optional time-to-live in seconds
   */
  static async set<T>(key: string, val: T, ttl?: number): Promise<boolean> {
    try {
      const stringVal = typeof val === 'string' ? val : JSON.stringify(val);
      if (ttl !== undefined) {
        await cache.set(key, stringVal, 'EX', ttl);
      } else {
        await cache.set(key, stringVal);
      }
      return true;
    } catch (error) {
      logger.warn({ err: error, key }, "Redis set failed, saving to in-memory cache");
      const expiresAt = ttl !== undefined ? Date.now() + ttl * 1000 : null;
      memoryCache.set(key, { value: val, expiresAt });
      return false;
    }
  }

  /**
   * Delete an item from the cache
   */
  static async del(key: string | string[]): Promise<number> {
    try {
      if (Array.isArray(key)) {
        if (key.length === 0) return 0;
        return await cache.del(...key);
      }
      return await cache.del(key);
    } catch (error) {
      logger.warn({ err: error, key }, "Redis del failed, clearing in-memory cache");
      if (Array.isArray(key)) {
        key.forEach(k => memoryCache.delete(k));
      } else {
        memoryCache.delete(key);
      }
      return 0;
    }
  }

  /**
   * Clear the entire cache
   */
  static async flushAll(): Promise<void> {
    try {
      await cache.flushall();
    } catch (error) {
      logger.warn({ err: error }, "Redis flushall failed, clearing in-memory cache");
    } finally {
      memoryCache.clear();
    }
  }
}
