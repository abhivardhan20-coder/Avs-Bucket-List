'use client';

import React, { useEffect, useMemo } from 'react';
import { useAIRecommendations } from '../../hooks/useAIRecommendations';
import ContentCard from '../ContentCard';
import HorizontalScrollContainer from '../HorizontalScrollContainer';
import { Sparkles, RefreshCw, FilterX } from 'lucide-react';
import { MediaItem, MediaType, WatchedItem } from '../../types';
import { RecommendationDBItem } from '../../lib/db';

interface AIRecommendationsRowProps {
  watched: WatchedItem[];
  watchlist: any[];
  onCardClick: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  zh: 'Chinese',
  ru: 'Russian',
  pt: 'Portuguese',
};

const getLanguageName = (code: string) => {
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
};

/** Convert a RecommendationDBItem to a standard MediaItem, injecting AI details into the overview. */
function toMediaItem(rec: RecommendationDBItem): MediaItem {
  const aiDetailsLines: string[] = [];

  if (rec.reason) {
    aiDetailsLines.push(`🤖 Why this pick: ${rec.reason}`);
  }
  if (rec.similarity) {
    aiDetailsLines.push(`🔗 Similar to: ${rec.similarity}`);
  }
  if (rec.matchScore) {
    aiDetailsLines.push(`✨ ${rec.matchScore}% match based on your watch history`);
  }

  const aiSuffix = aiDetailsLines.length > 0 ? '\n\n' + aiDetailsLines.join('\n') : '';
  const enrichedOverview = (rec.overview || '') + aiSuffix;

  return {
    id: rec.id,
    title: rec.title,
    type: rec.mediaType,
    posterUrl: rec.posterUrl,
    backdropUrl: rec.backdropUrl,
    rating: rec.rating,
    year: rec.releaseYear,
    genres: rec.genres,
    overview: enrichedOverview,
  };
}

