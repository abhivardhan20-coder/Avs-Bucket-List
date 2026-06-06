import { WatchlistDBItem, WatchedDBItem } from '../lib/db';
import { WatchlistItem, WatchedItem, MediaType } from '../types';
import { MediaItemRow } from '../types/database.types';

// --- DEXIE LOCAL DB MAPPERS ---

export const toWatchlistItem = (dbItem: WatchlistDBItem): WatchlistItem => {
  const { poster, ...rest } = dbItem;
  return {
    ...rest,
    posterUrl: poster,
    watchlistEpisodeIds: new Set(dbItem.watchlistEpisodeIds),
    watchlistSeasonIds: new Set(dbItem.watchlistSeasonIds),
    rating: dbItem.rating || 0,
    year: dbItem.year || 0,
    genres: dbItem.genres || [],
    totalEpisodes: dbItem.totalEpisodes || 0
  };
};

export const toWatchedItem = (dbItem: WatchedDBItem): WatchedItem => {
  const { poster, backdrop, ...rest } = dbItem;
  return {
    ...rest,
    posterUrl: poster,
    backdrop: backdrop,
    watchedEpisodeIds: new Set(dbItem.watchedEpisodeIds),
    rating: dbItem.rating || 0,
    year: dbItem.year || 0,
    genres: dbItem.genres || [],
    totalEpisodes: dbItem.totalEpisodes || 0
  };
};

export const fromWatchlistItem = (item: WatchlistItem, userEmail: string): WatchlistDBItem => {
  const { posterUrl, ...rest } = item;
  return {
    ...rest,
    poster: posterUrl,
    userEmail,
    watchlistEpisodeIds: Array.from(item.watchlistEpisodeIds),
    watchlistSeasonIds: Array.from(item.watchlistSeasonIds),
    updatedAt: item.updatedAt || new Date().toISOString(),
    version: item.version || 1,
    rating: item.rating || 0,
    year: item.year || 0,
    genres: item.genres || [],
    totalEpisodes: item.totalEpisodes || 0
  } as WatchlistDBItem;
};

export const fromWatchedItem = (item: WatchedItem, userEmail: string): WatchedDBItem => {
  const { posterUrl, backdrop, ...rest } = item;
  return {
    ...rest,
    poster: posterUrl,
    backdrop: backdrop,
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
  } as WatchedDBItem;
};


// --- SUPABASE POSTGRES DB MAPPERS ---

export const rowToWatchlistItem = (row: MediaItemRow): WatchlistItem => {
  const payload = row.payload || {};
  return {
    id: row.id,
    type: (row.media_type === 'tv' ? MediaType.Series : row.media_type) as MediaType,
    title: row.title,
    posterUrl: row.poster_url || '',
    addedAt: new Date(row.added_at).getTime(),
    updatedAt: row.updated_at,
    version: 1,
    watchlistEpisodeIds: new Set(payload.watchlistEpisodeIds || []),
    watchlistSeasonIds: new Set(payload.watchlistSeasonIds || []),
    nextEpisode: payload.nextEpisode,
    releaseDate: payload.releaseDate || undefined,
    rating: Number(row.rating) || 0,
    year: row.year || 0,
    genres: row.genres || [],
    totalEpisodes: payload.totalEpisodes || 0,
    status: row.status,
    lastAirDate: payload.lastAirDate
  };
};

export const rowToWatchedItem = (row: MediaItemRow): WatchedItem => {
  const payload = row.payload || {};
  return {
    id: row.id,
    type: (row.media_type === 'tv' ? MediaType.Series : row.media_type) as MediaType,
    title: row.title,
    posterUrl: row.poster_url || '',
    backdrop: row.backdrop_url || '',
    genres: row.genres || [],
    cast: payload.cast || [],
    director: payload.director,
    year: row.year || 0,
    watchedRuntime: payload.watchedRuntime || 0,
    watchedEpisodes: payload.watchedEpisodes || 0,
    watchedEpisodeIds: new Set(payload.watchedEpisodeIds || []),
    totalEpisodes: payload.totalEpisodes || 0,
    addedAt: new Date(row.added_at).getTime(),
    version: 1,
    updatedAt: row.updated_at,
    nextEpisode: payload.nextEpisode,
    releaseDate: payload.releaseDate || undefined,
    rating: Number(row.rating) || 0,
    status: row.status,
    lastAirDate: payload.lastAirDate
  };
};

// --- HELPERS FOR NORMALIZATION ---

const normalizeMediaType = (type: any): 'movie' | 'tv' | 'anime' | 'manga' => {
  if (!type) return 'movie';
  const t = String(type).toLowerCase().trim();
  if (t === 'tv' || t === 'series' || t === 'show' || t === 'shows') return 'tv';
  if (t === 'movie' || t === 'movies') return 'movie';
  if (t === 'anime') return 'anime';
  if (t === 'manga') return 'manga';
  return 'movie';
};

const normalizeStatus = (status: any, defaultStatus: 'watchlist' | 'completed' = 'completed'): 'watchlist' | 'watching' | 'completed' | 'dropped' | 'on_hold' => {
  if (!status) return defaultStatus;
  const s = String(status).toLowerCase().trim();
  if (s === 'watchlist') return 'watchlist';
  if (s === 'watching') return 'watching';
  if (s === 'completed' || s === 'watched') return 'completed';
  if (s === 'dropped') return 'dropped';
  if (s === 'on_hold' || s === 'on hold' || s === 'onhold') return 'on_hold';
  return defaultStatus;
};

export const watchlistItemToRow = (item: WatchlistItem, userId: string): Omit<MediaItemRow, 'added_at' | 'updated_at'> => ({
  id: item.id,
  user_id: userId,
  media_type: normalizeMediaType(item.type),
  status: 'watchlist',
  title: item.title,
  year: item.year || null,
  rating: item.rating || null,
  poster_url: item.posterUrl || null,
  backdrop_url: null,
  genres: item.genres || [],
  payload: {
    watchlistEpisodeIds: Array.from(item.watchlistEpisodeIds),
    watchlistSeasonIds: Array.from(item.watchlistSeasonIds),
    nextEpisode: item.nextEpisode,
    releaseDate: item.releaseDate,
    totalEpisodes: item.totalEpisodes,
    lastAirDate: item.lastAirDate
  },
  progress: null,
  deleted_at: null
});

export const watchedItemToRow = (item: WatchedItem, userId: string): Omit<MediaItemRow, 'added_at' | 'updated_at'> => ({
  id: item.id,
  user_id: userId,
  media_type: normalizeMediaType(item.type),
  status: normalizeStatus(item.status, 'completed'),
  title: item.title,
  year: item.year || null,
  rating: item.rating || null,
  poster_url: item.posterUrl || null,
  backdrop_url: item.backdrop || null,
  genres: item.genres || [],
  payload: {
    watchedRuntime: item.watchedRuntime,
    watchedEpisodes: item.watchedEpisodes,
    watchedEpisodeIds: Array.from(item.watchedEpisodeIds),
    totalEpisodes: item.totalEpisodes,
    cast: item.cast,
    director: item.director,
    nextEpisode: item.nextEpisode,
    releaseDate: item.releaseDate,
    lastAirDate: item.lastAirDate
  },
  progress: null,
  deleted_at: null
});
