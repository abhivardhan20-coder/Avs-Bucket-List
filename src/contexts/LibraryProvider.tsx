import React, { createContext, useContext, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, WatchlistDBItem, WatchedDBItem, evictStaleMediaCache, evictOldLogs } from '../lib/db';
import { MediaItem, MediaType, Season, Episode, ActionResponse, WatchlistItem, WatchedItem } from '../types';
import { useAuth } from './AuthProvider';
import { useSync } from './SyncProvider';
import { useToast } from './ToastProvider';
import { calculateShowActivity } from '../utils/showActivity';
import { getUpNextForSeries, UpNextItem } from '../utils/upNext';
import { toWatchedItem, toWatchlistItem, fromWatchedItem, fromWatchlistItem } from '../utils/dbMappers';
import { debounce } from '../lib/debounce';

// ✅ SPLIT CONTEXTS: Separate watchlist and watched to prevent cross-contamination re-renders

/**
 * Watchlist-specific context: watchlist data + watchlist actions only
 */
export interface WatchlistContextValue {
  watchlist: WatchlistItem[];
  isDbLoaded: boolean;
  addToWatchlist: (item: MediaItem) => Promise<ActionResponse>;
  removeFromWatchlist: (itemId: string) => Promise<ActionResponse>;
  toggleEpisodeInWatchlist: (item: MediaItem, season: Season, episode: Episode) => Promise<ActionResponse>;
  toggleSeasonInWatchlist: (item: MediaItem, season: Season) => Promise<ActionResponse>;
  isInWatchlist: (id: string) => boolean;
  isEpisodeInWatchlist: (itemId: string, episodeId: string) => boolean;
  isSeasonInWatchlist: (itemId: string, seasonId: string) => boolean;
}

/**
 * Watched-specific context: watched data + watched actions only
 */
export interface WatchedContextValue {
  watched: WatchedItem[];
  continueWatching: WatchedItem[];
  upNextItems: UpNextItem[];
  isDbLoaded: boolean;
  markMovieAsWatched: (item: MediaItem) => Promise<ActionResponse>;
  unmarkMovie: (item: MediaItem) => Promise<ActionResponse>;
  markSeriesAsWatched: (item: MediaItem) => Promise<ActionResponse>;
  unmarkSeries: (item: MediaItem) => Promise<ActionResponse>;
  markSeasonAsWatched: (item: MediaItem, season: Season) => Promise<ActionResponse>;
  unmarkSeason: (item: MediaItem, season: Season) => Promise<ActionResponse>;
  markEpisodeAsWatched: (item: MediaItem, season: Season, episode: Episode) => Promise<ActionResponse>;
  unmarkEpisode: (item: MediaItem, season: Season, episode: Episode) => Promise<ActionResponse>;
  isWatched: (id: string) => boolean;
  isInWatchedList: (id: string) => boolean;
  isEpisodeWatched: (itemId: string, episodeId: string) => boolean;
}

/**
 * Shared utilities context
 */
export interface SharedContextValue {
  getMediaDetails: (id: string, type: MediaType) => Promise<MediaItem | null>;
}

// ✅ Create separate contexts — changes to one won't trigger re-renders of the other's consumers
const WatchlistContext = createContext<WatchlistContextValue | undefined>(undefined);
const WatchedContext = createContext<WatchedContextValue | undefined>(undefined);
const SharedContext = createContext<SharedContextValue | undefined>(undefined);

