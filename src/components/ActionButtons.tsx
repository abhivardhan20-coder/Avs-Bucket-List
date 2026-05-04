
import React, { useState } from 'react';
import { Check, Loader, X } from 'lucide-react';
import { MediaItem, Season, Episode } from '../types';
import { useLibraryActions } from '../contexts/AppContext';
import { hydrateSeries, hydrateSeason } from '../services/tmdb';

// --- BUTTON COMPONENTS ---

interface ButtonProps {
  className?: string;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  disabled?: boolean;
}

const BaseButton: React.FC<ButtonProps> = ({ className, children, onClick, title, disabled }) => (
  <button 
    onClick={onClick}
    className={className}
    title={title}
    disabled={disabled}
  >
    {children}
  </button>
);

interface SeriesActionButtonProps {
  item: MediaItem;
  className?: string;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export const MarkSeriesButton: React.FC<SeriesActionButtonProps> = ({ item, className, onSuccess, onError }) => {
  const { isWatched, unmarkSeries, markSeriesAsWatched } = useLibraryActions();
  const [loading, setLoading] = useState(false);
  const watched = isWatched(item.id);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (watched) {
      // Unmark is simple, no fetching needed
      const res = await unmarkSeries(item);
      if (res.success && onSuccess) onSuccess(res.message);
      if (!res.success && onError) onError(res.message);
    } else {
      // Mark Watched requires hydration
      setLoading(true);
      try {
        const fullItem = await hydrateSeries(item);
        const res = await markSeriesAsWatched(fullItem);
        if (res.success && onSuccess) onSuccess(res.message);
        if (!res.success && onError) onError(res.message);
      } catch {
        if (onError) onError("Failed to load episodes.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <BaseButton 
      onClick={handleClick}
      className={`${className} ${watched ? 'bg-green-600 border-green-600 text-white' : 'text-white'}`}
      title={watched ? "Mark as Unwatched" : "Mark as Watched"}
      disabled={loading}
    >
      {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Check className="w-6 h-6" />}
    </BaseButton>
  );
};

interface SeasonActionButtonProps {
  item: MediaItem;
  season: Season;
  className?: string;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  // Callback to update parent state with new episodes
  onEpisodesLoaded?: (episodes: Episode[]) => void; 
}

export const MarkSeasonButton: React.FC<SeasonActionButtonProps> = ({ item, season, className, onSuccess, onError, onEpisodesLoaded }) => {
  const { markSeasonAsWatched, unmarkSeason, isEpisodeWatched } = useLibraryActions();
  const [loading, setLoading] = useState(false);

  // Determine status based on current loaded episodes (if any)
  // If episodes aren't loaded, we assume unwatched for UI purposes unless we know better
  const episodes = season.episodes || [];
  const allWatched = episodes.length > 0 && episodes.every(e => isEpisodeWatched(item.id, e.id));

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (allWatched) {
      // Unmark requires episodes to be present to calculate runtime removal correctly
      if (!season.episodes || season.episodes.length === 0) {
        setLoading(true);
        const hydrated = await hydrateSeason(item, season);
        if (onEpisodesLoaded && hydrated.episodes) onEpisodesLoaded(hydrated.episodes);
        const res = await unmarkSeason(item, hydrated);
        setLoading(false);
        if (res.success && onSuccess) onSuccess(res.message);
        else if (onError) onError(res.message);
      } else {
        const res = await unmarkSeason(item, season);
        if (res.success && onSuccess) onSuccess(res.message);
        else if (onError) onError(res.message);
      }
    } else {
      // Mark requires hydration
      if (!season.episodes || season.episodes.length === 0) {
        setLoading(true);
        const hydrated = await hydrateSeason(item, season);
        if (onEpisodesLoaded && hydrated.episodes) onEpisodesLoaded(hydrated.episodes);
        const res = await markSeasonAsWatched(item, hydrated);
        setLoading(false);
        if (res.success && onSuccess) onSuccess(res.message);
        else if (onError) onError(res.message);
      } else {
        const res = await markSeasonAsWatched(item, season);
        if (res.success && onSuccess) onSuccess(res.message);
        else if (onError) onError(res.message);
      }
    }
  };

  return (
    <BaseButton 
      onClick={handleClick}
      className={className}
      disabled={loading}
    >
      {loading ? <Loader className="w-5 h-5 animate-spin" /> : (allWatched ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />)}
      {loading ? 'Loading...' : (allWatched ? 'Mark Season Unwatched' : 'Mark Season Watched')}
    </BaseButton>
  );
};