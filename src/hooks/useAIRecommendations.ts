'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db, RecommendationDBItem } from '../lib/db';
import { recommendationService } from '../services/recommendationService';
import { MediaType, WatchedItem } from '../types';
import { useToast } from '../contexts/ToastProvider';
import { logger } from '@/lib/logger';

export function useAIRecommendations(
  watched: WatchedItem[],
  watchlist: any[]
) {
  const { showToast } = useToast();
  const [recommendations, setRecommendations] = useState<RecommendationDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smart Filters State
  const [filterGenre, setFilterGenre] = useState<string>('All');
  const [filterLanguage, setFilterLanguage] = useState<string>('All');
  const [filterYearMin, setFilterYearMin] = useState<number>(1950);
  const [filterYearMax, setFilterYearMax] = useState<number>(new Date().getFullYear() + 2);
  const [filterRatingMin, setFilterRatingMin] = useState<number>(0);
  const [filterType, setFilterType] = useState<string>('All'); // 'All', 'movie', 'series', 'anime'
  const [filterMatchMin, setFilterMatchMin] = useState<number>(0);

  // Load cached recommendations on mount
  const loadCache = useCallback(async () => {
    try {
      const cached = await recommendationService.getCachedRecommendations();
      
      // Sort by creation date descending to show the newest generated batch first
      const sorted = cached.sort((a, b) => b.createdAt - a.createdAt);
      setRecommendations(sorted);
    } catch (err) {
      logger.error("[useAIRecommendations] Failed loading cache", { error: err });
    }
  }, []);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  // Generate new recommendations
  const refreshRecommendations = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    showToast("Generating AI recommendations...", "success");

    try {
      const allFeedbackHistory = await db.recommendations.toArray();
      const newRecs = await recommendationService.generateRecommendations(
        watched,
        watchlist,
        allFeedbackHistory
      );
      
      if (newRecs.length === 0) {
        throw new Error("No new titles resolved. Try adding more items to your history!");
      }

      showToast("Recommendations updated!", "success");
      // Reload from db to ensure we get the full consolidated list
      await loadCache();
    } catch (err: any) {
      logger.error("[useAIRecommendations] Generation failed", { error: err });
      const errMsg = err?.message || "Failed to contact OpenRouter API";
      setError(errMsg);
      showToast(`AI recommendations failed: ${errMsg}`, "error");
    } finally {
      setLoading(false);
    }
  }, [loading, watched, watchlist, loadCache, showToast]);

  // Debounced Refresh to prevent API abuse
  const debouncedRefresh = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        refreshRecommendations();
      }, 500);
    };
  }, [refreshRecommendations]);

  // Track Clicks
  const trackClick = useCallback(async (id: string) => {
    await recommendationService.updateRecommendationFeedback(id, 'clicked');
    setRecommendations(prev => 
      prev.map(item => item.id === id ? { ...item, feedback: 'clicked' } : item)
    );
  }, []);

  // Track Watchlist Addition
  const trackAddWatchlist = useCallback(async (id: string) => {
    await recommendationService.updateRecommendationFeedback(id, 'added_to_watchlist');
    setRecommendations(prev => 
      prev.map(item => item.id === id ? { ...item, feedback: 'added_to_watchlist' } : item)
    );
  }, []);

  // Track Watched Completion
  const trackMarkWatched = useCallback(async (id: string) => {
    await recommendationService.updateRecommendationFeedback(id, 'watched');
    setRecommendations(prev => 
      prev.map(item => item.id === id ? { ...item, feedback: 'watched' } : item)
    );
  }, []);

  // Track Thumbs Up
  const trackLike = useCallback(async (id: string) => {
    await recommendationService.updateRecommendationFeedback(id, 'liked');
    setRecommendations(prev => 
      prev.map(item => item.id === id ? { ...item, feedback: 'liked' } : item)
    );
    showToast("Feedback saved! AI will prioritize similar content.", "success");
  }, [showToast]);

  // Track Thumbs Down
  const trackDislike = useCallback(async (id: string) => {
    await recommendationService.updateRecommendationFeedback(id, 'disliked');
    setRecommendations(prev => 
      prev.map(item => item.id === id ? { ...item, feedback: 'disliked' } : item)
    );
    showToast("Disliked item. Removed from recommendations.", "success");
  }, [showToast]);

  // List of all genres present in recommendations for filter dropdown options
  const genresList = useMemo(() => {
    const genresSet = new Set<string>();
    recommendations.forEach(item => {
      item.genres?.forEach(g => genresSet.add(g));
    });
    return Array.from(genresSet).sort();
  }, [recommendations]);

  // List of all languages present in recommendations for filter dropdown options
  const languagesList = useMemo(() => {
    const langSet = new Set<string>();
    recommendations.forEach(item => {
      if (item.language) langSet.add(item.language);
    });
    return Array.from(langSet).sort();
  }, [recommendations]);

  // Filter recommendations locally
  const filteredRecommendations = useMemo(() => {
    // Collect active watchlist & watched IDs
    const watchedIds = new Set(watched.map(w => w.id));
    const watchlistIds = new Set(watchlist.map(w => w.id));

    return recommendations.filter(item => {
      // 1. Exclude already watched/watchlist items
      if (watchedIds.has(item.id)) return false;
      if (watchlistIds.has(item.id)) return false;

      // 2. Exclude disliked recommendations
      if (item.feedback === 'disliked') return false;

      // 3. Media Type filter
      if (filterType !== 'All') {
        if (filterType === 'anime' && item.mediaType !== MediaType.Anime) return false;
        if (filterType === 'movie' && item.mediaType !== MediaType.Movie) return false;
        if (filterType === 'series' && item.mediaType !== MediaType.Series) return false;
      }

      // 4. Genre filter
      if (filterGenre !== 'All' && !item.genres.includes(filterGenre)) return false;

      // 5. Language filter
      if (filterLanguage !== 'All' && item.language !== filterLanguage) return false;

      // 6. Year range filter
      if (item.releaseYear < filterYearMin || item.releaseYear > filterYearMax) return false;

      // 7. Rating filter
      if (item.rating < filterRatingMin) return false;

      // 8. Match Score filter
      if (item.matchScore < filterMatchMin) return false;

      return true;
    });
  }, [
    recommendations,
    watched,
    watchlist,
    filterType,
    filterGenre,
    filterLanguage,
    filterYearMin,
    filterYearMax,
    filterRatingMin,
    filterMatchMin
  ]);

  return {
    recommendations: filteredRecommendations,
    loading,
    error,
    refreshRecommendations: debouncedRefresh,
    trackClick,
    trackAddWatchlist,
    trackMarkWatched,
    trackLike,
    trackDislike,
    
    // Genres & Languages lists for filter elements
    genresList,
    languagesList,

    // Filter values and setters
    filterGenre,
    setFilterGenre,
    filterLanguage,
    setFilterLanguage,
    filterYearMin,
    setFilterYearMin,
    filterYearMax,
    setFilterYearMax,
    filterRatingMin,
    setFilterRatingMin,
    filterType,
    setFilterType,
    filterMatchMin,
    setFilterMatchMin
  };
}
