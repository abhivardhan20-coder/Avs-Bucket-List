import { supabase } from './supabaseClient';
import { MediaItemRow } from '../types/database.types';
import { logger } from '@/lib/logger';

/**
 * Fast shallow comparison difference calculator.
 * Kept for settings comparison.
 */
export function fastDiff<T extends Record<string, any>>(curr: T, prev: T | Partial<T> | undefined): Partial<T> | null {
  if (!prev) return curr;
  const delta: Partial<T> = {};
  let changed = false;

  for (const k in curr) {
    if (curr[k] !== prev[k]) {
      delta[k] = curr[k];
      changed = true;
    }
  }

  return changed ? delta : null;
}

/**
 * Fetch Watchlist items for a user from Supabase.
 * Optimized using compound index on (user_id, updated_at desc).
 */
export const fetchWatchlistFromSupabase = async (userId: string): Promise<MediaItemRow[]> => {
  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'watchlist')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('[Supabase] fetchWatchlistFromSupabase failed:', error);
    throw error;
  }
  return data || [];
};

/**
 * Fetch Watched items for a user from Supabase.
 * Optimized using compound index on (user_id, updated_at desc).
 */
export const fetchWatchedFromSupabase = async (userId: string): Promise<MediaItemRow[]> => {
  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'watchlist')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('[Supabase] fetchWatchedFromSupabase failed:', error);
    throw error;
  }
  return data || [];
};

/**
 * Fetch delta sync items (updates & soft deletes) for a user from Supabase.
 */
export const fetchDeltaFromSupabase = async (userId: string, since: string): Promise<MediaItemRow[]> => {
  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });

  if (error) {
    logger.error('[Supabase] fetchDeltaFromSupabase failed:', error);
    throw error;
  }
  return data || [];
};

/**
 * Upsert a single media item or an array of items in Supabase.
 */
export const upsertMediaItemInSupabase = async (
  itemOrItems: Omit<MediaItemRow, 'added_at' | 'updated_at'> | Omit<MediaItemRow, 'added_at' | 'updated_at'>[]
): Promise<void> => {
  // Ensure deleted_at is explicitly set to null on active upsert (clears soft deletes if re-added)
  const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
  const itemsWithNullDelete = items.map(item => ({
    ...item,
    deleted_at: null,
    version: (item.version || 0) + 1,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('media_items')
    .upsert(itemsWithNullDelete, { onConflict: 'user_id,id', ignoreDuplicates: false });

  if (error) {
    logger.error('[Supabase] upsertMediaItemInSupabase failed:', error);
    throw error;
  }
};

/**
 * Delete a media item from Supabase (Soft Delete).
 */
export const deleteMediaItemFromSupabase = async (id: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('media_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    logger.error('[Supabase] deleteMediaItemFromSupabase failed:', error);
    throw error;
  }
};

/**
 * Check connection health with Supabase.
 */
export const checkBackendHealth = async (): Promise<{
  success: boolean;
  message: string;
  reason?: 'unauthenticated' | 'unreachable' | 'error';
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, message: "Not authenticated", reason: 'unauthenticated' };
    }
    // Verify query connectivity using a head select on media_items
    const { error } = await supabase
      .from('media_items')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return { success: false, message: error.message, reason: 'unreachable' };
    }
    return { success: true, message: "Connected to Supabase" };
  } catch (err) {
    return { 
      success: false, 
      message: err instanceof Error ? err.message : "Connection failed",
      reason: 'unreachable'
    };
  }
};
