import { useState, useCallback, useEffect } from 'react';
import { MediaItem, MediaType, Season } from '../types';
import { fetchDetails, fetchSeasonDetails, hydrateSeries, fetchTrailerKey } from '../services/tmdb';
import { openYouTubeTrailer } from '../lib/videoUtils';
import { useLibrary } from '../contexts/AppContext';

export function useContentModalState(
  initialItem: MediaItem, 
  showToast: (msg: string, type: 'error' | 'success') => void
) {
  const { 
    isInWatchlist, addToWatchlist, removeFromWatchlist, 
    isWatched, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries
  } = useLibrary();

  const [item, setItem] = useState<MediaItem>(initialItem);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [noTrailer, setNoTrailer] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [retryingSeasonId, setRetryingSeasonId] = useState<string | null>(null);

  // Sync state with initialItem if it changes (e.g. on navigation)
  useEffect(() => {
    setItem(initialItem);
    setExpandedSeason(null);
    setNoTrailer(false);
  }, [initialItem]);

  const loadDetails = useCallback(async (baseItem: MediaItem) => {
    setLoadingDetails(true);
    try {
      const details = await fetchDetails(baseItem.id);
      if (details) {
        const merged = { ...baseItem, ...details } as MediaItem;
        setItem(merged);
        
        if (merged.type !== MediaType.Movie) {
          const hydrated = await hydrateSeries(merged);
          setItem(hydrated);
        }
      }
    } catch (error) {
      console.error("Failed to load details", error);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const handleToggleWatchlist = async () => {
    const res = await (isInWatchlist(item.id) ? removeFromWatchlist(item.id) : addToWatchlist(item));
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleToggleWatched = async () => {
    if (isWatched(item.id)) {
      const res = await (item.type === MediaType.Movie ? unmarkMovie(item) : unmarkSeries(item));
      showToast(res.message, res.success ? 'success' : 'error');
    } else {
      setLoadingAction(true);
      try {
        if (item.type === MediaType.Movie) {
          let movieItem = item;
          if (!movieItem.runtime) {
            try {
              const details = await fetchDetails(item.id);
              if (details) {
                movieItem = { ...item, ...details } as MediaItem;
                setItem(movieItem);
              }
            } catch {
              console.error("Failed to fetch runtime for movie stats");
            }
          }
          const res = await markMovieAsWatched(movieItem);
          showToast(res.message, res.success ? 'success' : 'error');
        } else {
          const hydratedItem = await hydrateSeries(item);
          setItem(hydratedItem);
          const res = await markSeriesAsWatched(hydratedItem);
          showToast(res.message, res.success ? 'success' : 'error');
        }
      } catch {
        showToast("Failed to retrieve episodes. Cannot mark series as watched.", "error");
      } finally {
        setLoadingAction(false);
      }
    }
  };

  const handlePlayTrailer = async () => {
    if (item.trailerId) {
      const success = openYouTubeTrailer(item.trailerId);
      if (!success) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`, '_blank');
      return;
    }

    setLoadingTrailer(true);
    try {
      const trailerKey = await fetchTrailerKey(item.id);
      if (trailerKey) {
        setItem(prev => ({ ...prev, trailerId: trailerKey }));
        openYouTubeTrailer(trailerKey);
      } else {
        setNoTrailer(true);
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`, '_blank');
      }
    } catch (error) {
      console.error("Trailer fetch error:", error);
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`, '_blank');
    } finally {
      setLoadingTrailer(false);
    }
  };

  const handleRetrySeason = async (season: Season) => {
    setRetryingSeasonId(season.id);
    try {
      const episodes = await fetchSeasonDetails(item.id, season.number);
      if (!episodes) throw new Error("No episodes");

      setItem(prev => {
        if (!prev.seasons) return prev;
        const newSeasons = prev.seasons.map(s =>
          s.id === season.id ? { ...s, episodes, loadError: false } : s
        );
        return { ...prev, seasons: newSeasons };
      });
      showToast(`Season ${season.number} loaded successfully`, 'success');
    } catch {
      showToast(`Retry failed for Season ${season.number}.`, 'error');
    } finally {
      setRetryingSeasonId(null);
    }
  };

  return {
    item, setItem,
    loadingDetails, expandedSeason, setExpandedSeason,
    loadingTrailer, noTrailer, setNoTrailer,
    loadingAction, retryingSeasonId,
    loadDetails, handleToggleWatchlist, handleToggleWatched,
    handlePlayTrailer, handleRetrySeason
  };
}
