import React from 'react';
import { Tv, Clock } from 'lucide-react';
import { MediaItem, MediaType } from '../../types';

interface ContentOverviewProps {
  item: MediaItem;
  matchScore: number;
  upcomingRes: any;
  onGenreClick?: (genre: string) => void;
}

const ContentOverview: React.FC<ContentOverviewProps> = ({
  item,
  matchScore,
  upcomingRes,
  onGenreClick
}) => {
  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-wrap items-center gap-4 font-bold text-sm">
        <span className="text-[#46d369]">{matchScore}% Match</span>
        <span className="text-gray-400">{item.year}</span>
        
        {item.seasons && item.seasons.length > 1 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-600/30 rounded-lg text-blue-500 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-950/20">
            <Tv className="w-3 h-3" />
            Continuation Series
          </div>
        )}

        {item.runtime && item.runtime > 0 && (
          <span className="text-gray-400">
            {Math.floor(item.runtime / 60)}h {item.runtime % 60}m
          </span>
        )}

        <div className="flex items-center gap-3">
          {item.type !== MediaType.Movie && item.seasons && (
            <span className="text-gray-300 bg-white/10 px-2 py-0.5 rounded">{item.seasons.length} Seasons</span>
          )}
          <span className="border border-gray-600 px-1.5 py-0.5 text-[10px] rounded text-gray-400 uppercase tracking-widest">HD</span>
        </div>

        {upcomingRes && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border shadow-lg animate-in fade-in slide-in-from-left-4 duration-500 ${upcomingRes.daysRemaining === 0
            ? 'bg-red-600/20 border-red-500 text-red-500 animate-pulse'
            : upcomingRes.status === 'urgent'
              ? 'bg-red-950/20 border-red-600/30 text-red-500'
              : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {upcomingRes.labelText}
            </span>
          </div>
        )}
      </div>

      <p className="text-xl text-gray-200 leading-relaxed font-medium mb-4">{item.overview || "No description available for this title."}</p>

      {item.genres && item.genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.genres.map(genre => (
            <button
              key={genre}
              onClick={() => onGenreClick?.(genre)}
              className="px-4 py-2 bg-white/5 hover:bg-red-600/20 text-gray-300 hover:text-red-500 rounded-xl text-xs font-bold transition-all border border-white/5 hover:border-red-600/30"
            >
              {genre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentOverview;
