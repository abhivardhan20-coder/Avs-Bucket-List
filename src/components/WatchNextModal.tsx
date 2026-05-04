import React, { useEffect, useState, useCallback } from 'react';
import { X, Zap, Play, ChevronRight, AlertCircle, Sparkles, Clock, Star } from 'lucide-react';
import { useLibraryData, useAuth, useSync } from '../contexts/AppContext';
import { buildUserTaste } from '../lib/recommendationEngine';
import { rankWatchlistForNext, WatchNextCandidate } from '../lib/watchNextEngine';
import { MediaItem } from '../types';

interface WatchNextModalProps {
  isOpen: boolean;
  onClose: () => void;
  setSelectedContent: (item: MediaItem, episodeId?: string) => void;
}

export const WatchNextModal: React.FC<WatchNextModalProps> = ({ isOpen, onClose, setSelectedContent }) => {
  const { user } = useAuth();
  const { getMediaDetails } = useSync();
  const { watchlist } = useLibraryData();
  const [candidates, setCandidates] = useState<WatchNextCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isWheelLocked, setIsWheelLocked] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    const preparePicks = async () => {
      setLoading(true);
      try {
        const taste = await buildUserTaste(user.email);
        const picks = rankWatchlistForNext(watchlist, taste);
        setCandidates(picks);
      } catch (err) {
        console.error("Failed to generate picks", err);
      } finally {
        setLoading(false);
      }
    };

    preparePicks();
  }, [isOpen, watchlist, user]);


  const currentPick = candidates[currentIndex];

  const handleStartWatching = useCallback(async (candidate: WatchNextCandidate) => {
    onClose();
    // Fetch full details if necessary, then select
    const fullItem = await getMediaDetails(candidate.item.id, candidate.item.type);
    if (fullItem) {
      // If candidate has a next episode, we deep link to it
      setSelectedContent(fullItem, candidate.item.nextEpisode?.id);
    }
  }, [onClose, getMediaDetails, setSelectedContent]);

  const nextPick = useCallback(() => {
    if (candidates.length === 0) return;
    setCurrentIndex(prev => (prev < candidates.length - 1 ? prev + 1 : 0));
  }, [candidates.length]);

  const prevPick = useCallback(() => {
    if (candidates.length === 0) return;
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : candidates.length - 1));
  }, [candidates.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextPick();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPick();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (candidates[currentIndex]) handleStartWatching(candidates[currentIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextPick, prevPick, candidates, currentIndex, handleStartWatching]);

  // Wheel handling
  const handleWheel = (e: React.WheelEvent) => {
    if (isWheelLocked) return;
    
    if (Math.abs(e.deltaY) > 30) {
      if (e.deltaY > 0) nextPick();
      else prevPick();
      
      setIsWheelLocked(true);
      setTimeout(() => setIsWheelLocked(false), 500); // 500ms debounce
    }
  };

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) { // Threshold for swipe
      if (diff > 0) nextPick();
      else prevPick();
    }
    setTouchStart(null);
  };
  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-red-600/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-xl shadow-lg shadow-red-900/40">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Decider Engine</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Top picks from your watchlist</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div 
          className="relative min-h-[350px] flex flex-col items-center justify-center p-6 active:cursor-grabbing"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Hydrating Taste Profile...</p>
            </div>
          ) : candidates.length > 0 ? (
            <div className="w-full space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {/* Card UI */}
              <div className="relative group">
                <div className="aspect-[2/3] w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
                  <img 
                    src={currentPick.item.poster} 
                    alt={currentPick.item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                  
                  {/* Badge */}
                  <div className="absolute top-4 left-4 px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">
                    Pick #{currentIndex + 1}
                  </div>
                </div>

                {/* Interactive Dynamic Indicator */}
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                   {candidates.map((_, i) => (
                     <button 
                      key={i} 
                      onClick={() => setCurrentIndex(i)}
                      className={`w-1.5 h-12 rounded-full transition-all duration-500 ${i === currentIndex ? 'bg-red-600 h-16' : 'bg-white/10 hover:bg-white/20'}`} 
                      aria-label={`Show pick ${i + 1}`}
                     />
                   ))}
                </div>
              </div>

              {/* Info Area */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-white leading-none">{currentPick.item.title}</h3>
                <div className="flex items-center justify-center gap-3 text-xs font-bold text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-red-500" /> {currentPick.item.year}</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-current" /> {currentPick.item.rating?.toFixed(1)}</span>
                </div>
                
                <div className="mt-4 px-4 py-2 bg-white/5 rounded-xl border border-white/5 inline-flex items-center gap-2 text-[11px] text-red-400 font-black uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  {currentPick.reason}
                </div>

                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-2 animate-pulse">
                  Scroll or Swipe to cycle
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => handleStartWatching(currentPick)}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-red-900/30"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Start Watching
                </button>
                
                <button 
                  onClick={nextPick}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  Skip for now
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-gray-700 mx-auto" />
              <p className="text-gray-500 font-bold max-w-[200px] mx-auto">Your watchlist is empty or items lack metadata.</p>
              <button onClick={onClose} className="text-red-500 font-black uppercase tracking-widest text-xs pt-4">Add some titles</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
