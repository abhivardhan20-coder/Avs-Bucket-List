/**
 * Supabase Database Types
 * ========================
 * Auto-generated type definitions for the Supabase schema.
 * Manual schema: See docs/supabase-schema.sql for the authoritative DDL.
 */

export type MediaItemRow = {
  id: string;
  user_id: string;
  media_type: 'movie' | 'tv' | 'anime' | 'manga';
  status: 'watchlist' | 'watching' | 'completed' | 'dropped' | 'on_hold';
  title: string;
  year: number | null;
  rating: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  payload: Record<string, any>;
  progress: Record<string, any> | null;
  added_at: string;
  updated_at: string;
  deleted_at: string | null;
  version?: number;
};

export type Database = {
  public: {
    Tables: {
      media_items: {
        Row: MediaItemRow;
        Insert: Omit<MediaItemRow, 'added_at' | 'updated_at'> & {
          added_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<MediaItemRow, 'added_at' | 'updated_at'> & {
          added_at?: string;
          updated_at?: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

