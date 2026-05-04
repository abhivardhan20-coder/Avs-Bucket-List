import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { X, CheckCircle, AlertCircle, User, Calendar } from 'lucide-react';
import { MediaItem, MediaType, Season } from '@/types';
import { fetchDetails, fetchSeasonDetails, hydrateSeries, fetchPersonCredits, fetchTrailerKey, fetchContentByGenre } from '../services/tmdb';
import { fetchMediaItem } from '../lib/api/mediaFetcher';
import { useLibrary } from '../contexts/AppContext';
import { resolveUpcomingContent } from '../lib/dateUtils';
import { openYouTubeTrailer } from '../lib/videoUtils';

// Lazy loaded sections
const SeasonEpisodePanel = React.lazy(() => import('./ContentModal/SeasonEpisodePanel'));
const TrailerPanel = React.lazy(() => import('./ContentModal/TrailerPanel'));
const ContentHero = React.lazy(() => import('./ContentModal/ContentHero'));
const ContentOverview = React.lazy(() => import('./ContentModal/ContentOverview'));
const PersonCreditsModal = React.lazy(() => import('./ContentModal/PersonCreditsModal'));
const GenreResultsModal = React.lazy(() => import('./ContentModal/GenreResultsModal'));

interface ContentModalProps {
  item: MediaItem;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (item: MediaItem) => void;
  initialEpisodeId?: string;
}

