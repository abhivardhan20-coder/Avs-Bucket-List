import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MediaItem, MediaType } from '../types';
import { Bookmark, Check, Play, Loader, VideoOff } from 'lucide-react';
import { fetchTrailerKey } from '../services/tmdb';
import { openYouTubeTrailer } from '../lib/videoUtils';
import OptimizedImage from './OptimizedImage';
import { getStandardBadge } from '../lib/dateUtils';

interface ContentCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
  progress?: number; // 0 to 100
  subtitleOverride?: string;
  badgeText?: string;
  badgeColor?: string;
  enableHoverFlip?: boolean;
}

const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onClick,
  isInWatchlist,
  onToggleWatchlist,
  isWatched,
  onToggleWatched,
  progress,
  subtitleOverride,
  badgeText,
  badgeColor,
  enableHoverFlip = false,
}) => {
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [noTrailer, setNoTrailer] = useState(false);
  const [isPrefetched, setIsPrefetched] = useState(false);
  const [localTrailerId, setLocalTrailerId] = useState<string | undefined>(undefined);

  // Auto-resolve badge if not provided
  const { text: resolvedBadge, color: resolvedColor } = useMemo(() => 
    getStandardBadge(item), [item]
  );

  const displayBadgeText = badgeText || resolvedBadge;
  const displayBadgeColor = badgeText ? (badgeColor || 'bg-red-600') : resolvedColor;

  // Reset state on target change
  useEffect(() => {
    setNoTrailer(false);
    setIsPrefetched(false);
    setLocalTrailerId(undefined);
  }, [item.id]);

  /**
   * Prefetch trailer key on hover to improve interaction speed
   */
  const handlePrefetchDetails = useCallback(async () => {
    if (isPrefetched || localTrailerId || item.trailerId || noTrailer) return;
    
    try {
      const key = await fetchTrailerKey(item.id);
      if (key) {
        setLocalTrailerId(key);
        setIsPrefetched(true);
      } else {
        setNoTrailer(true);
      }
    } catch {
      // Fail silently for prefetch
    }
  }, [item, isPrefetched, localTrailerId, noTrailer]);

  const handlePlayTrailer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingTrailer) return;

    const currentTrailerId = localTrailerId ?? item.trailerId;
    if (currentTrailerId) {
      openYouTubeTrailer(currentTrailerId);
      return;
    }

    setLoadingTrailer(true);
    try {
      const key = await fetchTrailerKey(item.id);
      if (key) {
        setLocalTrailerId(key);
        openYouTubeTrailer(key);
      } else {
        setNoTrailer(true);
        const searchQuery = `${item.title} trailer`;
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error("Failed to fetch trailer", err);
      const searchQuery = `${item.title} trailer`;
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
      setNoTrailer(true);
    } finally {
      setLoadingTrailer(false);
    }
  };

  return (
    <div
      className="relative group w-[160px] md:w-[200px] aspect-[2/3] bg-[#1a1a1a] rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.05] hover:z-20 shadow-2xl hover:shadow-red-900/30 border border-transparent hover:border-white/10 overflow-hidden"
      onClick={() => onClick(item)}
      onMouseEnter={handlePrefetchDetails}
    >
      <OptimizedImage
        src={item.posterUrl}
        alt={item.title}
        className="rounded-2xl shadow-inner w-full h-full object-cover"
      />

      {displayBadgeText && (
        <div className={`absolute top-2.5 left-2.5 px-2 py-1 ${displayBadgeColor} text-[9px] font-black rounded text-white shadow-2xl border border-white/10 backdrop-blur-md z-30 animate-in fade-in zoom-in duration-300`}>
          {displayBadgeText}
        </div>
      )}

      {progress !== undefined && progress > 0 && (
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-20 overflow-hidden`}>
          <div
            className="h-full bg-gradient-to-r from-red-600 via-red-500 to-orange-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-400 rounded-2xl flex flex-col justify-end p-5 backdrop-blur-[2px]">
        <h3 className="text-white font-black text-sm md:text-base mb-1.5 drop-shadow-2xl line-clamp-1 leading-tight tracking-tight">
          {item.title || 'Unknown Title'}
        </h3>

        <div className="relative h-[18px] mb-3 overflow-hidden">
          {subtitleOverride && (
            <div className={`transition-all duration-700 ease-in-out ${enableHoverFlip ? 'group-hover:-translate-y-full group-hover:opacity-0 group-hover:delay-[2000ms]' : ''}`}>
              <div className="text-red-500 font-black text-[9px] uppercase tracking-widest animate-pulse whitespace-nowrap overflow-hidden text-ellipsis">
                {subtitleOverride}
              </div>
            </div>
          )}
          
          <div className={`flex gap-2 items-center flex-wrap transition-all duration-700 ease-in-out ${
            enableHoverFlip 
              ? 'absolute inset-0 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-[2000ms]' 
              : (subtitleOverride ? 'hidden' : '')
          }`}>
            <span className="text-green-500 font-black text-[9px] uppercase tracking-widest bg-green-500/10 px-1.5 py-0.5 rounded">
              {(item.rating && Number(item.rating) > 0) ? `${Number(item.rating).toFixed(1)} IMDB` : 'NR'}
            </span>
            <span className="text-gray-400 text-[9px] font-bold border border-gray-700 px-1.5 py-0.5 rounded uppercase">{item.year || 'N/A'}</span>
            {item.totalEpisodes && (item.type === MediaType.Series || item.type === MediaType.Anime) && (
              <span className="text-gray-400 text-[9px] font-bold border border-gray-700 px-1.5 py-0.5 rounded uppercase">{item.totalEpisodes} eps</span>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 items-center">
          <button
            onClick={handlePlayTrailer}
            disabled={noTrailer}
            className={`bg-white rounded-full p-2.5 transition-all shadow-2xl flex items-center justify-center ${noTrailer ? 'opacity-30 cursor-not-allowed bg-gray-400' : 'hover:bg-gray-100 hover:scale-110 active:scale-90 hover:shadow-white/20'}`}
            title={noTrailer ? "Trailer not available" : "Play Trailer on YouTube"}
          >
            {loadingTrailer ? <Loader className="w-3.5 h-3.5 text-black animate-spin" /> : (noTrailer ? <VideoOff className="w-3.5 h-3.5 text-black" /> : <Play className="w-3.5 h-3.5 text-black fill-black" />)}
          </button>
          <button
            className={`border border-white/20 rounded-full p-2.5 transition-all hover:scale-110 active:scale-90 shadow-2xl ${isInWatchlist ? 'bg-red-600 border-red-600 text-white shadow-red-600/40' : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'}`}
            onClick={(e) => onToggleWatchlist(e, item.id)}
            title={isInWatchlist ? "Remove from Bucket List" : "Add to Bucket List"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isInWatchlist ? 'fill-current' : ''}`} />
          </button>
          <button
            className={`border border-white/20 rounded-full p-2.5 transition-all hover:scale-110 active:scale-90 shadow-2xl ${isWatched ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/40' : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'}`}
            onClick={(e) => onToggleWatched(e, item.id)}
            title={isWatched ? "Fully Watched" : "Mark as Watched"}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 text-[9px] text-gray-500 flex flex-wrap gap-1 font-black uppercase tracking-[0.1em]">
          {item.genres?.slice(0, 2).map((g, idx) => (
            <span key={g} className="hover:text-gray-300 transition-colors">{idx > 0 && '• '} {g}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// High-performance memoization with custom comparison for stable list rendering
export default React.memo(ContentCard, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.trailerId === next.item.trailerId && // Allow trailer updates
    prev.item.rating === next.item.rating &&       // Allow rating updates
    prev.item.totalEpisodes === next.item.totalEpisodes && // Allow hydration updates
    prev.isWatched === next.isWatched &&
    prev.isInWatchlist === next.isInWatchlist &&
    prev.progress === next.progress
  );
});