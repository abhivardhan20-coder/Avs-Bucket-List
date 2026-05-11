import { db } from '../../lib/db';
import { MediaItem, MediaType } from '../../types';
import { fetchDetails } from '../../services/tmdb';
import { fetchOmdbDetails, fetchJikanAnime, fetchKitsuAnime } from '../../services/fallbacks';
import { dedupedFetch } from '../requestDeduplicator';
import { HydrateTmdbToAniList } from '../../utils/animeMapper';
import { parseLocalDate } from '../dateUtils';
import { MEDIA_FRESHNESS_MS, ACTIVE_SHOW_REFRESH_MS } from '../../services/config';

/**
 * Unified Media Fetcher - Simplified 2-Tier Architecture
 * 
 * 1. Primary: TMDB (Comprehensive Metadata & Visuals)
 * 2. Fallback: OMDB (Movies/Series) or Jikan/Kitsu (Anime)
 * 
 * Optimization Layer:
 * - Request Deduplication: Syncs simultaneous requests for the same ID.
 * - Freshness Check: Skips network fetches if cached within 48 hours.
 */
export async function fetchMediaItem(
  appId: string, 
  type: 'movie' | 'tv' | 'anime', 
  isAnime = false,
  signal?: AbortSignal
): Promise<MediaItem | null> {
  return dedupedFetch(`media:${appId}`, async () => {
    const isActuallyAnime = isAnime || type === 'anime' || appId.startsWith('series_') || appId.startsWith('anime_');
    
    try {
      // Phase 0: Freshness Check
      const cached = await db.mediaCache.get(appId);
      const cacheAge = cached?.lastRefreshedAt ? Date.now() - cached.lastRefreshedAt : Infinity;
      const isStaleEnoughToRefresh = cacheAge > ACTIVE_SHOW_REFRESH_MS;
      
      // ✅ NEW: Force refresh for anime that hasn't been hydrated with AniList data yet
      const isAnimeWithoutAniList = (isActuallyAnime || cached?.type === MediaType.Anime) && !cached?.anilistId;
      
      // ✅ NEW: Force refresh for "Returning Series" without nextEpisode (like The Boys during active airings)
      const isReturningWithoutNext = cached?.status === 'Returning Series' && !cached?.nextEpisode;
      
      // ✅ NEW: Force refresh for shows that aired recently (within 7 days) to ensure nextEpisode is current
      let recentlyAired = false;
      if (cached?.lastAirDate) {
        const lastAirDate = parseLocalDate(cached.lastAirDate);
        if (lastAirDate) {
          const daysSinceLastAir = (Date.now() - lastAirDate.getTime()) / (24 * 60 * 60 * 1000);
          recentlyAired = daysSinceLastAir <= 7 && daysSinceLastAir >= 0; // aired in last 7 days
        }
      }
      
      if (
        !isAnimeWithoutAniList && 
        !isReturningWithoutNext && 
        !(recentlyAired && isStaleEnoughToRefresh) && 
        cached?.lastRefreshedAt && 
        cacheAge < MEDIA_FRESHNESS_MS
      ) {
        if (import.meta.env.DEV) {
          console.debug(`[mediaFetcher] Local cache is fresh for ${appId}`);
        }
        return cached as MediaItem;
      }

      // Phase 1: Try Primary Source (TMDB)
      const tmdbData = await fetchDetails(appId, signal);
      if (tmdbData) {
        let finalItem = { 
          ...tmdbData, 
          dataSource: tmdbData.dataSource || 'tmdb',
          id: appId 
        } as MediaItem;

        // ✅ NEW: Hybrid Hydration for Anime (TMDB + AniList)
        if (isActuallyAnime || finalItem.type === MediaType.Anime) {
          finalItem = await HydrateTmdbToAniList(finalItem);
        }
        
        await db.mediaCache.put({ ...finalItem, lastRefreshedAt: Date.now() });
        return finalItem;
      }

      // Phase 2: Fallback (If TMDB is rate-limited or fails)
      if (import.meta.env.DEV) {
        console.info(`[mediaFetcher] TMDB failed for ${appId}. Attempting fallback...`);
      }
      
      const fallbackTitle = cached?.title || appId.split('_')[1]; 
      const fallbackYear = cached?.year;

      if (isActuallyAnime) {
        // ANIME FALLBACK: Jikan (MAL) -> Kitsu
        const jikan = await fetchJikanAnime(fallbackTitle, cached?.malId);
        if (jikan) {
          const result = { ...(cached || {}), ...jikan, id: appId, dataSource: 'jikan' } as MediaItem;
          await db.mediaCache.put({ ...result, lastRefreshedAt: Date.now() });
          return result;
        }

        const kitsu = await fetchKitsuAnime(fallbackTitle);
        if (kitsu) {
          const result = { ...(cached || {}), ...kitsu, id: appId, dataSource: 'kitsu' } as MediaItem;
          await db.mediaCache.put({ ...result, lastRefreshedAt: Date.now() });
          return result;
        }
      } else {
        // MOVIE/SERIES FALLBACK: OMDB
        const omdb = await fetchOmdbDetails(fallbackTitle, fallbackYear, cached?.imdbId);
        if (omdb) {
          const result = { ...(cached || {}), ...omdb, id: appId, dataSource: 'omdb' } as MediaItem;
          await db.mediaCache.put({ ...result, lastRefreshedAt: Date.now() });
          return result;
        }
      }

      // Phase 3: "Absolute Failure" Safety Net
      if (cached) {
        return {
          ...cached,
          overview: cached.overview || "No description available for this title.",
          genres: cached.genres && cached.genres.length > 0 ? cached.genres : ["Genre information unavailable"],
          cast: cached.cast && cached.cast.length > 0 ? cached.cast : ["Cast information unavailable"],
          dataSource: cached.dataSource || 'local_cache'
        } as MediaItem;
      }

      return null;

    } catch (error) {
      console.error(`[mediaFetcher] Fatal error for ${appId}:`, error);
      return null;
    }
  });
}
