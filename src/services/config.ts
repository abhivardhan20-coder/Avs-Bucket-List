export const MEDIA_FRESHNESS_MS = 48 * 60 * 60 * 1000;   // 48 hours - standard cache TTL
export const ACTIVE_SHOW_REFRESH_MS = 30 * 60 * 1000;     // 30 minutes - force refresh for airing/recent shows

// API keys sourced from environment variables
export const API_KEYS = {
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  TMDB_API_KEY: import.meta.env.VITE_TMDB_API_KEY || '',
  TRAKT_CLIENT_ID: import.meta.env.VITE_TRAKT_CLIENT_ID || '',
  TVDB_API_KEY: import.meta.env.VITE_TVDB_API_KEY || '',
  FANART_API_KEY: import.meta.env.VITE_FANART_API_KEY || '',
} as const;

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';