import React from 'react';
import { Clock, Film, Tv, Zap, X } from 'lucide-react';

interface WatchBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    hours: number;
    minutes?: number;
    hoursMovies: number;
    minutesMovies?: number;
    hoursSeries: number;
    minutesSeries?: number;
    hoursAnime: number;
    minutesAnime?: number;
  };
}

const WatchBreakdownModal: React.FC<WatchBreakdownModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] p-8 rounded-[32px] border border-white/10 shadow-2xl max-w-sm w-full relative animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
          <Clock className="w-6 h-6 text-red-500" />
          Watch Breakdown
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <Film className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-200">Movies</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">{stats.hoursMovies}</span>
              <span className="text-sm font-medium text-gray-500 ml-1 mr-2">h</span>
              {stats.minutesMovies !== undefined && (
                <>
                  <span className="text-2xl font-bold text-white">{stats.minutesMovies}</span>
                  <span className="text-sm font-medium text-gray-500 ml-1">m</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <Tv className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-200">Series</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">{stats.hoursSeries}</span>
              <span className="text-sm font-medium text-gray-500 ml-1 mr-2">h</span>
              {stats.minutesSeries !== undefined && (
                <>
                  <span className="text-2xl font-bold text-white">{stats.minutesSeries}</span>
                  <span className="text-sm font-medium text-gray-500 ml-1">m</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-200">Anime</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">{stats.hoursAnime}</span>
              <span className="text-sm font-medium text-gray-500 ml-1 mr-2">h</span>
              {stats.minutesAnime !== undefined && (
                <>
                  <span className="text-2xl font-bold text-white">{stats.minutesAnime}</span>
                  <span className="text-sm font-medium text-gray-500 ml-1">m</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-red-600/10 border border-red-600/20 text-sm font-bold text-red-500">
            <span>Total: {stats.hours}h {stats.minutes || 0}m invested</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchBreakdownModal;