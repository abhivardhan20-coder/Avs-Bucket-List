'use client';

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { db, evictStaleMediaCache, evictOldLogs } from '../lib/db';
import { MediaType, Season, Episode, ActionResponse, WatchlistItem, WatchedItem } from '../types';
import { useSync } from './SyncProvider';
import { useWatchlistSlice } from './library/useWatchlistSlice';
import { useWatchedSlice } from './library/useWatchedSlice';
import { UpNextItem } from '../utils/upNext';

// --- SPLIT CONTEXTS: Data (re-renders on data change) vs Actions (stable references) ---

// ===================== WATCHLIST =====================

export interface WatchlistDataValue {
  watchlist: WatchlistItem[];
  isDbLoaded: boolean;
  isInWatchlist: (id: string) => boolean;
  isEpisodeInWatchlist: (itemId: string, episodeId: string) => boolean;
  isSeasonInWatchlist: (itemId: string, seasonId: string) => boolean;
}

export interface WatchlistActionsValue {
  addToWatchlist: (item: any) => Promise<ActionResponse>;
  removeFromWatchlist: (itemId: string) => Promise<ActionResponse>;
  toggleEpisodeInWatchlist: (item: any, season: Season, episode: Episode) => Promise<ActionResponse>;
  toggleSeasonInWatchlist: (item: any, season: Season) => Promise<ActionResponse>;
}

/** @deprecated Use WatchlistDataValue & WatchlistActionsValue separately for better performance */
export interface WatchlistContextValue extends WatchlistDataValue, WatchlistActionsValue {}

// ===================== WATCHED =====================

export interface WatchedDataValue {
  watched: WatchedItem[];
  continueWatching: WatchedItem[];
  upNextItems: UpNextItem[];
  isDbLoaded: boolean;
  isWatched: (id: string) => boolean;
  isInWatchedList: (id: string) => boolean;
  isEpisodeWatched: (itemId: string, episodeId: string) => boolean;
}

export interface WatchedActionsValue {
  markMovieAsWatched: (item: any) => Promise<ActionResponse>;
  unmarkMovie: (item: any) => Promise<ActionResponse>;
  markSeriesAsWatched: (item: any) => Promise<ActionResponse>;
  unmarkSeries: (item: any) => Promise<ActionResponse>;
  markSeasonAsWatched: (item: any, season: Season) => Promise<ActionResponse>;
  unmarkSeason: (item: any, season: Season) => Promise<ActionResponse>;
  markEpisodeAsWatched: (item: any, season: Season, episode: Episode) => Promise<ActionResponse>;
  unmarkEpisode: (item: any, season: Season, episode: Episode) => Promise<ActionResponse>;
}

/** @deprecated Use WatchedDataValue & WatchedActionsValue separately for better performance */
export interface WatchedContextValue extends WatchedDataValue, WatchedActionsValue {}

export interface SharedContextValue {
  getMediaDetails: (id: string, type: MediaType) => Promise<any | null>;
}

// ===================== CONTEXT DECLARATIONS =====================

const WatchlistDataCtx = createContext<WatchlistDataValue | undefined>(undefined);
const WatchlistActionsCtx = createContext<WatchlistActionsValue | undefined>(undefined);
const WatchedDataCtx = createContext<WatchedDataValue | undefined>(undefined);
const WatchedActionsCtx = createContext<WatchedActionsValue | undefined>(undefined);
const SharedContext = createContext<SharedContextValue | undefined>(undefined);

