'use client';

import { useCallback, useState } from 'react';
import { MediaItem, MediaType } from '@/types';
import { db } from '@/lib/db';
import { hydrateSeries } from '@/services/tmdb';
import { fetchMediaItem } from '@/lib/api/mediaFetcher';
import { useLibraryActions, useLibraryData } from '@/contexts/AppContext';
import { toast } from 'sonner';

/**
 * Custom hook to handle common media toggle operations such as adding to watchlist
 * or marking items as watched. Internally hooks into Library actions and Toast.
 */
export function useMediaToggles() {
  const { isInWatchlist, isWatched } = useLibraryData();
  const { removeFromWatchlist, addToWatchlist, unmarkMovie, unmarkSeries, markMovieAsWatched, markSeriesAsWatched } = useLibraryActions();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleWatchlist = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isInWatchlist(id)) {
      await removeFromWatchlist(id);
    } else {
      const item = await db.mediaCache.get(id);
      if (item) await addToWatchlist(item);
    }
  }, [isInWatchlist, removeFromWatchlist, addToWatchlist]);

  const handleToggleWatched = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = await db.mediaCache.get(id);
    if (!item) return;

    if (isWatched(id)) {
      if (item.type === MediaType.Movie) await unmarkMovie(item);
      else await unmarkSeries(item);
    } else {
      setIsProcessing(true);
      try {
        let fullItem = item;
        const needsHydration = 
          (!item.runtime) || 
          (!item.rating) || 
          (item.type !== MediaType.Movie && (!item.seasons || item.seasons.length === 0));

        if (needsHydration) {
          const fullItemData = await fetchMediaItem(
            item.id, 
            item.type === MediaType.Movie ? 'movie' : 'tv', 
            item.type === MediaType.Anime
          );
          
          if (fullItemData) {
            const merged = {
              ...item,
              runtime: item.runtime ?? fullItemData.runtime,
              rating: item.rating ?? fullItemData.rating,
              seasons: item.seasons ?? fullItemData.seasons
            } as MediaItem;
            
            await db.mediaCache.put(merged);
            fullItem = merged;
          }
        }

        if (fullItem.type === MediaType.Movie) {
          await markMovieAsWatched(fullItem);
        } else {
          const hydrated = await hydrateSeries(fullItem);
          await db.mediaCache.put(hydrated);
          await markSeriesAsWatched(hydrated);
        }
      } catch {
        toast.error("Status update interruption.");
      } finally {
        setIsProcessing(false);
      }
    }
  }, [isWatched, unmarkMovie, unmarkSeries, markMovieAsWatched, markSeriesAsWatched]);

  return {
    handleToggleWatchlist,
    handleToggleWatched,
    isProcessing,
  };
}
