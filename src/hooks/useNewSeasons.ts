import { useMemo, useEffect, useRef } from 'react';
import { WatchedItem, MediaItem, MediaType } from '../types';
import { useSync } from '../contexts/AppContext';
import { calculateShowActivity, ActivityResult } from '../utils/showActivity';

/**
 * Intelligent "New Seasons" hook with tight 7-day window.
 * Detects hiatus, season premieres, and weights recent user activity.
 */
export function useNewSeasons(watched: WatchedItem[], mediaCache: Record<string, MediaItem>) {
  // Single useApp() call — destructure everything needed
  const { enqueueSyncTask } = useSync();

  const processedItems = useMemo(() => {
    const list = watched
      .filter(w => w.type === MediaType.Series || w.type === MediaType.Anime)
      .map(w => {
        const media = mediaCache[w.id];
        if (!media) return null;

        try {
          const activity = calculateShowActivity(media, w);
          if (!activity.isActive) return null;

          // ✅ NEW: Remove from New Seasons if no future episodes AND all episodes watched
          const hasNoFutureEpisodes = !media.nextEpisode;
          const allEpisodesWatched = media.totalEpisodes > 0 && w.watchedEpisodes >= media.totalEpisodes;
          
          if (hasNoFutureEpisodes && allEpisodesWatched) {
            return null; // Filter out: no upcoming episodes and all watched
          }

          // Augment with activity metadata
          return {
            ...media,
            activityLabel: activity.label,
            activityScore: activity.score,
            seasonProgress: activity.currentSeasonProgress,
            progress: (media.totalEpisodes || 1) > 0 ? (w.watchedEpisodes / (media.totalEpisodes || 1)) * 100 : 100
          };
        } catch (e) {
          console.warn(`Activity calculation failed for ${w.title}`, e);
          return null;
        }
      })
      .filter((item): item is MediaItem & { activityLabel: NonNullable<MediaItem['activityLabel']>; activityScore: number; seasonProgress: number; progress: number } => item !== null);

    // Sort by weighted activity score (momentum + recency)
    return list.sort((a, b) => b.activityScore - a.activityScore);
  }, [watched, mediaCache]);

  const mediaCacheRef = useRef(mediaCache);
  useEffect(() => {
    mediaCacheRef.current = mediaCache;
  }, [mediaCache]);

  /**
   * PROACTIVE HYDRATION & Adaptive Staleness Detection
   */
  useEffect(() => {
    if (!watched.length) return;

    const timer = setTimeout(() => {
      const now = Date.now();
      const STALE_THRESHOLD = 1000 * 60 * 60 * 24 * 3; // 3 days
      
      watched
        .filter(w => w.type === MediaType.Series || w.type === MediaType.Anime)
        .sort((a, b) => {
          const cachedA = mediaCacheRef.current[a.id]?.lastRefreshedAt || 0;
          const cachedB = mediaCacheRef.current[b.id]?.lastRefreshedAt || 0;
          return cachedA - cachedB;
        })
        .slice(0, 20)
        .forEach(w => {
          const cached = mediaCacheRef.current[w.id];
          
          // 1. Missing Metadata or AniList info: Hydrate immediately
          const missingEpisodes = !cached?.seasons || cached.seasons.some(s => !s.episodes);
          const missingAniList = (w.type === MediaType.Anime) && !cached?.anilistId;

          if (!cached || missingEpisodes || missingAniList) {
            enqueueSyncTask(w.id, 'metadata', 2);
            return;
          }

          // 1b. Returning Series without nextEpisode: high-priority refresh
          //     This catches shows like The Boys that are actively airing but
          //     whose nextEpisode cache is stale/missing.
          const isReturning = cached.status === 'Returning Series';
          const missingNext = !cached.nextEpisode;
          if (isReturning && missingNext) {
            enqueueSyncTask(w.id, 'metadata', 2);
            return;
          }

          // 2. Staleness: If the metadata is old, refresh it
          const lastRefreshed = cached.lastRefreshedAt || 0;
          const isCurrentlyActive = processedItems.some(i => i.id === w.id);
          const threshold = isCurrentlyActive ? (1000 * 60 * 60 * 12) : STALE_THRESHOLD; // 12h for active shows

          if (now - lastRefreshed > threshold) {
            enqueueSyncTask(w.id, 'metadata', isCurrentlyActive ? 2 : 1);
          }
        });
    }, 1000); // 1s throttle

    return () => clearTimeout(timer);
  }, [watched, enqueueSyncTask, processedItems]);

  return processedItems;
}