export const LibraryProvider = ({ children }: { children: React.ReactNode }) => {
  const { getMediaDetails } = useSync();

  // Run cache eviction once per session on mount
  useEffect(() => {
    evictStaleMediaCache();
    evictOldLogs();
  }, []);

  const {
    watchlist,
    wlLoading,
    watchlistMap,
    isInWatchlist,
    isEpisodeInWatchlist,
    isSeasonInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleEpisodeInWatchlist,
    toggleSeasonInWatchlist
  } = useWatchlistSlice(db);

  const {
    watched,
    wdLoading,
    continueWatching,
    upNextItems,
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
  } = useWatchedSlice(db, watchlistMap);

  const isDbLoaded = !wlLoading && !wdLoading;

  // --- WATCHLIST: Split data (changes when list changes) vs actions (stable references) ---

  const watchlistData = useMemo<WatchlistDataValue>(() => ({
    watchlist,
    isDbLoaded,
    isInWatchlist,
    isEpisodeInWatchlist,
    isSeasonInWatchlist,
  }), [watchlist, isDbLoaded, isInWatchlist, isEpisodeInWatchlist, isSeasonInWatchlist]);

  const watchlistActions = useMemo<WatchlistActionsValue>(() => ({
    addToWatchlist,
    removeFromWatchlist,
    toggleEpisodeInWatchlist,
    toggleSeasonInWatchlist,
  }), [addToWatchlist, removeFromWatchlist, toggleEpisodeInWatchlist, toggleSeasonInWatchlist]);

  // --- WATCHED: Split data vs actions ---

  const watchedData = useMemo<WatchedDataValue>(() => ({
    watched,
    continueWatching,
    upNextItems,
    isDbLoaded,
    isWatched,
    isInWatchedList,
    isEpisodeWatched,
  }), [watched, continueWatching, upNextItems, isDbLoaded, isWatched, isInWatchedList, isEpisodeWatched]);

  const watchedActions = useMemo<WatchedActionsValue>(() => ({
    markMovieAsWatched,
    unmarkMovie,
    markSeriesAsWatched,
    unmarkSeries,
    markSeasonAsWatched,
    unmarkSeason,
    markEpisodeAsWatched,
    unmarkEpisode,
  }), [markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries, markSeasonAsWatched, unmarkSeason, markEpisodeAsWatched, unmarkEpisode]);

  const sharedValue = useMemo<SharedContextValue>(() => ({
    getMediaDetails,
  }), [getMediaDetails]);

  return (
    <WatchlistDataCtx.Provider value={watchlistData}>
      <WatchlistActionsCtx.Provider value={watchlistActions}>
        <WatchedDataCtx.Provider value={watchedData}>
          <WatchedActionsCtx.Provider value={watchedActions}>
            <SharedContext.Provider value={sharedValue}>
              {children}
            </SharedContext.Provider>
          </WatchedActionsCtx.Provider>
        </WatchedDataCtx.Provider>
      </WatchlistActionsCtx.Provider>
    </WatchlistDataCtx.Provider>
  );
};

// ===================== GRANULAR HOOKS (Preferred — use these for best performance) =====================

/** Read-only watchlist data. Only re-renders when the watchlist array or loading state changes. */
export const useWatchlistData = (): WatchlistDataValue => {
  const ctx = useContext(WatchlistDataCtx);
  if (!ctx) throw new Error('useWatchlistData must be used within LibraryProvider');
  return ctx;
};

/** Stable watchlist mutation functions. Rarely re-renders. */
export const useWatchlistActions = (): WatchlistActionsValue => {
  const ctx = useContext(WatchlistActionsCtx);
  if (!ctx) throw new Error('useWatchlistActions must be used within LibraryProvider');
  return ctx;
};

/** Read-only watched data. Only re-renders when the watched array or derived data changes. */
export const useWatchedData = (): WatchedDataValue => {
  const ctx = useContext(WatchedDataCtx);
  if (!ctx) throw new Error('useWatchedData must be used within LibraryProvider');
  return ctx;
};

/** Stable watched mutation functions. Rarely re-renders. */
export const useWatchedActions = (): WatchedActionsValue => {
  const ctx = useContext(WatchedActionsCtx);
  if (!ctx) throw new Error('useWatchedActions must be used within LibraryProvider');
  return ctx;
};

// ===================== COMBINED HOOKS (Backward-compatible) =====================

/** Combined watchlist data + actions. Prefer useWatchlistData/useWatchlistActions for new code. */
export const useWatchlist = (): WatchlistContextValue => {
  return { ...useWatchlistData(), ...useWatchlistActions() };
};

/** Combined watched data + actions. Prefer useWatchedData/useWatchedActions for new code. */
export const useWatched = (): WatchedContextValue => {
  return { ...useWatchedData(), ...useWatchedActions() };
};

export const useShared = (): SharedContextValue => {
  const ctx = useContext(SharedContext);
  if (!ctx) throw new Error('useShared must be used within LibraryProvider');
  return ctx;
};

export const useLibrary = () => {
  return { ...useWatchlist(), ...useWatched(), ...useShared() };
};

export const useLibraryActions = useLibrary;
export const useLibraryData = useLibrary;
