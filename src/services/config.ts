export const MEDIA_FRESHNESS_MS = 48 * 60 * 60 * 1000;   // 48 hours - standard cache TTL
export const ACTIVE_SHOW_REFRESH_MS = 30 * 60 * 1000;     // 30 minutes - force refresh for airing/recent shows

// Only GOOGLE_CLIENT_ID needs to be public (used by @react-oauth/google component)
// All other API keys (TMDB, Fanart, TVDB, Trakt) are stored as Supabase Edge Function secrets
export const API_KEYS = {
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
} as const;

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
