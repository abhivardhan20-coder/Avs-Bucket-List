
import React, { useState, useEffect, useMemo } from 'react';
import { Play, Info, Bookmark, Star, Calendar, Bell, ExternalLink, ImageOff } from 'lucide-react';
import { MediaItem } from '../types';
import { fetchTrailerKey } from '../services/tmdb';
import { resolveUpcomingContent } from '../lib/dateUtils';
import { openYouTubeTrailer } from '../lib/videoUtils';

interface HeroProps {
  items: MediaItem[];
  onMoreInfo: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
}

const Hero: React.FC<HeroProps> = ({
  items,
  onMoreInfo,
  isInWatchlist,
  onToggleWatchlist,
}) => {
  const [heroState, setHeroState] = useState({
    index: 0,
    imgError: false
  });
  const [fetchedTrailerId, setFetchedTrailerId] = useState<string | undefined>(undefined);

  // Auto-rotate hero items
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroState(prev => ({
        index: (prev.index + 1) % items.length,
        imgError: false
      }));
      setFetchedTrailerId(undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, [items.length]);

  // Fetch trailer for current item if missing
  useEffect(() => {
    let cancelled = false;
    const item = items[heroState.index];
    if (item && !item.trailerId) {
      fetchTrailerKey(item.id).then(key => {
        if (!cancelled && key) {
          setFetchedTrailerId(key);
        }
      });
    }
    return () => { cancelled = true; };
  }, [heroState.index, items]);

  const item = items[heroState.index];

  // ✅ Update hero image preload link when URL is known for faster LCP
  useEffect(() => {
    const backdropUrl = item?.backdropUrl || item?.posterUrl;
    if (!backdropUrl) return;
    const link = document.getElementById('hero-preload') as HTMLLinkElement;
    if (link) link.href = backdropUrl;
  }, [item?.backdropUrl, item?.posterUrl]);


  // Resolve upcoming status for the hero item
  const upcoming = useMemo(() => item ? resolveUpcomingContent(item) : null, [item]);

  // Crossfade: track both current and previous image
  const [bgLoaded, setBgLoaded] = useState(false);
  const [prevImage, setPrevImage] = useState<string | undefined>(undefined);
  const currentImage = item?.backdropUrl || item?.posterUrl;

  const [prevIndex, setPrevIndex] = useState(heroState.index);

  if (prevIndex !== heroState.index) {
    setPrevIndex(heroState.index);
    setBgLoaded(false);
  }

  const handleBgLoad = () => {
    setPrevImage(currentImage);
    setBgLoaded(true);
  };

  if (!item) return null;

  const handlePlay = () => {
    const trailerToPlay = item?.trailerId || fetchedTrailerId;
    if (trailerToPlay) {
      openYouTubeTrailer(trailerToPlay);
    } else {
      // Fallback to YouTube search if no trailer ID is found yet
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`, '_blank');
    }
  };

  const matchScore = Math.round(item.rating * 10);
  const inList = isInWatchlist(item.id);

  return (
    <div className="relative h-[80vh] md:h-[90vh] w-full text-white overflow-hidden group bg-black">
      <div className="absolute top-0 left-0 w-full h-full">
        {heroState.imgError || (!item.backdropUrl && !item.posterUrl) ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] flex items-center justify-center">
            <div className="text-center opacity-30">
              <ImageOff className="w-32 h-32 mx-auto mb-4" />
            </div>
          </div>
        ) : (
          <>
            {/* Previous image layer — stays visible until new image loads */}
            {prevImage && prevImage !== currentImage && (
              <img
                src={prevImage}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* Current image layer — fades in on load */}
            <img
              key={`hero-bg-${item.id}`}
              src={currentImage || undefined}
              alt={item.title}
              loading={heroState.index === 0 ? 'eager' : 'lazy'}
              fetchPriority={heroState.index === 0 ? 'high' : 'auto'}
              decoding="async"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={handleBgLoad}
              onError={() => setHeroState(prev => ({ ...prev, imgError: true }))}
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 via-transparent to-transparent"></div>
      </div>

      <div className="absolute inset-0 flex flex-col justify-end px-6 md:px-12 pb-20 md:pb-32 pt-24 z-10 pointer-events-none">
        <div className="pointer-events-auto max-w-2xl lg:max-w-3xl" key={`hero-info-${item.id}`}>
          <div className="flex items-center gap-3 mb-4 animate-slide-up">
            <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-white/20">{item.type}</span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-7xl font-black mb-6 drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] animate-slide-up leading-[1.1] cursor-pointer" onClick={() => onMoreInfo(item)}>{item.title}</h1>

          <div className="flex flex-col gap-6 animate-slide-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-gray-200">
              <span className="text-[#46d369]">{matchScore}% Match</span>
              <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{item.rating.toFixed(1)}</div>
              <span>{item.year}</span>
              <span className="border border-gray-400 px-1.5 py-0.5 text-[10px] rounded">HD</span>

              {/* UPCOMING BADGE FOR HERO */}
              {upcoming && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide shadow-lg border animate-in fade-in slide-in-from-left-4 ${upcoming.status === 'urgent'
                    ? 'bg-red-600 border-red-500 text-white shadow-red-900/50'
                    : 'bg-white/20 border-white/30 text-white backdrop-blur-md'
                  }`}>
                  {upcoming.status === 'urgent' ? (
                    <Bell className="w-3.5 h-3.5 fill-current animate-bounce" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  {upcoming.labelText}
                </div>
              )}
            </div>
            <p className="text-lg text-gray-200 drop-shadow-md line-clamp-3 md:line-clamp-4 leading-relaxed max-w-xl">{item.overview}</p>
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlay}
                className="flex items-center gap-3 bg-white text-black px-10 py-3 rounded font-bold hover:bg-gray-200 transition-all transform active:scale-95 group/play"
              >
                <Play className="w-6 h-6 fill-black group-hover/play:fill-red-600 transition-colors" />
                Play Trailer
                <ExternalLink className="w-4 h-4 text-gray-500 ml-1 opacity-0 group-hover/play:opacity-100 transition-opacity" />
              </button>
              <button onClick={() => onMoreInfo(item)} className="flex items-center gap-3 bg-gray-500/50 hover:bg-gray-500/70 text-white px-10 py-3 rounded font-bold transition-all backdrop-blur-md"><Info className="w-6 h-6" /> More Info</button>
              <button onClick={(e) => { e.stopPropagation(); onToggleWatchlist(e, item.id); }} className={`p-3 border-2 rounded-full transition-all ${inList ? 'bg-white border-white text-black' : 'border-gray-400 text-white hover:border-white'}`} title={inList ? "In Bucket List" : "Add to Bucket List"}><Bookmark className={`w-6 h-6 ${inList ? 'fill-current' : ''}`} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 right-12 flex items-center gap-4 z-20">
        <div className="px-4 py-1 border-l-4 border-gray-400 bg-black/40 text-sm font-bold w-24 text-center">{heroState.index + 1} / {items.length}</div>
      </div>
    </div>
  );
};

export default Hero;