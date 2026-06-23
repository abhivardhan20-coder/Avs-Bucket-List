import React from 'react';

export enum MediaType {
  Movie = 'movie',
  Series = 'series',
  Anime = 'anime',
  Other = 'other'
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  runtime: number;
  watched: boolean;
  overview?: string;
  stillUrl?: string;
  voteAverage?: number;
  voteCount?: number;
  airDate?: string; // ISO Date String
  releaseDate?: string | null;
}

export interface Season {
  id: string;
  number: number;
  title?: string;
  episodes: Episode[];
  episodeCount?: number;
  posterUrl?: string;
  airDate?: string;
  isExpanded?: boolean;
  visibleLimit?: number;
  loadError?: boolean;
}

export interface NextEpisodeInfo {
  id: string;
  airDate: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  daysUntil: number;
}

export interface BaseMediaItem {
  id: string;
  title: string;
  type: MediaType;
  posterUrl: string;
  rating: number;
  year: number;
  genres: string[];
}

export interface MediaItem extends BaseMediaItem {
  backdropUrl: string;
  overview: string;
  cast?: string[];
  director?: string;
  trailerId?: string;
  seasons?: Season[];
  runtime?: number;
  totalEpisodes?: number;

  releaseDate?: string;
  lastAirDate?: string;
  nextEpisode?: NextEpisodeInfo;
  status?: string;
  progress?: number;
  addedAt?: number;
  
  // Tracking & Fallback
  imdbId?: string;
  tmdbId?: string;
  traktId?: number;
  tvdbId?: string;
  malId?: number;
  anilistId?: number;
  dataSource?: string;
  activityLabel?: 'Season Premiere' | 'New Episode' | 'Returning' | 'Airing Today' | 'Upcoming';
  activityScore?: number;
  seasonProgress?: number;
  
  // Cache Management
  lastRefreshedAt?: number;
  lastAccessedAt?: number;
}

export type ConflictStrategy = 'lww' | 'merge';

export interface UserSettings {
  autoplayTrailer: boolean;
  muteTrailer: boolean;
  compactView: boolean;
  conflictStrategy: ConflictStrategy;
  enableCloudSync: boolean;
}

// --- UPDATED ARCHITECTURE TYPES ---

export interface WatchlistItem extends BaseMediaItem {
  addedAt: number;
  updatedAt: string;
  version: number;

  // Granular watchlist tracking
  watchlistEpisodeIds: Set<string>;
  watchlistSeasonIds: Set<string>;

  // Optional cache for quick access
  nextEpisode?: NextEpisodeInfo;
  releaseDate?: string;
  totalEpisodes: number;
  status?: string;
  lastAirDate?: string;
}

export interface WatchlistPaginated {
  items: WatchlistItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface WatchedItem extends BaseMediaItem {
  backdrop: string;
  cast: string[];
  director?: string;

  // Tracking
  watchedRuntime: number;
  watchedEpisodes: number;
  watchedEpisodeIds: Set<string>;
  totalEpisodes: number;
  addedAt: number;
  version: number;
  updatedAt: string;

  // Optional cache for quick access
  nextEpisode?: NextEpisodeInfo;
  releaseDate?: string;
  status?: string;
  lastAirDate?: string;
}

export interface ContinueWatchingItem extends WatchedItem {
  progress: number;
  posterUrl: string;
  backdropUrl: string;
  overview: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  token?: string;
  isDemo?: boolean;
}

export interface ConflictLog {
  id: string;
  local: unknown;
  cloud: unknown;
  resolved: unknown;
  timestamp: string;
}

export interface ActionResponse {
  success: boolean;
  message: string;
  data?: unknown; // Optional payload for returning updated items or metadata
}

export interface ExportData {
  version: number;
  timestamp: string;
  watchlist: (Omit<WatchlistItem, 'watchlistEpisodeIds' | 'watchlistSeasonIds'> & { watchlistEpisodeIds: string[], watchlistSeasonIds: string[] })[];
  watched: (Omit<WatchedItem, 'watchedEpisodeIds'> & { watchedEpisodeIds: string[] })[];
  settings?: UserSettings;
}

// --- PROPS TYPES ---

export interface HeroProps {
  items: MediaItem[];
  onMoreInfo: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
}

export interface ContentRowProps {
  title: string;
  items?: MediaItem[];
  fetchStrategy?: (page: number) => Promise<MediaItem[]>;
  onCardClick: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
  onDataFetched?: (items: MediaItem[]) => void;
  excludedIds?: Set<string>;
}
