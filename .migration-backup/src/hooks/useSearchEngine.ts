import { useState, useCallback } from 'react';
import { MediaItem, MediaType } from '../types';
import { searchMovies, searchSeries, searchAnime, unifiedSearch } from '../lib/search';

export function useSearchEngine(debouncedQuery: string, showToast: (msg: string, type: 'error'|'success') => void) {
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [anime, setAnime] = useState<MediaItem[]>([]);

  const [pages, setPages] = useState({ movies: 1, series: 1, anime: 1 });
  const [hasMore, setHasMore] = useState({ movies: true, series: true, anime: true });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState({ movies: false, series: false, anime: false });

  const resetSearchStates = useCallback(() => {
    setMovies([]);
    setSeries([]);
    setAnime([]);
    setPages({ movies: 1, series: 1, anime: 1 });
    setHasMore({ movies: true, series: true, anime: true });
    setLoading(false);
    setLoadingMore({ movies: false, series: false, anime: false });
  }, []);

  const performSearch = useCallback(async (isMounted: boolean) => {
    if (!debouncedQuery.trim()) {
      setMovies([]);
      setSeries([]);
      setAnime([]);
      return;
    }

    if (!navigator.onLine) {
      if (isMounted) showToast("You are offline. Please check your internet connection.", "error");
      return;
    }

    setLoading(true);
    setPages({ movies: 1, series: 1, anime: 1 });
    setHasMore({ movies: true, series: true, anime: true });

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 20000)
      );
      const searchPromise = unifiedSearch(debouncedQuery);
      const results = await Promise.race([searchPromise, timeoutPromise]);

      if (isMounted) {
        setMovies(results.movies || []);
        setSeries(results.series || []);
        setAnime(results.anime || []);
        setHasMore({
          movies: (results.movies || []).length >= 10,
          series: (results.series || []).length >= 10,
          anime: (results.anime || []).length >= 20
        });
      }
    } catch (err) {
      console.error("Search execution error:", err);
      if (isMounted) {
        const errMsg = err instanceof Error ? err.message : "Connection failed";
        if (errMsg.includes("502") || errMsg.includes("500") || errMsg.includes("Connection failed")) {
           showToast("Backend connection issue. Make sure the server is running.", "error");
        } else {
           showToast(`Search failed: ${errMsg}`, "error");
        }
        setMovies([]);
        setSeries([]);
        setAnime([]);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [debouncedQuery, showToast]);

  const loadMore = useCallback(async (type: MediaType) => {
    if (loading || !debouncedQuery.trim()) return;

    if (!navigator.onLine) {
      showToast("You are offline. Please check your internet connection.", "error");
      return;
    }

    const key = type === MediaType.Movie ? 'movies' : type === MediaType.Series ? 'series' : 'anime';
    if (!hasMore[key] || loadingMore[key]) return;

    setLoadingMore(prev => ({ ...prev, [key]: true }));
    const nextPage = pages[key] + 1;

    try {
      let nextResults: MediaItem[] = [];
      if (type === MediaType.Movie) nextResults = await searchMovies(debouncedQuery, nextPage);
      else if (type === MediaType.Series) nextResults = await searchSeries(debouncedQuery, nextPage);
      else if (type === MediaType.Anime) nextResults = await searchAnime(debouncedQuery, nextPage);

      if (nextResults.length === 0) {
        setHasMore(prev => ({ ...prev, [key]: false }));
      } else {
        if (type === MediaType.Movie) setMovies(prev => [...prev, ...nextResults]);
        else if (type === MediaType.Series) setSeries(prev => [...prev, ...nextResults]);
        else if (type === MediaType.Anime) setAnime(prev => [...prev, ...nextResults]);

        setPages(prev => ({ ...prev, [key]: nextPage }));
      }
    } catch (err) {
      console.error(`Failed to load more ${key}`, err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      showToast(`Unable to load more results: ${msg}`, "error");
    } finally {
      setLoadingMore(prev => ({ ...prev, [key]: false }));
    }
  }, [loading, debouncedQuery, showToast, hasMore, loadingMore, pages]);

  return {
    movies, series, anime,
    loading, loadingMore, hasMore,
    resetSearchStates, performSearch, loadMore
  };
}
