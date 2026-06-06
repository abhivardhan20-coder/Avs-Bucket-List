import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { db } from '../lib/db';
import { rowToWatchlistItem, rowToWatchedItem, fromWatchlistItem, fromWatchedItem } from '../utils/dbMappers';
import { logger } from '../lib/logger';
import { MediaItemRow } from '../types/database.types';

export function useSyncRealtime(
  user: any,
  isDemo: boolean,
  setLastSyncTime: (val: number) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || isDemo) return;

    logger.debug(`[SyncProvider] Subscribing to media_items realtime channel for user: ${user.id}`);
    const channel = supabase
      .channel(`media_items:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_items', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          logger.debug('[SyncProvider] Postgres change received:', payload);
          const eventType = payload.eventType;
          const newRow = payload.new as MediaItemRow | null;
          const oldRow = payload.old as { id: string } | null;

          await db.transaction('rw', db.watchlist, db.watched, async () => {
            if (eventType === 'DELETE' && oldRow?.id) {
              await db.watchlist.delete([user.email, oldRow.id]);
              await db.watched.delete([user.email, oldRow.id]);
            } else if (newRow) {
              if (newRow.deleted_at) {
                await db.watchlist.delete([user.email, newRow.id]);
                await db.watched.delete([user.email, newRow.id]);
              } else if (newRow.status === 'watchlist') {
                const item = rowToWatchlistItem(newRow);
                await db.watchlist.put(fromWatchlistItem(item, user.email));
                await db.watched.delete([user.email, newRow.id]);
              } else {
                const item = rowToWatchedItem(newRow);
                await db.watched.put(fromWatchedItem(item, user.email));
                await db.watchlist.delete([user.email, newRow.id]);
              }
            }
          });

          queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] });
          queryClient.invalidateQueries({ queryKey: ['watched', user.id] });
          setLastSyncTime(Date.now());
        }
      )
      .subscribe();

    return () => {
      logger.debug(`[SyncProvider] Unsubscribing from media_items realtime channel`);
      channel.unsubscribe();
    };
  }, [user, isDemo, queryClient, setLastSyncTime]);
}
