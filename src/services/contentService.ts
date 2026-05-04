import { db } from '../lib/db';
import * as tmdb from './tmdb';
import { fetchMediaItem } from '@/lib/api/mediaFetcher';
import { MediaItem, MediaType } from '@/types';

import { MEDIA_FRESHNESS_MS } from './config';

/**
 * Service to manage content fetching with local caching (Dexie)
 * Optimized for logic-first retrieval and selective hydration.
 */
export const ContentService = {
  /**
   * Get item details, checking cache and staleness.
   */
  async getDetails(appId: string): Promise<MediaItem | null> {
    const cached = await db.mediaCache.get(appId);
    
    const isStale = (cached: MediaItem | null) => {
      if (!cached) return true;
      if (!cached.runtime || (cached.type !== MediaType.Movie && !cached.seasons)) return true;
      if (!cached.lastRefreshedAt) return true;
      return (Date.now() - cached.lastRefreshedAt) > MEDIA_FRESHNESS_MS;
    };

    if (cached && !isStale(cached)) {
      return cached;
    }

    // Fetch fresh from Unified Fallback Chain
    try {
      const itemType = cached?.type || (appId.startsWith('movie') ? MediaType.Movie : MediaType.Series);
      const details = await fetchMediaItem(appId, itemType === MediaType.Movie ? 'movie' : 'tv', itemType === MediaType.Anime);
      if (!details) return cached || null;

      const fullItem = { 
        ...(cached || {}), 
        ...details, 
        lastRefreshedAt: Date.now() 
      } as MediaItem;
      
      await db.mediaCache.put(fullItem);
      return fullItem;
    } catch (e) {
      console.warn("Details fetch failed, using cached if available", e);
      return cached || null;
    }
  },

  /**
   * Search content with proactive caching of basic metadata.
   */
  async search(query: string, type: 'movie' | 'tv' | 'anime' = 'movie', page: number = 1): Promise<MediaItem[]> {
    let results: MediaItem[] = [];
    if (type === 'anime') {
      results = await tmdb.searchAnime(query, page);
    } else {
      results = await tmdb.searchTmdb(query, type as 'movie' | 'tv', page);
    }

    if (results.length > 0) {
      // Merge with existing cache if any, but search results are basic
      await db.mediaCache.bulkPut(results.map(r => ({ ...r, lastRefreshedAt: Date.now() })));
    }

    return results;
  },

  /**
   * Get trending content.
   */
  async getTrending(type: MediaType, page: number = 1): Promise<MediaItem[]> {
    let trending: MediaItem[] = [];
    switch (type) {
      case MediaType.Movie:
        trending = await tmdb.fetchTrendingMovies(page);
        break;
      case MediaType.Series:
        trending = await tmdb.fetchTrendingSeries(page);
        break;
      case MediaType.Anime:
        trending = await tmdb.fetchTrendingAnime(page);
        break;
      default:
        return [];
    }

    if (trending.length > 0) {
      await db.mediaCache.bulkPut(trending.map(i => ({ ...i, lastRefreshedAt: Date.now() })));
    }

    return trending;
  },

  /**
   * Batch retrieval by IDs, optimizing cache hits.
   */
  async getItemsByIds(ids: string[]): Promise<MediaItem[]> {
    const cached = await db.mediaCache.where('id').anyOf(ids).toArray();
    const cachedMap = new Map(cached.map(i => [i.id, i]));
    const missingIds = ids.filter(id => !cachedMap.has(id));

    if (missingIds.length === 0) return cached;

    // Fetch missing from TMDB
    const fetched = await tmdb.fetchItemsByIds(missingIds);
    if (fetched.length > 0) {
      await db.mediaCache.bulkPut(fetched.map(f => ({ ...f, lastRefreshedAt: Date.now() })));
    }

    return ids.map(id => cachedMap.get(id) || fetched.find(f => f.id === id)).filter(Boolean) as MediaItem[];
  }
};