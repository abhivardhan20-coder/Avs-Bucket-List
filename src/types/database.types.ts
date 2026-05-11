/**
 * Supabase Database Types
 * ========================
 * Auto-generated type definitions for the Supabase schema.
 * Manual schema: See docs/supabase-schema.sql for the authoritative DDL.
 */

export type Database = {
  public: {
    Tables: {
      media_items: {
        Row: {
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
          payload: Record<string, unknown>;
          progress: Record<string, unknown> | null;
          added_at: string;
          updated_at: string;
          version: number;
          deleted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['media_items']['Row'], 'added_at' | 'updated_at' | 'version'> & {
          added_at?: string;
          updated_at?: string;
          version?: number;
        };
        Update: Partial<Database['public']['Tables']['media_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'media_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      sync_conflicts: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          local_payload: Record<string, unknown>;
          remote_payload: Record<string, unknown>;
          detected_at: string;
          resolved_at: string | null;
          resolution: 'local' | 'remote' | 'merge' | null;
        };
        Insert: Omit<Database['public']['Tables']['sync_conflicts']['Row'], 'id' | 'detected_at'> & {
          id?: string;
          detected_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sync_conflicts']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'sync_conflicts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
