import { useCallback, useState } from 'react';
import { MediaItem, MediaType } from '@/types';
import { db } from '@/lib/db';
import { hydrateSeries } from '@/services/tmdb';
import { fetchMediaItem } from '@/lib/api/mediaFetcher';

/**
 * Custom hook to handle common media toggle operations such as adding to watchlist
 * or marking items as watched. Integrates with the AppContext library and
 * displays toast notifications for user feedback.
 * 
 * @param isInWatchlist - Function checking if an item is in the watchlist
 * @param removeFromWatchlist - Function to remove item from watchlist
 * @param addToWatchlist - Function to add item to watchlist
 * @param isWatched - Function checking if an item is fully watched
 * @param unmarkMovie - Function to unmark a movie as watched
 * @param unmarkSeries - Function to unmark a series as watched
 * @param markMovieAsWatched - Function to mark a movie as watched
 * @param markSeriesAsWatched - Function to mark a series as watched
 * @param setAppError - Function to set a global app error
 * @returns Object with `handleToggleWatchlist`, `handleToggleWatched`, and `isProcessing` boolean.
 */
export function useMediaToggles(
  isInWatchlist: (id: string) => boolean,
  removeFromWatchlist: (id: string) => Promise<any>,
  addToWatchlist: (item: MediaItem) => Promise<any>,
  isWatched: (id: string) => boolean,
  unmarkMovie: (item: MediaItem) => Promise<any>,
  unmarkSeries: (item: MediaItem) => Promise<any>,
  markMovieAsWatched: (item: MediaItem) => Promise<any>,
  markSeriesAsWatched: (item: MediaItem) => Promise<any>,
  setAppError: (error: string | null) => void
) {
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
        setAppError("Status update interruption.");
        setTimeout(() => setAppError(null), 3000);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [isWatched, unmarkMovie, unmarkSeries, markMovieAsWatched, markSeriesAsWatched, setAppError]);

  return {
    handleToggleWatchlist,
    handleToggleWatched,
    isProcessing,
  };
}
