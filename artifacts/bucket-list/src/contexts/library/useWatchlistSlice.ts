import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppDatabase } from '../../lib/db';
import { MediaItem, Season, Episode, ActionResponse, WatchlistItem } from '../../types';
import { useAuth } from '../AuthProvider';
import { useToast } from '../ToastProvider';
import {
  toWatchlistItem,
  fromWatchlistItem,
  watchlistItemToRow
} from '../../utils/dbMappers';
import {
  upsertMediaItemInSupabase,
  deleteMediaItemFromSupabase
} from '../../services/syncService';

export function useWatchlistSlice(db: AppDatabase) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isDemo = user?.isDemo || user?.id === 'demo_preview_account_001';

  // React Query fetch for Watchlist (Loads exclusively from Dexie)
  const { data: watchlistData, isLoading: wlLoading } = useQuery<WatchlistItem[]>({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const items = await db.watchlist.where('userEmail').equals(user.email).toArray();
      return items.map(toWatchlistItem);
    },
    enabled: !!user,
  });
  // Stabilize reference: `= []` in destructuring creates a new array every render
  // when data is undefined (query disabled), causing cascading re-renders.
  const watchlist = useMemo(() => watchlistData ?? [], [watchlistData]);

  const watchlistMap = useMemo(() => new Map(watchlist.map(w => [w.id, w])), [watchlist]);

  const isInWatchlist = useCallback((id: string) => watchlistMap.has(id), [watchlistMap]);
  const isEpisodeInWatchlist = useCallback((itemId: string, episodeId: string) =>
    watchlistMap.get(itemId)?.watchlistEpisodeIds.has(episodeId) ?? false, [watchlistMap]);
  const isSeasonInWatchlist = useCallback((itemId: string, seasonId: string | number) => {
    return watchlistMap.get(itemId)?.watchlistSeasonIds.has(String(seasonId)) ?? false;
  }, [watchlistMap]);

  const createBaseWatchlistItem = useCallback((item: MediaItem): WatchlistItem => ({
    id: item.id,
    type: item.type,
    title: item.title,
    posterUrl: item.posterUrl,
    addedAt: Date.now(),
    updatedAt: new Date().toISOString(),
    version: 1,
    watchlistEpisodeIds: new Set(),
    watchlistSeasonIds: new Set(),
    nextEpisode: item.nextEpisode,
    releaseDate: item.releaseDate,
    rating: item.rating || 0,
    year: item.year || 0,
    genres: item.genres || [],
    totalEpisodes: item.totalEpisodes || 0,
    status: item.status,
    lastAirDate: item.lastAirDate
  }), []);

  const addToWatchlist = useCallback(async (item: MediaItem): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    if (isInWatchlist(item.id)) return { success: false, message: "Already in watchlist" };
    try {
      const dbItem = createBaseWatchlistItem(item);
      const localItem = fromWatchlistItem(dbItem, user.email);
      
      // Write locally to Dexie first
      await db.watchlist.put(localItem);

      if (!isDemo) {
        try {
          const row = watchlistItemToRow(dbItem, user.id);
          await upsertMediaItemInSupabase(row);
        } catch (syncErr) {
          console.warn('[Sync] Failed to sync directly, queueing task:', syncErr);
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
        }
      }
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
      return { success: true, message: "Added to watchlist" };
    } catch (err) {
      console.error('[LibraryProvider] addToWatchlist failed', err);
      showToast('Failed to add to watchlist. Please try again.', 'error');
      return { success: false, message: "Save failed" };
    }
  }, [user, isInWatchlist, createBaseWatchlistItem, isDemo, queryClient, showToast, db]);

  const removeFromWatchlist = useCallback(async (itemId: string): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      // Remove locally from Dexie first
      await db.watchlist.delete([user.email, itemId]);

      if (!isDemo) {
        try {
          await deleteMediaItemFromSupabase(itemId, user.id);
        } catch (syncErr) {
          console.warn('[Sync] Failed to delete directly, queueing task:', syncErr);
          await db.syncQueue.put({
            id: `${user.email}_${itemId}_${Date.now()}_del`,
            userEmail: user.email,
            appId: itemId,
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
      return { success: true, message: "Removed from watchlist" };
    } catch (err) {
      console.error('[LibraryProvider] removeFromWatchlist failed', err);
      showToast('Failed to remove from watchlist. Please try again.', 'error');
      return { success: false, message: "Delete failed" };
    }
  }, [user, isDemo, queryClient, showToast, db]);

  const toggleEpisodeInWatchlist = useCallback(async (item: MediaItem, season: Season, episode: Episode): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const existing = watchlistMap.get(item.id);
      const dbItem = existing || createBaseWatchlistItem(item);
      const epSet = new Set(dbItem.watchlistEpisodeIds);
      let msg = "";
      if (epSet.has(episode.id)) {
        epSet.delete(episode.id);
        msg = "Episode removed from watchlist";
      } else {
        epSet.add(episode.id);
        msg = "Episode added to watchlist";
      }

      const updatedItem = {
        ...dbItem,
        watchlistEpisodeIds: epSet,
        updatedAt: new Date().toISOString()
      };

      // Write locally to Dexie first
      await db.watchlist.put(fromWatchlistItem(updatedItem, user.email));

      if (!isDemo) {
        try {
          await upsertMediaItemInSupabase(watchlistItemToRow(updatedItem, user.id));
        } catch (syncErr) {
          console.warn('[Sync] Failed to sync update directly, queueing task:', syncErr);
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
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
      return { success: true, message: msg };
    } catch (err) {
      console.error('[LibraryProvider] toggleEpisodeInWatchlist failed', err);
      showToast('Failed to update episode. Please try again.', 'error');
      return { success: false, message: "Update failed" };
    }
  }, [user, watchlistMap, createBaseWatchlistItem, isDemo, queryClient, showToast, db]);

  const toggleSeasonInWatchlist = useCallback(async (item: MediaItem, season: Season): Promise<ActionResponse> => {
    if (!user) return { success: false, message: "Not logged in" };
    try {
      const existing = watchlistMap.get(item.id);
      const dbItem = existing || createBaseWatchlistItem(item);
      const sSet = new Set(dbItem.watchlistSeasonIds);
      const eSet = new Set(dbItem.watchlistEpisodeIds);
      let msg = "";

      if (sSet.has(season.id)) {
        sSet.delete(season.id);
        season.episodes.forEach(e => eSet.delete(e.id));
        msg = "Season removed from watchlist";
      } else {
        sSet.add(season.id);
        season.episodes.forEach(e => eSet.add(e.id));
        msg = "Season added to watchlist";
      }

      const updatedItem = {
        ...dbItem,
        watchlistSeasonIds: sSet,
        watchlistEpisodeIds: eSet,
        updatedAt: new Date().toISOString()
      };

      // Write locally to Dexie first
      await db.watchlist.put(fromWatchlistItem(updatedItem, user.email));

      if (!isDemo) {
        try {
          await upsertMediaItemInSupabase(watchlistItemToRow(updatedItem, user.id));
        } catch (syncErr) {
          console.warn('[Sync] Failed to sync update directly, queueing task:', syncErr);
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
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
      return { success: true, message: msg };
    } catch (err) {
      console.error('[LibraryProvider] toggleSeasonInWatchlist failed', err);
      showToast('Failed to update season. Please try again.', 'error');
      return { success: false, message: "Update failed" };
    }
  }, [user, watchlistMap, createBaseWatchlistItem, isDemo, queryClient, showToast, db]);

  return {
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
  };
}