const ContentModal: React.FC<ContentModalProps> = ({ item: initialItem, isOpen, onClose, onNavigate }) => {
  const { 
    isInWatchlist, addToWatchlist, removeFromWatchlist, 
    isWatched, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries,
    isEpisodeWatched
  } = useLibrary();

  const [item, setItem] = useState<MediaItem>(initialItem);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);
  const [noTrailer, setNoTrailer] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);
  const [retryingSeasonId, setRetryingSeasonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'episodes' | 'trailer'>('overview');

  // Person filmography states
  const [selectedPerson, setSelectedPerson] = useState<{ name: string; role: 'actor' | 'director' } | null>(null);
  const [allPersonCredits, setAllPersonCredits] = useState<MediaItem[]>([]);
  const [visiblePersonCredits, setVisiblePersonCredits] = useState<MediaItem[]>([]);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [creditsError, setCreditsError] = useState(false);

  // Genre exploration states
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreResults, setGenreResults] = useState<MediaItem[]>([]);
  const [loadingGenre, setLoadingGenre] = useState(false);
  const [genreError, setGenreError] = useState(false);
  const [genrePage, setGenrePage] = useState(1);
  const [hasMoreGenre, setHasMoreGenre] = useState(true);

  const INITIAL_VISIBLE_COUNT = 10;
  const LOAD_MORE_BATCH = 10;

  useEffect(() => {
    if (isOpen && initialItem) {
      setItem(initialItem);
      setExpandedSeason(null);
      setNoTrailer(false);
      setSelectedPerson(null);
      setSelectedGenre(null);
      setGenreResults([]);
      setActiveTab('overview');
      loadDetails(initialItem);
    }
  }, [initialItem, isOpen]);



  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const loadDetails = async (baseItem: MediaItem) => {
    setLoadingDetails(true);
    try {
      const details = await fetchDetails(baseItem.id);
      if (details) {
        const merged = { ...baseItem, ...details } as MediaItem;
        setItem(merged);
        
        // Background hydration for seasons/episodes
        if (merged.type !== MediaType.Movie) {
          const hydrated = await hydrateSeries(merged);
          setItem(hydrated);
        }
      }
    } catch (error) {
      console.error("Failed to load details", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleNavigate = (newItem: MediaItem) => {
    setSelectedPerson(null);
    setSelectedGenre(null);
    if (onNavigate) onNavigate(newItem);
  };

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleWatchlist = async () => {
    const res = await (isInWatchlist(item.id) ? removeFromWatchlist(item.id) : addToWatchlist(item));
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleToggleWatched = async () => {
    if (isWatched(item.id)) {
      const res = await (item.type === MediaType.Movie ? unmarkMovie(item) : unmarkSeries(item));
      showToast(res.message, res.success ? 'success' : 'error');
    } else {
      setLoadingAction(true);
      try {
        if (item.type === MediaType.Movie) {
          let movieItem = item;
          if (!movieItem.runtime) {
            try {
              const details = await fetchDetails(item.id);
              if (details) {
                movieItem = { ...item, ...details } as MediaItem;
                setItem(movieItem);
              }
            } catch {
              console.error("Failed to fetch runtime for movie stats");
            }
          }
          const res = await markMovieAsWatched(movieItem);
          showToast(res.message, res.success ? 'success' : 'error');
        } else {
          const hydratedItem = await hydrateSeries(item);
          setItem(hydratedItem);
          const res = await markSeriesAsWatched(hydratedItem);
          showToast(res.message, res.success ? 'success' : 'error');
        }
      } catch {
        showToast("Failed to retrieve episodes. Cannot mark series as watched.", "error");
      } finally {
        setLoadingAction(false);
      }
    }
  };

  const handlePlayTrailer = async () => {
    if (item.trailerId) {
      const success = openYouTubeTrailer(item.trailerId);
      if (!success) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`, '_blank');
      return;
    }

    setLoadingTrailer(true);
    try {
      const trailerKey = await fetchTrailerKey(item.id);
      if (trailerKey) {
        setItem(prev => ({ ...prev, trailerId: trailerKey }));
        openYouTubeTrailer(trailerKey);
      } else {
        setNoTrailer(true);
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`, '_blank');
      }
    } catch (error) {
      console.error("Trailer fetch error:", error);
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`, '_blank');
    } finally {
      setLoadingTrailer(false);
    }
  };

  const handleRetrySeason = async (season: Season) => {
    setRetryingSeasonId(season.id);
    try {
      const episodes = await fetchSeasonDetails(item.id, season.number);
      if (!episodes) throw new Error("No episodes");

      setItem(prev => {
        if (!prev.seasons) return prev;
        const newSeasons = prev.seasons.map(s =>
          s.id === season.id ? { ...s, episodes, loadError: false } : s
        );
        return { ...prev, seasons: newSeasons };
      });
      showToast(`Season ${season.number} loaded successfully`, 'success');
    } catch {
      showToast(`Retry failed for Season ${season.number}.`, 'error');
    } finally {
      setRetryingSeasonId(null);
    }
  };

  const handlePersonClick = async (name: string, role: 'actor' | 'director') => {
    setSelectedPerson({ name, role });
    setLoadingCredits(true);
    setCreditsError(false);
    try {
      const credits = await fetchPersonCredits(name, role);
      setAllPersonCredits(credits || []);
      setVisiblePersonCredits((credits || []).slice(0, INITIAL_VISIBLE_COUNT));
    } catch {
      setCreditsError(true);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleCreditsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    if (loadingCredits || visiblePersonCredits.length >= allPersonCredits.length) return;
    if (scrollLeft + clientWidth >= scrollWidth - 400) {
      const nextBatch = allPersonCredits.slice(visiblePersonCredits.length, visiblePersonCredits.length + LOAD_MORE_BATCH);
      setVisiblePersonCredits(prev => [...prev, ...nextBatch]);
    }
  };

  const handleGenreClick = async (genre: string) => {
    setSelectedGenre(genre);
    setLoadingGenre(true);
    setGenreError(false);
    setGenreResults([]);
    setGenrePage(1);
    setHasMoreGenre(true);
    try {
      const results = await fetchContentByGenre(genre, item.type, 1);
      setGenreResults(results);
      if (results.length < 20) setHasMoreGenre(false);
    } catch {
      setGenreError(true);
    } finally {
      setLoadingGenre(false);
    }
  };

  const handleEpisodesTabClick = () => {
    setActiveTab('episodes');
    
    // Auto-expand and scroll to next unwatched episode when episodes tab is clicked
    if (userNextUp) {
      setExpandedSeason(userNextUp.seasonId);
      // Wait longer for season to expand and DOM to render before scrolling
      setTimeout(() => {
        // Try both IDs for better reliability
        const nextUpElement = document.getElementById(`ep-next-up-${item.id}`);
        const episodeElement = document.getElementById(`ep-${userNextUp.episodeId}`);
        const elementToScroll = nextUpElement || episodeElement;
        
        if (elementToScroll) {
          elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500); // Increased delay to ensure DOM is ready
    }
  };

  const handleGenreScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    if (loadingGenre || !hasMoreGenre || !selectedGenre) return;
    if (scrollLeft + clientWidth >= scrollWidth - 400) {
      setLoadingGenre(true);
      const nextPage = genrePage + 1;
      try {
        const results = await fetchContentByGenre(selectedGenre, item.type, nextPage);
        if (results.length === 0) setHasMoreGenre(false);
        else {
          setGenreResults(prev => [...prev, ...results]);
          setGenrePage(nextPage);
          if (results.length < 20) setHasMoreGenre(false);
        }
      } catch {
        setHasMoreGenre(false);
      } finally {
        setLoadingGenre(false);
      }
    }
  };

  const userNextUp = useMemo(() => {
    if (item.type === MediaType.Movie || !item.seasons) return null;
    for (const season of item.seasons) {
      if (!season.episodes) continue;
      const firstUnwatched = season.episodes.find(ep => !isEpisodeWatched(item.id, ep.id));
      if (firstUnwatched) {
        return { seasonId: season.id, episodeId: firstUnwatched.id };
      }
    }
    return null;
  }, [item, isEpisodeWatched]);

  // Don't auto-expand episodes - user must explicitly click the episodes tab
  // This allows the modal to open to the overview by default
  // useEffect(() => {
  //   if (loadingDetails || !isOpen || !userNextUp) return;
  //   setExpandedSeason(userNextUp.seasonId);
  //   const timer = setTimeout(() => {
  //     const element = document.getElementById(`ep-next-up-${item.id}`);
  //     if (element) {
  //       element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //     }
  //   }, 800);
  //   return () => clearTimeout(timer);
  // }, [loadingDetails, isOpen, userNextUp?.episodeId, item.id]);

  const upcomingRes = useMemo(() => resolveUpcomingContent(item, undefined), [item]);
  const matchScore = Math.round(item.rating * 10);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black overflow-y-auto no-scrollbar scroll-smooth animate-in fade-in duration-500">
      <button 
        onClick={onClose} 
        className="fixed top-6 right-6 md:top-8 md:right-8 z-[200] p-3 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all backdrop-blur-md border border-white/5 shadow-2xl group active:scale-90"
        aria-label="Close modal"
      >
        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <Suspense fallback={<div className="h-[40vh] bg-white/5 animate-pulse" />}>
        <ContentHero 
          item={item} 
          onToggleWatchlist={handleToggleWatchlist} 
          onToggleWatched={handleToggleWatched} 
          onPlayTrailer={handlePlayTrailer}
          loadingAction={loadingAction}
          isInWatchlist={isInWatchlist(item.id)}
          isWatched={isWatched(item.id)}
          noTrailer={noTrailer}
          loadingDetails={loadingDetails}
          upcomingRes={upcomingRes}
          loadingTrailer={loadingTrailer}
        />
      </Suspense>

      <div className="flex border-b border-gray-800 bg-[#141414] sticky top-0 z-40">
        <button onClick={() => setActiveTab('overview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'overview' ? 'text-white border-b-2 border-red-600 bg-red-600/5' : 'text-gray-500 hover:text-gray-300'}`}>Overview</button>
        {(item.type === MediaType.Series || item.type === MediaType.Anime) && (
          <button onClick={handleEpisodesTabClick} className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'episodes' ? 'text-white border-b-2 border-red-600 bg-red-600/5' : 'text-gray-500 hover:text-gray-300'}`}>Episodes</button>
        )}
        <button onClick={() => setActiveTab('trailer')} className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'trailer' ? 'text-white border-b-2 border-red-600 bg-red-600/5' : 'text-gray-500 hover:text-gray-300'}`}>Trailer</button>
      </div>

      <div className="bg-[#141414]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-8 space-y-16">
              {activeTab === 'overview' && (
                <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-4 bg-white/5 w-1/4 rounded" /><div className="h-20 bg-white/5 w-full rounded" /></div>}>
                  <ContentOverview 
                    item={item} 
                    onGenreClick={handleGenreClick} 
                    matchScore={matchScore}
                    upcomingRes={upcomingRes}
                  />
                </Suspense>
              )}

              {activeTab === 'episodes' && (item.type === MediaType.Series || item.type === MediaType.Anime) && (
                <Suspense fallback={<div className="h-80 bg-white/5 rounded-xl animate-pulse" />}>
                  <SeasonEpisodePanel
                    item={item}
                    loadingDetails={loadingDetails}
                    expandedSeason={expandedSeason}
                    setExpandedSeason={setExpandedSeason}
                    retryingSeasonId={retryingSeasonId}
                    handleRetrySeason={handleRetrySeason}
                    userNextUp={userNextUp}
                  />
                </Suspense>
              )}

              {activeTab === 'trailer' && (
                <Suspense fallback={<div className="aspect-video bg-white/5 rounded-xl animate-pulse" />}>
                  <TrailerPanel trailerKey={item.trailerId || null} title={item.title} />
                </Suspense>
              )}
            </div>

            <div className="lg:col-span-4 space-y-12">
              {item.nextEpisode && (
                <div className="bg-red-600/10 border border-red-600/30 p-8 rounded-3xl shadow-2xl">
                  <span className="text-red-500 font-black text-[10px] uppercase tracking-widest block mb-4 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Next Release
                  </span>
                  <p className="text-white font-black text-2xl mb-2">{item.nextEpisode.name || `Episode ${item.nextEpisode.episodeNumber}`}</p>
                  <p className="text-gray-400 font-bold text-sm">Season {item.nextEpisode.seasonNumber} • {item.nextEpisode.airDate}</p>
                  {upcomingRes && <p className="text-red-600 font-black text-3xl mt-6 animate-pulse">{upcomingRes.labelText}</p>}
                </div>
              )}

              <div className="space-y-10">
                <div>
                  <span className="text-gray-500 font-black text-[10px] uppercase tracking-widest block mb-6">Starring</span>
                  <div className="flex flex-wrap gap-2">
                    {item.cast?.slice(0, 10).map(actor => (
                      <button key={actor} onClick={() => handlePersonClick(actor, 'actor')} className="px-4 py-2 bg-white/5 hover:bg-red-600/20 text-gray-300 hover:text-red-500 rounded-xl text-xs font-bold transition-all border border-white/5">{actor}</button>
                    ))}
                  </div>
                </div>
                {item.director && (
                  <div>
                    <span className="text-gray-500 font-black text-[10px] uppercase tracking-widest block mb-6">Director</span>
                    <button onClick={() => handlePersonClick(item.director!, 'director')} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all w-full text-left group">
                      <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><User className="w-6 h-6" /></div>
                      <div><p className="text-white font-black text-sm">{item.director}</p><p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Director</p></div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <PersonCreditsModal
          selectedPerson={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          loadingCredits={loadingCredits}
          creditsError={creditsError}
          visiblePersonCredits={visiblePersonCredits}
          allPersonCredits={allPersonCredits}
          onScroll={handleCreditsScroll}
          onNavigate={handleNavigate}
          isInWatchlist={isInWatchlist}
          addToWatchlist={addToWatchlist}
          removeFromWatchlist={removeFromWatchlist}
          isWatched={isWatched}
          markMovieAsWatched={markMovieAsWatched}
          unmarkMovie={unmarkMovie}
          markSeriesAsWatched={markSeriesAsWatched}
          unmarkSeries={unmarkSeries}
          hydrateSeries={hydrateSeries}
          fetchMediaItem={fetchMediaItem}
        />
      </Suspense>

      <Suspense fallback={null}>
        <GenreResultsModal
          selectedGenre={selectedGenre}
          onClose={() => setSelectedGenre(null)}
          loadingGenre={loadingGenre}
          genreError={genreError}
          genreResults={genreResults}
          itemType={item.type}
          onScroll={handleGenreScroll}
          onNavigate={handleNavigate}
          onRetry={handleGenreClick}
          isInWatchlist={isInWatchlist}
          addToWatchlist={addToWatchlist}
          removeFromWatchlist={removeFromWatchlist}
          isWatched={isWatched}
          markMovieAsWatched={markMovieAsWatched}
          unmarkMovie={unmarkMovie}
          markSeriesAsWatched={markSeriesAsWatched}
          unmarkSeries={unmarkSeries}
          hydrateSeries={hydrateSeries}
          fetchMediaItem={fetchMediaItem}
        />
      </Suspense>

      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full shadow-2xl z-[250] flex items-center gap-3 animate-in slide-in-from-bottom-5 border-2 ${toast.type === 'error' ? 'bg-red-950 border-red-600 text-red-200' : 'bg-green-950 border-green-600 text-green-200'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="font-black uppercase tracking-wider text-xs">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default ContentModal;