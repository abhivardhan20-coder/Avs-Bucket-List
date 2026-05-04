import React from 'react';
import { Loader, Play, VideoOff, ExternalLink, Bookmark, Check, Calendar, Bell, Zap } from 'lucide-react';
import { MediaItem } from '../../types';
import OptimizedImage from '../OptimizedImage';

interface ContentHeroProps {
  item: MediaItem;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  onPlayTrailer: () => void;
  loadingAction: boolean;
  isInWatchlist: boolean;
  isWatched: boolean;
  noTrailer: boolean;
  loadingDetails: boolean;
  upcomingRes: any;
  loadingTrailer: boolean;
}

const ContentHero: React.FC<ContentHeroProps> = ({
  item,
  onToggleWatchlist,
  onToggleWatched,
  onPlayTrailer,
  loadingAction,
  isInWatchlist,
  isWatched,
  noTrailer,
  loadingDetails,
  upcomingRes,
  loadingTrailer
}) => {
  return (
    <div className="relative h-[40vh] md:h-[60vh] w-full bg-[#1a1a1a]">
      {loadingDetails ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 animate-pulse">
          <Loader className="w-12 h-12 text-red-600 animate-spin" />
        </div>
      ) : !item.backdropUrl && !item.posterUrl ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#252525] text-gray-600">
          <p className="text-xl font-bold uppercase tracking-widest opacity-30">{item.title}</p>
        </div>
      ) : (
        <OptimizedImage
          src={item.backdropUrl || item.posterUrl || ''}
          alt={item.title}
          priority={true}
          sizes="100vw"
          className="w-full h-full object-cover object-top"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent" />

      {/* Unified Upcoming Badge */}
      {upcomingRes && (
        <div className={`absolute top-6 left-6 z-40 px-4 py-2 rounded-full border shadow-2xl animate-in fade-in zoom-in slide-in-from-top-4 duration-700 flex items-center gap-2 backdrop-blur-md ${upcomingRes.daysRemaining === 0
          ? 'bg-red-600 border-red-400 text-white shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-pulse'
          : upcomingRes.status === 'urgent'
            ? 'bg-red-600 border-red-500 text-white shadow-red-950/40'
            : 'bg-black/60 border-white/20 text-white'
          }`}>
          {upcomingRes.daysRemaining === 0 ? (
            <Zap className="w-4 h-4 fill-current animate-bounce" />
          ) : upcomingRes.status === 'urgent' ? (
            <Bell className="w-4 h-4 fill-current animate-bounce" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          <span className="text-[11px] font-black uppercase tracking-widest">
            {upcomingRes.labelText}
          </span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">{item.title}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onPlayTrailer}
            disabled={loadingTrailer || noTrailer}
            className={`px-8 py-3 rounded font-black transition-all active:scale-95 flex items-center gap-2 group ${noTrailer ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}`}
            title="Opens in YouTube"
          >
            {loadingTrailer ? <Loader className="w-5 h-5 animate-spin text-black" /> : (noTrailer ? <VideoOff className="w-5 h-5" /> : <Play className="w-5 h-5 fill-black" />)}
            {loadingTrailer ? 'Loading...' : (noTrailer ? 'No Trailer' : 'Trailer')}
            {!loadingTrailer && !noTrailer && <ExternalLink className="w-3 h-3 text-black/50 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />}
          </button>
          <button onClick={onToggleWatchlist} className={`p-3 border-2 rounded-full transition-all ${isInWatchlist ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'border-gray-700 text-white hover:border-white'}`}><Bookmark className={`w-5 h-5 ${isInWatchlist ? 'fill-current' : ''}`} /></button>
          <button onClick={onToggleWatched} disabled={loadingAction} className={`p-3 border-2 border-gray-700 rounded-full hover:border-white transition-all ${isWatched ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'text-white'}`}>{loadingAction ? <Loader className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}</button>
        </div>

      </div>
    </div>
  );
};

export default ContentHero;
