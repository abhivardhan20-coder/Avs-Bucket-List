import React from 'react';
import { RecommendationDBItem } from '../../lib/db';
import { Bookmark, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import OptimizedImage from '../OptimizedImage';

interface AIRecommendationCardProps {
  item: RecommendationDBItem;
  onClick: (item: any) => void;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  isInWatchlist: boolean;
  isWatched: boolean;
}

const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  item,
  onClick,
  onToggleWatchlist,
  onToggleWatched,
  onLike,
  onDislike,
  isInWatchlist,
  isWatched
}) => {
  const handleCardClick = () => {
    onClick(item);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike(item.id);
  };

  const handleDislike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDislike(item.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="relative group w-[160px] md:w-[200px] aspect-[2/3] bg-[#1a1a1a] rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.05] hover:z-20 shadow-2xl hover:shadow-purple-900/20 border border-transparent hover:border-purple-500/20 overflow-hidden"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Lazy Loaded Poster Image */}
      <OptimizedImage
        src={item.posterUrl}
        alt={item.title}
        className="rounded-2xl shadow-inner w-full h-full object-cover"
      />

      {/* Match Score Badge (Vibrant green emerald) */}
      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-emerald-600/90 text-[10px] font-black rounded-md text-white shadow-2xl border border-emerald-400/20 backdrop-blur-md z-30 animate-in fade-in zoom-in duration-300">
        {item.matchScore}% Match
      </div>

      {/* Hover Overlay containing AI details */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/30 opacity-0 group-hover:opacity-100 transition-all duration-400 rounded-2xl flex flex-col justify-end p-4 md:p-5 backdrop-blur-[3px] z-20">
        <h3 className="text-white font-black text-sm md:text-base mb-1 drop-shadow-2xl line-clamp-1 leading-tight tracking-tight">
          {item.title}
        </h3>

        <div className="flex gap-2 items-center flex-wrap mb-2">
          <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
            {item.matchScore}% Match
          </span>
          <span className="text-gray-400 text-[9px] font-bold border border-gray-700 px-1.5 py-0.5 rounded uppercase">
            {item.releaseYear}
          </span>
          <span className="text-gray-400 text-[9px] font-bold border border-gray-700 px-1.5 py-0.5 rounded uppercase">
            {item.rating > 0 ? `${item.rating.toFixed(1)} ★` : 'NR'}
          </span>
        </div>

        {/* AI generated reason */}
        <p className="text-gray-300 text-[10px] md:text-xs leading-relaxed italic mb-2 line-clamp-3">
          {item.reason}
        </p>

        {/* AI similarity explanation */}
        <p className="text-purple-400/95 text-[9px] font-medium leading-normal mb-3 line-clamp-2">
          <span className="font-bold text-gray-400 uppercase tracking-wider text-[8px] mr-1 block">AI Analysis</span>
          {item.similarity}
        </p>

        {/* Interaction controls */}
        <div className="flex gap-2 items-center">
          {/* Add to Watchlist */}
          <button
            className={`border rounded-full p-2 transition-all hover:scale-110 active:scale-90 shadow-lg ${
              isInWatchlist
                ? 'bg-red-600 border-red-600 text-white shadow-red-600/40'
                : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20 hover:text-white'
            }`}
            onClick={(e) => onToggleWatchlist(e, item.id)}
            title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isInWatchlist ? 'fill-current' : ''}`} />
          </button>

          {/* Mark as Watched */}
          <button
            className={`border rounded-full p-2 transition-all hover:scale-110 active:scale-90 shadow-lg ${
              isWatched
                ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/40'
                : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20 hover:text-white'
            }`}
            onClick={(e) => onToggleWatched(e, item.id)}
            title={isWatched ? "Fully Watched" : "Mark as Watched"}
          >
            <Check className="w-3.5 h-3.5" />
          </button>

          {/* Thumbs Up (Like) */}
          <button
            className={`border rounded-full p-2 transition-all hover:scale-110 active:scale-90 shadow-lg ${
              item.feedback === 'liked'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/40'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/15 hover:text-white'
            }`}
            onClick={handleLike}
            title="Relevance is High (Thumbs Up)"
          >
            <ThumbsUp className="w-3 h-3" />
          </button>

          {/* Thumbs Down (Dislike) */}
          <button
            className="border border-white/10 bg-white/5 text-gray-400 rounded-full p-2 transition-all hover:scale-110 active:scale-90 hover:bg-red-950/20 hover:border-red-600 hover:text-red-500 shadow-lg ml-auto"
            onClick={handleDislike}
            title="Irrelevant / Dislike recommendation"
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
        </div>

        {/* Genres */}
        <div className="mt-3 text-[9px] text-gray-500 flex flex-wrap gap-1 font-bold uppercase tracking-wider">
          {item.genres?.slice(0, 2).map((g, idx) => (
            <span key={g} className="truncate max-w-[80px]">
              {idx > 0 && '• '} {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AIRecommendationCard, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.matchScore === next.item.matchScore &&
    prev.item.feedback === next.item.feedback &&
    prev.isInWatchlist === next.isInWatchlist &&
    prev.isWatched === next.isWatched
  );
});
