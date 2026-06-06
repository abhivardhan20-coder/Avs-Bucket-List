/**
 * Supabase Client Configuration
 * ==============================
 * Single-user offline-first app with Supabase as the authoritative remote.
 * Uses Google OAuth for authentication, RLS for authorization.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Supabase features will be unavailable until .env.local is configured.'
  );
}

export const supabase: SupabaseClient<Database> = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : (new Proxy({} as SupabaseClient<Database>, {
      get() {
        throw new Error(
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local'
        );
      }
    }));

/**
 * Helper: Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
};

/**
 * Helper: Get current user's UUID
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
};

/**
 * Helper: Refresh auth session
 */
export const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw error;
  return data.session;
};
