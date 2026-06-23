'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppDatabase } from '../../lib/db';
import { MediaItem, MediaType, Season, Episode, ActionResponse, WatchedItem, WatchlistItem } from '../../types';
import { useAuth } from '../AuthProvider';
import { useToast } from '../ToastProvider';
import { calculateShowActivity } from '../../utils/showActivity';
import { getUpNextForSeries, UpNextItem } from '../../utils/upNext';
import {
  toWatchedItem,
  fromWatchedItem,
  watchedItemToRow
} from '../../utils/dbMappers';
import {
  upsertMediaItemInSupabase,
  deleteMediaItemFromSupabase
} from '../../services/syncService';

export function useWatchedSlice(db: AppDatabase, watchlistMap: Map<string, WatchlistItem>) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isDemo = user?.isDemo || user?.id === 'demo_preview_account_001';

  // React Query fetch for Watched (Loads exclusively from Dexie)
  const { data: watchedData, isLoading: wdLoading } = useQuery<WatchedItem[]>({
    queryKey: ['watched', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const items = await db.watched.where('userEmail').equals(user.email).toArray();
      return items.map(toWatchedItem);
    },
    enabled: !!user,
    staleTime: Infinity, // Rely on queryClient.invalidateQueries
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
  // Stabilize reference: `= []` in destructuring creates a new array every render
  // when data is undefined (query disabled), causing useEffect dep loops.
  const watched = useMemo(() => watchedData ?? [], [watchedData]);

  const [continueWatching, setContinueWatching] = useState<WatchedItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const candidates = watched.filter(
        w => w.type === MediaType.Series || w.type === MediaType.Anime
      );
      const cachedItems = await db.mediaCache
        .where('id').anyOf(candidates.map(c => c.id)).toArray();
      const cacheMap = new Map(cachedItems.map(c => [c.id, c]));
      const result = candidates.reduce<WatchedItem[]>((acc, w) => {
        const media = cacheMap.get(w.id);
        if (!media) return acc;
        if (calculateShowActivity(media, w).isActive) {
          acc.push({
            ...w,
            posterUrl: w.posterUrl || media.posterUrl || '',
            backdrop: w.backdrop || media.backdropUrl || '',
            overview: (w as any).overview || media.overview || ''
          } as WatchedItem);
        }
        return acc;
      }, []);
      setContinueWatching(result);
    };
    load();
  }, [watched, db]);

  // Load upNextItems (dependent on watched list details from Cache)
  const [upNextItems, setUpNextItems] = useState<UpNextItem[]>([]);
  useEffect(() => {
    const loadUpNext = async () => {
      if (!user || !watched.length) {
        setUpNextItems([]);
        return;
      }
      const candidates = watched.filter(w =>
        (w.type === MediaType.Series || w.type === MediaType.Anime) &&
        w.watchedEpisodes < (w.totalEpisodes || 1)
      );
      if (candidates.length === 0) {
        setUpNextItems([]);
        return;
      }
      const ids = candidates.map(w => w.id);
      const cachedItems = await db.mediaCache.where('id').anyOf(ids).toArray();
      const cacheMap = new Map(cachedItems.map(c => [c.id, c]));
      const results: UpNextItem[] = [];
      for (const w of candidates) {
        const cached = cacheMap.get(w.id);
        if (cached?.seasons?.length) {
          const next = getUpNextForSeries(w, cached);
          if (next) results.push(next);
        }
      }
      setUpNextItems(results.slice(0, 20));
    };
    loadUpNext();
  }, [watched, user, db]);

  const isAired = (dateStr?: string) => {
    if (!dateStr) return true;
    const airDate = new Date(dateStr);
    const now = new Date();
    airDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return airDate <= now;
  };

  const watchedMap = useMemo(() => new Map(watched.map(w => [w.id, w])), [watched]);

  const isWatched = useCallback((id: string) => {
    const item = watchedMap.get(id);
    if (!item) return false;
    if (item.type === MediaType.Movie) return true;
    if ((item.totalEpisodes || 0) > 0) return item.watchedEpisodes >= item.totalEpisodes;
    return true;
  }, [watchedMap]);

  const isInWatchedList = useCallback((id: string) => watchedMap.has(id), [watchedMap]);
  const isEpisodeWatched = useCallback((itemId: string, episodeId: string) =>
    watchedMap.get(itemId)?.watchedEpisodeIds.has(episodeId) ?? false, [watchedMap]);

  const createBaseWatchedItem = useCallback((item: MediaItem): WatchedItem => ({
    id: item.id,
    type: item.type,
    title: item.title,
    posterUrl: item.posterUrl,
    backdrop: item.backdropUrl,
    genres: item.genres || [],
    cast: item.cast || [],
    director: item.director,
    year: item.year,
    watchedRuntime: 0,
    watchedEpisodes: 0,
    watchedEpisodeIds: new Set(),
    totalEpisodes: item.totalEpisodes || 0,
    addedAt: item.addedAt || Date.now(),
    updatedAt: new Date().toISOString(),
    version: 1,
    nextEpisode: item.nextEpisode,
    releaseDate: item.releaseDate,
    rating: item.rating || 0,
    status: item.status,
    lastAirDate: item.lastAirDate
  }), []);

  const markMovieAsWatched = useCallback(async (item: MediaItem): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    if (!isAired(item.releaseDate)) return { success: false, message: "Movie not released yet!" };

    try {
      const existingInWatchlist = watchlistMap.get(item.id);
      const runtime = Number(item.runtime) || 0;
      const dbItem: WatchedItem = {
        ...createBaseWatchedItem(item),
        addedAt: existingInWatchlist?.addedAt || Date.now(),
        rating: existingInWatchlist?.rating || item.rating || 0,
        watchedRuntime: runtime,
        watchedEpisodes: 1,
        totalEpisodes: 1,
        status: 'completed'
      };

      // Write locally to Dexie first (add to watched, delete from watchlist)
      await db.watched.put(fromWatchedItem(dbItem, user.email));
      await db.watchlist.delete([user.email, item.id]);

      if (!isDemo) {
        try {
          await upsertMediaItemInSupabase(watchedItemToRow(dbItem, user.id));
          await deleteMediaItemFromSupabase(item.id, user.id);
        } catch (syncErr) {
          console.warn('[Sync] Failed to sync update directly, queueing task:', syncErr);
          // Queue push for Watched item
          await db.syncQueue.put({
            id: `${user.email}_${dbItem.id}_${Date.now()}_upsert`,
            userEmail: user.email,
            appId: dbItem.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['insert/update'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
          // Queue delete for Watchlist item
          await db.syncQueue.put({
            id: `${user.email}_${item.id}_${Date.now()}_del`,
            userEmail: user.email,
            appId: item.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['delete'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
      return { success: true, message: "Movie marked as watched" };
    } catch (err) {
      console.error('[LibraryProvider] markMovieAsWatched failed', err);
      showToast('Failed to mark movie as watched. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, watchlistMap, createBaseWatchedItem, isDemo, queryClient, showToast, db]);

  const unmarkMovie = useCallback(async (item: MediaItem): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      // Remove locally from Dexie first
      await db.watched.delete([user.email, item.id]);

      if (!isDemo) {
        try {
          await deleteMediaItemFromSupabase(item.id, user.id);
        } catch (syncErr) {
          console.warn('[Sync] Failed to delete directly, queueing task:', syncErr);
          await db.syncQueue.put({
            id: `${user.email}_${item.id}_${Date.now()}_del`,
            userEmail: user.email,
            appId: item.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['delete'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
      return { success: true, message: "Movie unmarked" };
    } catch (err) {
      console.error('[LibraryProvider] unmarkMovie failed', err);
      showToast('Failed to unmark movie. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, isDemo, queryClient, showToast, db]);

  const markSeriesAsWatched = useCallback(async (item: MediaItem): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    if (!item.seasons) return { success: false, message: "Details not loaded" };

    try {
      const allEps = item.seasons.flatMap(s => s.episodes);
      if (item.seasons.length > 0 && allEps.length === 0) {
        return { success: false, message: "Episode data missing. Please try again in a moment." };
      }

      const airedEps = allEps.filter(ep => isAired(ep.airDate));
      if (airedEps.length === 0) return { success: false, message: "No episodes aired yet!" };

      const existingInWatchlist = watchlistMap.get(item.id);
      const dbItem: WatchedItem = {
        ...createBaseWatchedItem(item),
        addedAt: existingInWatchlist?.addedAt || Date.now(),
        rating: existingInWatchlist?.rating || item.rating || 0,
        watchedEpisodeIds: new Set(airedEps.map(e => e.id)),
        watchedEpisodes: airedEps.length,
        watchedRuntime: airedEps.reduce((acc, e) => acc + (Number(e.runtime) || 0), 0),
        totalEpisodes: item.totalEpisodes || allEps.length,
        status: 'completed'
      };

      // Write locally to Dexie first (add to watched, delete from watchlist)
      await db.watched.put(fromWatchedItem(dbItem, user.email));
      await db.watchlist.delete([user.email, item.id]);

      if (!isDemo) {
        try {
          await upsertMediaItemInSupabase(watchedItemToRow(dbItem, user.id));
          await deleteMediaItemFromSupabase(item.id, user.id);
        } catch (syncErr) {
          console.warn('[Sync] Failed to sync directly, queueing tasks:', syncErr);
          await db.syncQueue.put({
            id: `${user.email}_${dbItem.id}_${Date.now()}_upsert`,
            userEmail: user.email,
            appId: dbItem.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['insert/update'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
          await db.syncQueue.put({
            id: `${user.email}_${item.id}_${Date.now()}_del`,
            userEmail: user.email,
            appId: item.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['delete'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
      return { success: true, message: `Marked ${airedEps.length} episodes as watched` };
    } catch (err) {
      console.error('[LibraryProvider] markSeriesAsWatched failed', err);
      showToast('Failed to mark series as watched. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, watchlistMap, createBaseWatchedItem, isDemo, queryClient, showToast, db]);

  const unmarkSeries = useCallback(async (item: MediaItem): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      // Remove locally from Dexie first
      await db.watched.delete([user.email, item.id]);

      if (!isDemo) {
        try {
          await deleteMediaItemFromSupabase(item.id, user.id);
        } catch (syncErr) {
          console.warn('[Sync] Failed to delete directly, queueing task:', syncErr);
          await db.syncQueue.put({
            id: `${user.email}_${item.id}_${Date.now()}_del`,
            userEmail: user.email,
            appId: item.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['delete'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
      return { success: true, message: "Series unmarked" };
    } catch (err) {
      console.error('[LibraryProvider] unmarkSeries failed', err);
      showToast('Failed to unmark series. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, isDemo, queryClient, showToast, db]);

  const markSeasonAsWatched = useCallback(async (item: MediaItem, season: Season): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const airedEps = season.episodes.filter(ep => isAired(ep.airDate));
      if (airedEps.length === 0) return { success: false, message: "No aired episodes!" };

      const existing = watchedMap.get(item.id);
      const dbItem = existing || createBaseWatchedItem(item);
      const epIds = new Set(dbItem.watchedEpisodeIds);
      let addedRuntime = 0;
      airedEps.forEach(e => {
        if (!epIds.has(e.id)) {
          epIds.add(e.id);
          addedRuntime += (Number(e.runtime) || 0);
        }
      });

      const updatedItem = {
        ...dbItem,
        watchedEpisodeIds: epIds,
        watchedEpisodes: epIds.size,
        watchedRuntime: dbItem.watchedRuntime + addedRuntime,
        updatedAt: new Date().toISOString()
      };

      // Write locally to Dexie first
      await db.watched.put(fromWatchedItem(updatedItem, user.email));

      if (!isDemo) {
        try {
          await upsertMediaItemInSupabase(watchedItemToRow(updatedItem, user.id));
        } catch (syncErr) {
          console.warn('[Sync] Failed to sync directly, queueing task:', syncErr);
          await db.syncQueue.put({
            id: `${user.email}_${updatedItem.id}_${Date.now()}_upsert`,
            userEmail: user.email,
            appId: updatedItem.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['insert/update'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
      return { success: true, message: "Season marked as watched" };
    } catch (err) {
      console.error('[LibraryProvider] markSeasonAsWatched failed', err);
      showToast('Failed to mark season as watched. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, watchedMap, createBaseWatchedItem, isDemo, queryClient, showToast, db]);

  const unmarkSeason = useCallback(async (item: MediaItem, season: Season): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const existing = watchedMap.get(item.id);
      if (!existing) return { success: false, message: "Not watched" };
      const epIds = new Set(existing.watchedEpisodeIds);
      let removedRuntime = 0;
      season.episodes.forEach(e => {
        if (epIds.has(e.id)) {
          epIds.delete(e.id);
          removedRuntime += (Number(e.runtime) || 0);
        }
      });
      const updatedItem = {
        ...existing,
        watchedEpisodeIds: epIds,
        watchedEpisodes: epIds.size,
        watchedRuntime: Math.max(0, existing.watchedRuntime - removedRuntime),
        updatedAt: new Date().toISOString()
      };

      // Write locally to Dexie first
      await db.watched.put(fromWatchedItem(updatedItem, user.email));

      if (!isDemo) {
        try {
          await upsertMediaItemInSupabase(watchedItemToRow(updatedItem, user.id));
        } catch (syncErr) {
          console.warn('[Sync] Failed to sync directly, queueing task:', syncErr);
          await db.syncQueue.put({
            id: `${user.email}_${updatedItem.id}_${Date.now()}_upsert`,
            userEmail: user.email,
            appId: updatedItem.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['insert/update'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
      return { success: true, message: "Season unmarked" };
    } catch (err) {
      console.error('[LibraryProvider] unmarkSeason failed', err);
      showToast('Failed to unmark season. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, watchedMap, isDemo, queryClient, showToast, db]);

  const markEpisodeAsWatched = useCallback(async (item: MediaItem, season: Season, episode: Episode): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    if (!isAired(episode.airDate)) return { success: false, message: "Not aired yet!" };

    try {
      const existing = watchedMap.get(item.id);
      const dbItem = existing || createBaseWatchedItem(item);
      const epIds = new Set(dbItem.watchedEpisodeIds);
      if (epIds.has(episode.id)) return { success: true, message: "Already watched" };

      epIds.add(episode.id);
      const updatedItem = {
        ...dbItem,
        watchedEpisodeIds: epIds,
        watchedEpisodes: epIds.size,
        watchedRuntime: dbItem.watchedRuntime + (Number(episode.runtime) || 0),
        updatedAt: new Date().toISOString()
      };

      // Write locally to Dexie first
      await db.watched.put(fromWatchedItem(updatedItem, user.email));

      if (!isDemo) {
        try {
          await upsertMediaItemInSupabase(watchedItemToRow(updatedItem, user.id));
        } catch (syncErr) {
          console.warn('[Sync] Failed to sync directly, queueing task:', syncErr);
          await db.syncQueue.put({
            id: `${user.email}_${updatedItem.id}_${Date.now()}_upsert`,
            userEmail: user.email,
            appId: updatedItem.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['insert/update'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
      return { success: true, message: "Episode marked as watched" };
    } catch (err) {
      console.error('[LibraryProvider] markEpisodeAsWatched failed', err);
      showToast('Failed to mark episode as watched. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, watchedMap, createBaseWatchedItem, isDemo, queryClient, showToast, db]);

  const unmarkEpisode = useCallback(async (item: MediaItem, season: Season, episode: Episode): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const existing = watchedMap.get(item.id);
      if (!existing || !existing.watchedEpisodeIds.has(episode.id)) return { success: true, message: "Not watched" };
      const epIds = new Set(existing.watchedEpisodeIds);
      epIds.delete(episode.id);
      const updatedItem = {
        ...existing,
        watchedEpisodeIds: epIds,
        watchedEpisodes: epIds.size,
        watchedRuntime: Math.max(0, existing.watchedRuntime - (Number(episode.runtime) || 0)),
        updatedAt: new Date().toISOString()
      };

      // Write locally to Dexie first
      await db.watched.put(fromWatchedItem(updatedItem, user.email));

      if (!isDemo) {
        try {
          await upsertMediaItemInSupabase(watchedItemToRow(updatedItem, user.id));
        } catch (syncErr) {
          console.warn('[Sync] Failed to sync directly, queueing task:', syncErr);
          await db.syncQueue.put({
            id: `${user.email}_${updatedItem.id}_${Date.now()}_upsert`,
            userEmail: user.email,
            appId: updatedItem.id,
            type: 'cloud_push',
            priority: 1,
            reasons: ['insert/update'],
            addedAt: Date.now(),
            updatedAt: Date.now(),
            retries: 0,
            nextRetryAt: Date.now() + 5000,
            status: 'pending'
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
      return { success: true, message: "Episode unmarked" };
    } catch (err) {
      console.error('[LibraryProvider] unmarkEpisode failed', err);
      showToast('Failed to unmark episode. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, watchedMap, isDemo, queryClient, showToast, db]);

  return {
    watched,
    wdLoading,
    continueWatching,
    upNextItems,
    watchedMap,
    isWatched,
    isInWatchedList,
    isEpisodeWatched,
    markMovieAsWatched,
    unmarkMovie,
    markSeriesAsWatched,
    unmarkSeries,
    markSeasonAsWatched,
    unmarkSeason,
    markEpisodeAsWatched,
    unmarkEpisode
  };
}
