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

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  backdropUrl: string;
  posterUrl: string;
  overview: string;
  rating: number; // 0-10
  year: number;
  genres: string[];
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

export interface WatchlistItem {
  id: string;
  type: MediaType;
  title: string;
  poster: string;
  addedAt: number;
  updatedAt: string;
  version: number;

  // Granular watchlist tracking
  watchlistEpisodeIds: Set<string>;
  watchlistSeasonIds: Set<string>;

  // Optional cache for quick access
  nextEpisode?: NextEpisodeInfo;
  releaseDate?: string;
  rating: number;
  year: number;
  genres: string[];
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

export interface WatchedItem {
  id: string;
  type: MediaType;
  title: string;
  poster: string;
  backdrop: string;
  genres: string[];
  cast: string[];
  director?: string;
  year: number;

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
  rating: number;
  status?: string;
  lastAirDate?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  token?: string;
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