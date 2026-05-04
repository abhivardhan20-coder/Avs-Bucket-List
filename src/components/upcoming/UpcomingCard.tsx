import React, { useMemo, useState } from 'react';
import { MediaItem, MediaType } from '../../types';
import { Play, Bookmark, Check, Loader, VideoOff } from 'lucide-react';
import { resolveUpcomingContent } from '../../lib/dateUtils';
import { fetchTrailerKey } from '../../services/tmdb';
import { openYouTubeTrailer } from '../../lib/videoUtils';
import OptimizedImage from '../OptimizedImage';

interface UpcomingCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched?: boolean;
  onToggleWatched?: (e: React.MouseEvent, id: string) => void;
  isMySchedule?: boolean;
}

const UpcomingCard: React.FC<UpcomingCardProps> = React.memo(({
  item,
  onClick,
  isInWatchlist,
  onToggleWatchlist,
  isWatched = false,
  onToggleWatched,
}) => {
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [noTrailer, setNoTrailer] = useState(false);

  const upcoming = useMemo(() => resolveUpcomingContent(item), [item]);

  if (!upcoming) return null;

  const handlePlayTrailer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingTrailer) return;

    if (item.trailerId) {
      openYouTubeTrailer(item.trailerId);
      return;
    }

    setLoadingTrailer(true);
    try {
      const key = await fetchTrailerKey(item.id);
      if (key) {
        item.trailerId = key;
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
    >
      <OptimizedImage
        src={item.posterUrl}
        alt={item.title}
        className="rounded-2xl shadow-inner w-full h-full object-cover"
      />
      
      {/* Dynamic Release Badge */}
      <div className={`absolute top-2.5 left-2.5 px-2 py-1 ${
        upcoming.status === 'urgent' ? 'bg-red-600' : 'bg-black/60'
      } text-[9px] font-black rounded text-white shadow-2xl border border-white/10 backdrop-blur-md z-30 animate-in fade-in zoom-in duration-300`}>
        {upcoming.labelText}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-400 rounded-2xl flex flex-col justify-end p-5 backdrop-blur-[2px]">
        <h3 className="text-white font-black text-sm md:text-base mb-1.5 drop-shadow-2xl line-clamp-1 leading-tight tracking-tight">
          {item.title}
        </h3>

        <div className="relative h-[18px] mb-3 overflow-hidden">
          <div className="flex gap-2 items-center flex-wrap">
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
          {onToggleWatched && (
            <button
              className={`border border-white/20 rounded-full p-2.5 transition-all hover:scale-110 active:scale-90 shadow-2xl ${isWatched ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/40' : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'}`}
              onClick={(e) => onToggleWatched(e, item.id)}
              title={isWatched ? "Fully Watched" : "Mark as Watched"}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="mt-3 text-[9px] text-gray-500 flex flex-wrap gap-1 font-black uppercase tracking-[0.1em]">
          {item.genres?.slice(0, 2).map((g, idx) => (
            <span key={g} className="hover:text-gray-300 transition-colors">{idx > 0 && '• '} {g}</span>
          ))}
        </div>
      </div>
    </div>
  );
});

UpcomingCard.displayName = 'UpcomingCard';

export default UpcomingCard;