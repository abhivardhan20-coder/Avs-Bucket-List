'use client';


import { useState, useEffect, useRef, useMemo } from 'react';
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

  const serializedWatchlist = useMemo(() => JSON.stringify(watchlist.map(w => ({ id: w.id }))), [watchlist]);
  const serializedWatched = useMemo(() => JSON.stringify(watched.map(w => ({ id: w.id, watchedEpisodes: w.watchedEpisodes, totalEpisodes: w.totalEpisodes }))), [watched]);
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
          const resolution = resolveUpcomingContent(cachedItem);

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

        const currentWatchlist = JSON.parse(serializedWatchlist) as { id: string }[];
        const currentWatched = JSON.parse(serializedWatched) as { id: string, watchedEpisodes: number, totalEpisodes: number }[];

        // 1. Aggregate Tracking Data
        currentWatched.forEach(i => libraryMap.set(i.id, {
          type: 'Watched',
          watchedEpisodes: i.watchedEpisodes,
          totalEpisodes: i.totalEpisodes
        }));

        currentWatchlist.forEach(i => {
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

        // Check cache first — only fetch what's missing or stale
        const cachedItems: MediaItem[] = [];
        const idsToActuallyFetch: string[] = [];
        for (const id of idsToFetch) {
          const cached = await db.mediaCache.get(id);
          const isMovie = id.startsWith('movie_');

          if (cached) {
            const cacheAge = Date.now() - (cached.lastRefreshedAt || 0);
            // Movies can use 48 hours cached data, series/anime check within 12 hours freshness
            const isFresh = isMovie 
              ? cacheAge < 48 * 60 * 60 * 1000 
              : cacheAge < 12 * 60 * 60 * 1000;

            if (isFresh) {
              cachedItems.push(cached as MediaItem);
              continue;
            }
          }
          idsToActuallyFetch.push(id);
        }
        
        const freshItems = idsToActuallyFetch.length > 0 
          ? await fetchItemsByIds(idsToActuallyFetch) 
          : [];

        if (freshItems.length > 0) {
          // Cache the newly fetched items so subsequent loads are extremely fast
          await db.mediaCache.bulkPut(freshItems.map(item => ({
            ...item,
            lastRefreshedAt: Date.now()
          })));
        }

        const allItems = [...cachedItems, ...freshItems];

        const resolved: NotificationItem[] = [];

        allItems.forEach(item => {
          const progress = libraryMap.get(item.id);

          // Pass context to resolver
          const resolution = resolveUpcomingContent(item);

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
  }, [serializedWatchlist, serializedWatched]);

  return { notifications, loading };
};