const AIRecommendationsRow: React.FC<AIRecommendationsRowProps> = ({
  watched,
  watchlist,
  onCardClick,
  isInWatchlist,
  onToggleWatchlist,
  isWatched,
  onToggleWatched
}) => {
  const {
    recommendations,
    loading,
    error,
    refreshRecommendations,
    trackClick,
    trackAddWatchlist,
    trackMarkWatched,
    
    genresList,
    languagesList,

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
  } = useAIRecommendations(watched, watchlist);

  // Auto trigger on first load if history is populated but cache is empty
  useEffect(() => {
    if (watched.length > 0 && recommendations.length === 0 && !loading && !error) {
      refreshRecommendations();
    }
  }, [watched.length, recommendations.length, loading, error, refreshRecommendations]);

  // Convert recommendation DB items to standard MediaItem objects
  const mediaItems = useMemo(() => {
    return recommendations.map(toMediaItem);
  }, [recommendations]);

  // Build a quick lookup for matchScore badges
  const matchScores = useMemo(() => {
    const map = new Map<string, number>();
    recommendations.forEach(rec => {
      if (rec.matchScore) map.set(rec.id, rec.matchScore);
    });
    return map;
  }, [recommendations]);

  const handleCardClick = (item: MediaItem) => {
    trackClick(item.id);
    onCardClick(item);
  };

  const handleToggleWatchlistWithTracking = (e: React.MouseEvent, id: string) => {
    trackAddWatchlist(id);
    onToggleWatchlist(e, id);
  };

  const handleToggleWatchedWithTracking = (e: React.MouseEvent, id: string) => {
    trackMarkWatched(id);
    onToggleWatched(e, id);
  };

  const clearFilters = () => {
    setFilterGenre('All');
    setFilterLanguage('All');
    setFilterYearMin(1950);
    setFilterYearMax(new Date().getFullYear() + 2);
    setFilterRatingMin(0);
    setFilterType('All');
    setFilterMatchMin(0);
  };

  return (
    <div className="px-4 md:px-12 space-y-6">
      {/* Title & Control Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
              AI Picks For You
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Personalized recommendations based on your viewing history and preferences.
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={refreshRecommendations}
          disabled={loading || watched.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 disabled:from-white/5 disabled:to-white/5 disabled:text-gray-500 text-white rounded-xl font-bold text-xs tracking-wide transition-all active:scale-95 shadow-lg shadow-purple-950/20 border border-purple-500/20 disabled:border-white/5 group"
        >
          <RefreshCw className={`w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing Taste...' : 'Refresh AI Picks'}
        </button>
      </div>

      {/* Filters Bar */}
      {watched.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-[#171717] border border-gray-800/80 p-4 rounded-2xl shadow-xl backdrop-blur-md">
          {/* Media Type Button Group */}
          <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
            {['All', 'movie', 'series', 'anime'].map((type) => {
              const isActive = filterType === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-md text-[10px] md:text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                    isActive
                      ? 'bg-purple-600/90 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {type === 'movie' ? 'Movies' : type === 'series' ? 'Series' : type}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-gray-800 hidden md:block"></div>

          {/* Genre Dropdown */}
          <div className="flex flex-col gap-1.5">
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="bg-[#222]/80 border border-gray-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-500/50 backdrop-blur-md cursor-pointer transition-all min-w-[100px]"
            >
              <option value="All">All Genres</option>
              {genresList.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Language Dropdown */}
          <div className="flex flex-col gap-1.5">
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="bg-[#222]/80 border border-gray-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-500/50 backdrop-blur-md cursor-pointer transition-all min-w-[110px]"
            >
              <option value="All">All Languages</option>
              {languagesList.map(code => (
                <option key={code} value={code}>{getLanguageName(code)}</option>
              ))}
            </select>
          </div>

          {/* Match Score Dropdown */}
          <div className="flex flex-col gap-1.5">
            <select
              value={filterMatchMin}
              onChange={(e) => setFilterMatchMin(Number(e.target.value))}
              className="bg-[#222]/80 border border-gray-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-500/50 backdrop-blur-md cursor-pointer transition-all"
            >
              <option value={0}>Any Match %</option>
              <option value={95}>95%+ Match</option>
              <option value={90}>90%+ Match</option>
              <option value={80}>80%+ Match</option>
              <option value={70}>70%+ Match</option>
            </select>
          </div>

          {/* Rating Dropdown */}
          <div className="flex flex-col gap-1.5">
            <select
              value={filterRatingMin}
              onChange={(e) => setFilterRatingMin(Number(e.target.value))}
              className="bg-[#222]/80 border border-gray-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-500/50 backdrop-blur-md cursor-pointer transition-all"
            >
              <option value={0}>Any Rating</option>
              <option value={8}>8.0+ ★</option>
              <option value={7}>7.0+ ★</option>
              <option value={6}>6.0+ ★</option>
              <option value={5}>5.0+ ★</option>
            </select>
          </div>

          {/* Year Ranges */}
          <div className="flex items-center gap-1 bg-[#222]/80 border border-gray-800 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mr-1">Years</span>
            <input
              type="number"
              value={filterYearMin}
              onChange={(e) => setFilterYearMin(Number(e.target.value))}
              className="w-12 bg-transparent focus:outline-none font-bold text-center text-white"
              min={1950}
              max={new Date().getFullYear() + 2}
            />
            <span className="text-gray-500 font-bold">-</span>
            <input
              type="number"
              value={filterYearMax}
              onChange={(e) => setFilterYearMax(Number(e.target.value))}
              className="w-12 bg-transparent focus:outline-none font-bold text-center text-white"
              min={1950}
              max={new Date().getFullYear() + 2}
            />
          </div>

          {/* Clear Filters Button */}
          {(filterGenre !== 'All' || filterLanguage !== 'All' || filterYearMin !== 1950 || filterYearMax !== new Date().getFullYear() + 2 || filterRatingMin !== 0 || filterType !== 'All' || filterMatchMin !== 0) && (
            <button
              onClick={clearFilters}
              className="text-purple-400 hover:text-purple-300 text-xs font-bold flex items-center gap-1.5 ml-auto px-3 py-2 hover:bg-white/5 rounded-xl transition-all"
            >
              <FilterX className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {watched.length === 0 ? (
        <div className="bg-[#171717] rounded-3xl border border-gray-800 p-12 text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20 shadow-2xl">
            <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-white font-bold text-lg">Your History is Empty</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              We need to know what you like before we can recommend anything. Mark a few movies or TV shows as watched to kickstart your personalized AI Recommendations!
            </p>
          </div>
        </div>
      ) : loading && recommendations.length === 0 ? (
        // Loading Skeleton State
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={`skeleton-${idx}`} className="w-full aspect-[2/3] bg-white/5 rounded-2xl animate-pulse flex items-center justify-center border border-white/5 shadow-inner">
              <Sparkles className="w-8 h-8 text-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-[#171717] rounded-3xl border border-gray-800 py-16 text-center flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <div className="p-3.5 bg-gray-900/80 rounded-full border border-gray-800">
            <Sparkles className="w-6 h-6 text-gray-600" />
          </div>
          <p className="text-gray-400 text-sm font-medium">
            No recommendations match your current filters.
          </p>
          <button
            onClick={clearFilters}
            className="text-xs font-black text-purple-400 hover:text-purple-300 uppercase tracking-widest bg-purple-500/10 hover:bg-purple-500/20 px-4 py-2.5 rounded-full transition-all border border-purple-500/20 mt-1"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <HorizontalScrollContainer>
          {mediaItems.map((item) => {
            const score = matchScores.get(item.id);
            return (
              <div key={`ai-rec-card-${item.id}`} className="snap-start">
                <ContentCard
                  item={item}
                  onClick={handleCardClick}
                  isInWatchlist={isInWatchlist(item.id)}
                  onToggleWatchlist={handleToggleWatchlistWithTracking}
                  isWatched={isWatched(item.id)}
                  onToggleWatched={handleToggleWatchedWithTracking}
                  badgeText={score ? `${score}% Match` : undefined}
                  badgeColor="bg-purple-600"
                />
              </div>
            );
          })}
          <div className="w-12 flex-shrink-0" />
        </HorizontalScrollContainer>
      )}
    </div>
  );
};

export default React.memo(AIRecommendationsRow);
