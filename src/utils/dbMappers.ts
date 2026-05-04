import { WatchlistDBItem, WatchedDBItem } from '../lib/db';
import { WatchlistItem, WatchedItem } from '../types';

export const toWatchlistItem = (dbItem: WatchlistDBItem): WatchlistItem => ({
  ...dbItem,
  watchlistEpisodeIds: new Set(dbItem.watchlistEpisodeIds),
  watchlistSeasonIds: new Set(dbItem.watchlistSeasonIds),
  rating: dbItem.rating || 0,
  year: dbItem.year || 0,
  genres: dbItem.genres || [],
  totalEpisodes: dbItem.totalEpisodes || 0
});

export const toWatchedItem = (dbItem: WatchedDBItem): WatchedItem => ({
  ...dbItem,
  watchedEpisodeIds: new Set(dbItem.watchedEpisodeIds),
  rating: dbItem.rating || 0,
  year: dbItem.year || 0,
  genres: dbItem.genres || [],
  totalEpisodes: dbItem.totalEpisodes || 0
});

export const fromWatchlistItem = (item: WatchlistItem, userEmail: string): WatchlistDBItem => ({
  ...item,
  userEmail,
  watchlistEpisodeIds: Array.from(item.watchlistEpisodeIds),
  watchlistSeasonIds: Array.from(item.watchlistSeasonIds),
  updatedAt: item.updatedAt || new Date().toISOString(),
  version: item.version || 1,
  rating: item.rating || 0,
  year: item.year || 0,
  genres: item.genres || [],
  totalEpisodes: item.totalEpisodes || 0
});

export const fromWatchedItem = (item: WatchedItem, userEmail: string): WatchedDBItem => ({
  ...item,
  userEmail,
  watchedEpisodeIds: Array.from(item.watchedEpisodeIds),
  addedAt: item.addedAt || Date.now(),
  updatedAt: item.updatedAt || new Date().toISOString(),
  version: item.version || 1,
  rating: item.rating || 0,
  year: item.year || 0,
  genres: item.genres || [],
  totalEpisodes: item.totalEpisodes || 0,
  status: item.status,
  lastAirDate: item.lastAirDate
});
