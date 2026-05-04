
import { useState, useEffect, useRef } from 'react';
import { useLibraryData } from '../contexts/LibraryProvider';
import { MediaItem } from '../types';
import { fetchItemsByIds } from '../services/tmdb';
import { resolveUpcomingContent, UpcomingResolution } from '../lib/dateUtils';
import { db } from '../lib/db';

export interface NotificationItem extends MediaItem {
  library: 'Watchlist' | 'Watched';
  resolution: UpcomingResolution;
}

const NOTIF_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const useNotifications = () => {
  const { watchlist, watched } = useLibraryData();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const lastFetchedAt = useRef<number>(0);
  const cachedNotifs = useRef<MediaItem[]>([]);
  const libraryMapRef = useRef<Map<string, { type: 'Watchlist' | 'Watched', watchedEpisodes: number, totalEpisodes: number }>>(new Map());

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      const now = Date.now();
      
      // Skip re-fetch if data is still fresh
      if (now - lastFetchedAt.current < NOTIF_TTL_MS && cachedNotifs.current.length > 0) {
        // Re-resolve from cached mediaItems — no network needed
        const libraryMap = libraryMapRef.current;
        const resolved: NotificationItem[] = [];

        for (const cachedItem of cachedNotifs.current) {
          const progress = libraryMap.get(cachedItem.id);
          const resolution = resolveUpcomingContent(cachedItem, progress ? {
            type: progress.type,
            watchedEpisodes: progress.watchedEpisodes,
            totalEpisodes: cachedItem.totalEpisodes || progress.totalEpisodes || 0
          } : undefined);

          if (resolution) {
            resolved.push({
              ...cachedItem,
              library: progress?.type || 'Watchlist',
              resolution
            });
          }
        }

        // Sort: Nearest confirmed date first, TBA last
        resolved.sort((a, b) => {
          const dateA = a.resolution.airDate ? a.resolution.airDate.getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.resolution.airDate ? b.resolution.airDate.getTime() : Number.MAX_SAFE_INTEGER;
          return dateA - dateB;
        });

        if (isMounted) {
          setNotifications(resolved);
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const libraryMap = new Map<string, { type: 'Watchlist' | 'Watched', watchedEpisodes: number, totalEpisodes: number }>();

        // 1. Aggregate Tracking Data
        watched.forEach(i => libraryMap.set(i.id, {
          type: 'Watched',
          watchedEpisodes: i.watchedEpisodes,
          totalEpisodes: i.totalEpisodes
        }));

        watchlist.forEach(i => {
          if (!libraryMap.has(i.id)) {
            libraryMap.set(i.id, {
              type: 'Watchlist',
              watchedEpisodes: 0,
              totalEpisodes: 0
            });
          }
        });

        libraryMapRef.current = libraryMap;

        const allTrackedIds = Array.from(libraryMap.keys());
        if (allTrackedIds.length === 0) {
          if (isMounted) {
            setNotifications([]);
            setLoading(false);
          }
          return;
        }

        // Optimization: 
        // 1. Always fetch Watchlist items
        // 2. Fetch Watched items ONLY if they are Series/Anime (to check for new seasons).
        const idsToFetch = allTrackedIds.filter(id => {
          const entry = libraryMap.get(id);
          const isMovie = id.startsWith('movie_');

          if (entry?.type === 'Watchlist') return true;
          if (entry?.type === 'Watched') {
            if (isMovie) return false;
            return true;
          }
          return true;
        });

        // Check cache first — only fetch what's missing
        const cachedItems: MediaItem[] = [];
        const idsToActuallyFetch: string[] = [];
        for (const id of idsToFetch) {
          // For notifications, we want fresh data for series/anime to ensure nextEpisode is current.
          // Skip cache and always fetch fresh data to catch upcoming episodes.
          const isMovie = id.startsWith('movie_');
          if (!isMovie) {
            // Series/Anime: Always fetch fresh to get latest nextEpisode
            idsToActuallyFetch.push(id);
          } else {
            // Movies: Can use cache
            const cached = await db.mediaCache.get(id);
            if (cached) cachedItems.push(cached as MediaItem);
            else idsToActuallyFetch.push(id);
          }
        }
        const freshItems = idsToActuallyFetch.length > 0 
          ? await fetchItemsByIds(idsToActuallyFetch) 
          : [];
        const allItems = [...cachedItems, ...freshItems];

        const resolved: NotificationItem[] = [];

        allItems.forEach(item => {
          const progress = libraryMap.get(item.id);

          // Pass context to resolver
          const resolution = resolveUpcomingContent(item, progress ? {
            type: progress.type,
            watchedEpisodes: progress.watchedEpisodes,
            totalEpisodes: item.totalEpisodes || progress.totalEpisodes || 0
          } : undefined);

          if (resolution) {
            resolved.push({
              ...item,
              library: progress?.type || 'Watchlist',
              resolution
            });
          }
        });

        // Sort: Nearest confirmed date first, TBA last
        resolved.sort((a, b) => {
          const dateA = a.resolution.airDate ? a.resolution.airDate.getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.resolution.airDate ? b.resolution.airDate.getTime() : Number.MAX_SAFE_INTEGER;
          return dateA - dateB;
        });

        lastFetchedAt.current = Date.now();
        cachedNotifs.current = allItems;

        if (isMounted) {
          setNotifications(resolved);
        }
      } catch (err) {
        console.error("Notification sync failed", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const timeout = setTimeout(loadNotifications, 500);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [watchlist.length, watched.length]); // depend on LENGTH not reference

  return { notifications, loading };
};