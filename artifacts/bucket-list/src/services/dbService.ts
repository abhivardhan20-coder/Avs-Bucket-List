import { db } from '../lib/db';
import { MediaItem } from '../types';

/**
 * Service for interacting with the Dexie local database.
 * Abstracts direct db calls to provide a clean interface for UI components and hooks.
 */
export const dbService = {
  /**
   * Puts a single media item into the cache.
   */
  async cacheMediaItem(item: MediaItem): Promise<void> {
    try {
      await db.mediaCache.put(item);
    } catch (error) {
      console.error('Failed to cache media item', error);
    }
  },

  /**
   * Retrieves a cached media item by ID.
   */
  async getCachedItem(id: string): Promise<MediaItem | undefined> {
    try {
      return await db.mediaCache.get(id);
    } catch (error) {
      console.error('Failed to get cached media item', error);
      return undefined;
    }
  },

  /**
   * Clears the entire media cache.
   */
  async clearCache(): Promise<void> {
    try {
      await db.mediaCache.clear();
    } catch (error) {
      console.error('Failed to clear media cache', error);
    }
  }
};