export const LibraryProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { syncItemUpdate, syncItemDelete, enqueueSyncTask, getMediaDetails } = useSync();
  const { showToast } = useToast();

  const dbWatchlist = useLiveQuery(
    () => user ? db.watchlist.where('userEmail').equals(user.email).reverse().sortBy('addedAt') : Promise.resolve([]),
    [user?.email]
  );
  const dbWatched = useLiveQuery(
    () => user ? db.watched.where('userEmail').equals(user.email).reverse().sortBy('addedAt') : Promise.resolve([]),
    [user?.email]
  );

  // Run cache eviction once per session on mount
  useEffect(() => { 
    evictStaleMediaCache(); 
    evictOldLogs();
  }, []);

  const isDbLoaded = useMemo(() => {
    if (!user) return true;
    return typeof dbWatchlist !== 'undefined' && typeof dbWatched !== 'undefined';
  }, [user, dbWatchlist, dbWatched]);

  const watchlist = useMemo(() => (dbWatchlist || []).map(toWatchlistItem), [dbWatchlist]);
  const watched = useMemo(() => (dbWatched || []).map(toWatchedItem), [dbWatched]);

  const watchlistRef = useRef(watchlist);
  const watchedRef = useRef(watched);
  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { watchedRef.current = watched; }, [watched]);

  const debouncedSyncPush = useRef(
    debounce((newItem: WatchlistDBItem | WatchedDBItem, oldItem?: WatchlistDBItem | WatchedDBItem) => {
      syncItemUpdate(newItem, oldItem);
    }, 3000)
  ).current;

  const continueWatching = useMemo(() => {
    return watched.filter(item => {
      if (item.type !== MediaType.Series && item.type !== MediaType.Anime) return false;
      const activity = calculateShowActivity(item as unknown as MediaItem, item);
      return !activity.isActive;
    });
  }, [watched]);

  const upNextItems = useLiveQuery(async () => {
    if (!user || !watched.length) return [];
    
    const candidates = watched.filter(w => 
      (w.type === MediaType.Series || w.type === MediaType.Anime) && 
      w.watchedEpisodes < (w.totalEpisodes || 1)
    );
    
    if (candidates.length === 0) return [];

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
    return results.slice(0, 20);
  }, [watched, user], [] as UpNextItem[]);

  const isAired = (dateStr?: string) => {
    if (!dateStr) return true;
    const airDate = new Date(dateStr);
    const now = new Date();
    airDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return airDate <= now;
  };

  // ✅ OPTIMIZATION: Derive O(1) lookup Maps from arrays to avoid O(n) .find() on every interaction
  const watchlistMap = useMemo(
    () => new Map(watchlist.map(w => [w.id, w])),
    [watchlist]
  );

  const watchedMap = useMemo(
    () => new Map(watched.map(w => [w.id, w])),
    [watched]
  );

  // ===================== WATCHLIST ACTIONS =====================
  const isInWatchlist = useCallback((id: string) => watchlistMap.has(id), [watchlistMap]);
  const isEpisodeInWatchlist = useCallback((itemId: string, episodeId: string) => 
    watchlistMap.get(itemId)?.watchlistEpisodeIds.has(episodeId) ?? false, [watchlistMap]);
  const isSeasonInWatchlist = useCallback((itemId: string, seasonId: string | number) => {
    return watchlistMap.get(itemId)?.watchlistSeasonIds.has(String(seasonId)) ?? false;
  }, [watchlistMap]);

  const createBaseWatchlistItem = useCallback((item: MediaItem): WatchlistDBItem => ({
    id: item.id, userEmail: user?.email || '', type: item.type, title: item.title,
    poster: item.posterUrl, addedAt: Date.now(), updatedAt: new Date().toISOString(),
    version: 1, watchlistEpisodeIds: [], watchlistSeasonIds: [], nextEpisode: item.nextEpisode,
    releaseDate: item.releaseDate, rating: item.rating || 0, year: item.year || 0,
    genres: item.genres || [], totalEpisodes: item.totalEpisodes || 0, status: item.status, lastAirDate: item.lastAirDate
  }), [user?.email]);

  const addToWatchlist = useCallback(async (item: MediaItem): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    if (isInWatchlist(item.id)) return { success: false, message: "Already in watchlist" };
    try {
      const dbItem = createBaseWatchlistItem(item);
      await db.watchlist.add(dbItem);
      debouncedSyncPush(dbItem);
      return { success: true, message: "Added to watchlist" };
    } catch (err) {
      console.error('[LibraryProvider] addToWatchlist failed', err);
      showToast('Failed to add to watchlist. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, isInWatchlist, createBaseWatchlistItem, debouncedSyncPush, showToast]);

  const removeFromWatchlist = useCallback(async (itemId: string): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      await db.watchlist.delete([user.email, itemId]);
      syncItemDelete(itemId);
      return { success: true, message: "Removed from watchlist" };
    } catch (err) {
      console.error('[LibraryProvider] removeFromWatchlist failed', err);
      showToast('Failed to remove from watchlist. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, syncItemDelete, showToast]);

  const toggleEpisodeInWatchlist = useCallback(async (item: MediaItem, season: Season, episode: Episode): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const existing = watchlistRef.current.find(w => w.id === item.id);
      const dbItem = existing ? fromWatchlistItem(existing, user.email) : createBaseWatchlistItem(item);
      const epSet = new Set(dbItem.watchlistEpisodeIds);
      let msg = "";
      if (epSet.has(episode.id)) { epSet.delete(episode.id); msg = "Episode removed from watchlist"; } 
      else { epSet.add(episode.id); msg = "Episode added to watchlist"; }

      const updatedItem = { ...dbItem, watchlistEpisodeIds: Array.from(epSet), version: (dbItem.version || 0) + 1, updatedAt: new Date().toISOString() };
      await db.watchlist.put(updatedItem);
      debouncedSyncPush(updatedItem, dbItem);
      return { success: true, message: msg };
    } catch (err) {
      console.error('[LibraryProvider] toggleEpisodeInWatchlist failed', err);
      showToast('Failed to update episode. Please try again.', 'error');
      return { success: false, message: "Update failed" };
    }
  }, [user, createBaseWatchlistItem, debouncedSyncPush, showToast]);

  const toggleSeasonInWatchlist = useCallback(async (item: MediaItem, season: Season): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const existing = watchlistRef.current.find(w => w.id === item.id);
      const dbItem = existing ? fromWatchlistItem(existing, user.email) : createBaseWatchlistItem(item);
      const sSet = new Set(dbItem.watchlistSeasonIds);
      const eSet = new Set(dbItem.watchlistEpisodeIds);
      let msg = "";

      if (sSet.has(season.id)) {
        sSet.delete(season.id); season.episodes.forEach(e => eSet.delete(e.id)); msg = "Season removed from watchlist";
      } else {
        sSet.add(season.id); season.episodes.forEach(e => eSet.add(e.id)); msg = "Season added to watchlist";
      }
      const updatedItem = { ...dbItem, watchlistSeasonIds: Array.from(sSet), watchlistEpisodeIds: Array.from(eSet), version: (dbItem.version || 0) + 1, updatedAt: new Date().toISOString() };
      await db.watchlist.put(updatedItem);
      debouncedSyncPush(updatedItem, dbItem);
      return { success: true, message: msg };
    } catch (err) {
      console.error('[LibraryProvider] toggleSeasonInWatchlist failed', err);
      showToast('Failed to update season. Please try again.', 'error');
      return { success: false, message: "Update failed" };
    }
  }, [user, createBaseWatchlistItem, debouncedSyncPush, showToast]);

  // ===================== WATCHED ACTIONS =====================
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

  const createBaseWatchedItem = useCallback((item: MediaItem): WatchedDBItem => ({
    id: item.id, userEmail: user?.email || '', type: item.type, title: item.title,
    poster: item.posterUrl, backdrop: item.backdropUrl, genres: item.genres || [],
    cast: item.cast || [], director: item.director, year: item.year, watchedRuntime: 0,
    watchedEpisodes: 0, watchedEpisodeIds: [], totalEpisodes: item.totalEpisodes || 0,
    addedAt: item.addedAt || Date.now(), updatedAt: new Date().toISOString(),
    version: 1, nextEpisode: item.nextEpisode, releaseDate: item.releaseDate, rating: item.rating || 0,
    status: item.status, lastAirDate: item.lastAirDate
  }), [user?.email]);

  const markMovieAsWatched = useCallback(async (item: MediaItem): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    if (!isAired(item.releaseDate)) return { success: false, message: "Movie not released yet!" };
    
    try {
      const existingInWatchlist = watchlistRef.current.find(w => w.id === item.id);
      const runtime = Number(item.runtime) || 0;
      const dbItem: WatchedDBItem = {
        ...createBaseWatchedItem(item),
        addedAt: existingInWatchlist?.addedAt || Date.now(),
        rating: existingInWatchlist?.rating || item.rating || 0,
        watchedRuntime: runtime, watchedEpisodes: 1, totalEpisodes: 1
      };
      await db.watched.put(dbItem);
      await db.watchlist.delete([user.email, item.id]);
      
      if (runtime === 0) enqueueSyncTask(item.id, 'metadata', 1);
      debouncedSyncPush(dbItem, existingInWatchlist ? fromWatchlistItem(existingInWatchlist, user.email) : undefined);
      return { success: true, message: "Movie marked as watched" };
    } catch (err) {
      console.error('[LibraryProvider] markMovieAsWatched failed', err);
      showToast('Failed to mark movie as watched. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, createBaseWatchedItem, enqueueSyncTask, debouncedSyncPush, showToast]);

  const unmarkMovie = useCallback(async (item: MediaItem): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      await db.watched.delete([user.email, item.id]);
      syncItemDelete(item.id);
      return { success: true, message: "Movie unmarked" };
    } catch (err) {
      console.error('[LibraryProvider] unmarkMovie failed', err);
      showToast('Failed to unmark movie. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, syncItemDelete, showToast]);

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

      const existingInWatchlist = watchlistRef.current.find(w => w.id === item.id);
      const dbItem: WatchedDBItem = {
        ...createBaseWatchedItem(item),
        addedAt: existingInWatchlist?.addedAt || Date.now(),
        rating: existingInWatchlist?.rating || item.rating || 0,
        watchedEpisodeIds: airedEps.map(e => e.id),
        watchedEpisodes: airedEps.length,
        watchedRuntime: airedEps.reduce((acc, e) => acc + (Number(e.runtime) || 0), 0),
        totalEpisodes: item.totalEpisodes || allEps.length
      };
      await db.watched.put(dbItem);
      await db.watchlist.delete([user.email, item.id]);
      debouncedSyncPush(dbItem, existingInWatchlist ? fromWatchlistItem(existingInWatchlist, user.email) : undefined);
      return { success: true, message: `Marked ${airedEps.length} episodes as watched` };
    } catch (err) {
      console.error('[LibraryProvider] markSeriesAsWatched failed', err);
      showToast('Failed to mark series as watched. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, createBaseWatchedItem, debouncedSyncPush, showToast]);

  const unmarkSeries = useCallback(async (item: MediaItem): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      await db.watched.delete([user.email, item.id]);
      syncItemDelete(item.id);
      return { success: true, message: "Series unmarked" };
    } catch (err) {
      console.error('[LibraryProvider] unmarkSeries failed', err);
      showToast('Failed to unmark series. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, syncItemDelete, showToast]);

  const markSeasonAsWatched = useCallback(async (item: MediaItem, season: Season): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const airedEps = season.episodes.filter(ep => isAired(ep.airDate));
      if (airedEps.length === 0) return { success: false, message: "No aired episodes!" };

      const existing = watchedRef.current.find(w => w.id === item.id);
      const dbItem = existing ? fromWatchedItem(existing, user.email) : createBaseWatchedItem(item);
      const epIds = new Set(dbItem.watchedEpisodeIds);
      let addedRuntime = 0;
      airedEps.forEach(e => {
        if (!epIds.has(e.id)) {
          epIds.add(e.id);
          addedRuntime += (Number(e.runtime) || 0);
        }
      });
      
      const updatedItem = { ...dbItem, watchedEpisodeIds: Array.from(epIds), watchedEpisodes: epIds.size, watchedRuntime: dbItem.watchedRuntime + addedRuntime, version: (dbItem.version || 0) + 1, updatedAt: new Date().toISOString() };
      await db.watched.put(updatedItem);
      debouncedSyncPush(updatedItem, dbItem);
      return { success: true, message: "Season marked as watched" };
    } catch (err) {
      console.error('[LibraryProvider] markSeasonAsWatched failed', err);
      showToast('Failed to mark season as watched. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, createBaseWatchedItem, debouncedSyncPush, showToast]);

  const unmarkSeason = useCallback(async (item: MediaItem, season: Season): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const existing = watchedRef.current.find(w => w.id === item.id);
      if (!existing) return { success: false, message: "Not watched" };
      const dbItem = fromWatchedItem(existing, user.email);
      const epIds = new Set(dbItem.watchedEpisodeIds);
      let removedRuntime = 0;
      season.episodes.forEach(e => {
        if (epIds.has(e.id)) {
          epIds.delete(e.id);
          removedRuntime += (Number(e.runtime) || 0);
        }
      });
      const updatedItem = { ...dbItem, watchedEpisodeIds: Array.from(epIds), watchedEpisodes: epIds.size, watchedRuntime: Math.max(0, dbItem.watchedRuntime - removedRuntime), version: (dbItem.version || 0) + 1, updatedAt: new Date().toISOString() };
      await db.watched.put(updatedItem);
      debouncedSyncPush(updatedItem, dbItem);
      return { success: true, message: "Season unmarked" };
    } catch (err) {
      console.error('[LibraryProvider] unmarkSeason failed', err);
      showToast('Failed to unmark season. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, debouncedSyncPush, showToast]);

  const markEpisodeAsWatched = useCallback(async (item: MediaItem, season: Season, episode: Episode): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    if (!isAired(episode.airDate)) return { success: false, message: "Not aired yet!" };

    try {
      const existing = watchedRef.current.find(w => w.id === item.id);
      const dbItem = existing ? fromWatchedItem(existing, user.email) : createBaseWatchedItem(item);
      const epIds = new Set(dbItem.watchedEpisodeIds);
      if (epIds.has(episode.id)) return { success: true, message: "Already watched" };
      
      epIds.add(episode.id);
      const updatedItem = { ...dbItem, watchedEpisodeIds: Array.from(epIds), watchedEpisodes: epIds.size, watchedRuntime: dbItem.watchedRuntime + (Number(episode.runtime) || 0), version: (dbItem.version || 0) + 1, updatedAt: new Date().toISOString() };
      await db.watched.put(updatedItem);
      debouncedSyncPush(updatedItem, dbItem);
      return { success: true, message: "Episode marked as watched" };
    } catch (err) {
      console.error('[LibraryProvider] markEpisodeAsWatched failed', err);
      showToast('Failed to mark episode as watched. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, createBaseWatchedItem, debouncedSyncPush, showToast]);

  const unmarkEpisode = useCallback(async (item: MediaItem, season: Season, episode: Episode): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const existing = watchedRef.current.find(w => w.id === item.id);
      if (!existing || !existing.watchedEpisodeIds.has(episode.id)) return { success: true, message: "Not watched" };
      const dbItem = fromWatchedItem(existing, user.email);
      const epIds = new Set(dbItem.watchedEpisodeIds);
      epIds.delete(episode.id);
      const updatedItem = { ...dbItem, watchedEpisodeIds: Array.from(epIds), watchedEpisodes: epIds.size, watchedRuntime: Math.max(0, dbItem.watchedRuntime - (Number(episode.runtime) || 0)), version: (dbItem.version || 0) + 1, updatedAt: new Date().toISOString() };
      await db.watched.put(updatedItem);
      debouncedSyncPush(updatedItem, dbItem);
      return { success: true, message: "Episode unmarked" };
    } catch (err) {
      console.error('[LibraryProvider] unmarkEpisode failed', err);
      showToast('Failed to unmark episode. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, debouncedSyncPush, showToast]);

  // ===================== MEMOIZED CONTEXT VALUES =====================
  // ✅ Each memoized independently so watchlist changes don't trigger watched consumers
  const watchlistValue = useMemo<WatchlistContextValue>(() => ({
    watchlist,
    isDbLoaded,
    addToWatchlist,
    removeFromWatchlist,
    toggleEpisodeInWatchlist,
    toggleSeasonInWatchlist,
    isInWatchlist,
    isEpisodeInWatchlist,
    isSeasonInWatchlist,
  }), [watchlist, isDbLoaded, addToWatchlist, removeFromWatchlist, toggleEpisodeInWatchlist, toggleSeasonInWatchlist, isInWatchlist, isEpisodeInWatchlist, isSeasonInWatchlist]);

  const watchedValue = useMemo<WatchedContextValue>(() => ({
    watched,
    continueWatching,
    upNextItems,
    isDbLoaded,
    markMovieAsWatched,
    unmarkMovie,
    markSeriesAsWatched,
    unmarkSeries,
    markSeasonAsWatched,
    unmarkSeason,
    markEpisodeAsWatched,
    unmarkEpisode,
    isWatched,
    isInWatchedList,
    isEpisodeWatched,
  }), [watched, continueWatching, upNextItems, isDbLoaded, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries, markSeasonAsWatched, unmarkSeason, markEpisodeAsWatched, unmarkEpisode, isWatched, isInWatchedList, isEpisodeWatched]);

  const sharedValue = useMemo<SharedContextValue>(() => ({
    getMediaDetails,
  }), [getMediaDetails]);



  return (
    <WatchlistContext.Provider value={watchlistValue}>
      <WatchedContext.Provider value={watchedValue}>
        <SharedContext.Provider value={sharedValue}>
          {children}
        </SharedContext.Provider>
      </WatchedContext.Provider>
    </WatchlistContext.Provider>
  );
};

// ===================== CONTEXT HOOKS =====================

/**
 * ✅ Use only watchlist state — won't re-render when watched changes
 */
export const useWatchlist = (): WatchlistContextValue => {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within LibraryProvider');
  return ctx;
};

/**
 * ✅ Use only watched state — won't re-render when watchlist changes
 */
export const useWatched = (): WatchedContextValue => {
  const ctx = useContext(WatchedContext);
  if (!ctx) throw new Error('useWatched must be used within LibraryProvider');
  return ctx;
};

/**
 * Shared utilities (getMediaDetails, etc)
 */
export const useShared = (): SharedContextValue => {
  const ctx = useContext(SharedContext);
  if (!ctx) throw new Error('useShared must be used within LibraryProvider');
  return ctx;
};



/**
 * Combined alias for backward compatibility
 * ⚠️ Use useWatchlist() or useWatched() for better performance
 */
export const useLibrary = () => {
  return { ...useWatchlist(), ...useWatched(), ...useShared() };
};

export const useLibraryActions = useLibrary;
export const useLibraryData = useLibrary;
