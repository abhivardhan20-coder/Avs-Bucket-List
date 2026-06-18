import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { MediaItem, MediaType } from '@/types';
import { hydrateSeries } from '../services/tmdb';
import { fetchMediaItem } from '../lib/api/mediaFetcher';
import { useLibrary } from '../contexts/AppContext';
import { resolveUpcomingContent } from '../lib/dateUtils';
import { usePersonCredits } from '../hooks/usePersonCredits';
import { useGenreResults } from '../hooks/useGenreResults';
import { useContentModalState } from '../hooks/useContentModalState';
import Modal from './ui/Modal';

// Lazy loaded sections
const SeasonEpisodePanel = React.lazy(() => import('./ContentModal/SeasonEpisodePanel'));
const TrailerPanel = React.lazy(() => import('./ContentModal/TrailerPanel'));
const ContentHero = React.lazy(() => import('./ContentModal/ContentHero'));
const ContentOverview = React.lazy(() => import('./ContentModal/ContentOverview'));
const PersonCreditsModal = React.lazy(() => import('./ContentModal/PersonCreditsModal'));
const GenreResultsModal = React.lazy(() => import('./ContentModal/GenreResultsModal'));
const ContentSidePanel = React.lazy(() => import('./ContentModal/ContentSidePanel'));

interface ContentModalProps {
  item: MediaItem;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (item: MediaItem) => void;
  initialEpisodeId?: string;
}

/**
 * A modal component that displays detailed information about a selected media item.
 * Features include cast listing, trailer playback, similar content recommendations,
 * and user interactions (watchlist, watched status).
 *
 * @component
 * @param {ContentModalProps} props - The component props.
 * @param {MediaItem} props.item - The media item to display details for.
 * @param {() => void} props.onClose - Callback fired when the modal requests to be closed.
 * @returns {React.ReactElement} The ContentModal dialog.
 */
const ContentModal: React.FC<ContentModalProps> = ({ item: initialItem, isOpen, onClose, onNavigate }) => {
  const { 
    isInWatchlist, addToWatchlist, removeFromWatchlist, 
    isWatched, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries,
    isEpisodeWatched
  } = useLibrary();

  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'episodes' | 'trailer'>('overview');

  const INITIAL_VISIBLE_COUNT = 10;
  const LOAD_MORE_BATCH = 10;

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const {
    item,
    loadingDetails, expandedSeason, setExpandedSeason,
    loadingTrailer, noTrailer,
    loadingAction, retryingSeasonId,
    loadDetails, handleToggleWatchlist, handleToggleWatched,
    handlePlayTrailer, handleRetrySeason
  } = useContentModalState(initialItem, showToast);

  const {
    selectedPerson, setSelectedPerson,
    allPersonCredits, visiblePersonCredits,
    loadingCredits, creditsError,
    handlePersonClick, handleCreditsScroll
  } = usePersonCredits(INITIAL_VISIBLE_COUNT, LOAD_MORE_BATCH);

  const {
    selectedGenre, setSelectedGenre,
    genreResults, loadingGenre, genreError,
    handleGenreClick, handleGenreScroll
  } = useGenreResults(item.type);

  const [prevItemId, setPrevItemId] = useState(initialItem?.id);
  if (initialItem?.id !== prevItemId) {
    setPrevItemId(initialItem?.id);
    setSelectedPerson(null);
    setSelectedGenre(null);
    setActiveTab('overview');
  }

  useEffect(() => {
    if (isOpen && initialItem) {
      loadDetails(initialItem);
    }
  }, [initialItem, isOpen, loadDetails]);

  const handleNavigate = (newItem: MediaItem) => {
    setSelectedPerson(null);
    setSelectedGenre(null);
    if (onNavigate) onNavigate(newItem);
  };

  const handleEpisodesTabClick = () => {
    setActiveTab('episodes');
    
    // Auto-expand season if there's a next up episode
    if (userNextUp) {
      setExpandedSeason(userNextUp.seasonId);
    }
  };



  const userNextUp = (() => {
    if (item.type === MediaType.Movie || !item.seasons) return null;
    for (const season of item.seasons) {
      if (!season.episodes) continue;
      const firstUnwatched = season.episodes.find(ep => !isEpisodeWatched(item.id, ep.id));
      if (firstUnwatched) {
        return { seasonId: season.id, episodeId: firstUnwatched.id };
      }
    }
    return null;
  })();

  // Robust scroll to next episode using a MutationObserver
  useEffect(() => {
    if (activeTab === 'episodes' && userNextUp) {
      const scrollToElement = () => {
        const nextUpElement = document.getElementById(`ep-next-up-${item.id}`);
        const episodeElement = document.getElementById(`ep-${userNextUp.episodeId}`);
        const elementToScroll = nextUpElement || episodeElement;
        
        if (elementToScroll) {
          elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      };

      if (scrollToElement()) return undefined;

      const observer = new MutationObserver((mutations, obs) => {
        if (scrollToElement()) obs.disconnect();
      });
      
      const modalBody = document.getElementById('content-modal-body') || document.body;
      observer.observe(modalBody, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
    return undefined;
  }, [activeTab, userNextUp, item.id]);

  const upcomingRes = useMemo(() => resolveUpcomingContent(item), [item]);
  const matchScore = Math.round(item.rating * 10);

  if (!isOpen || !item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="modal-title"
      overlayClassName="bg-black"
      className="w-full h-full"
      zIndex={150}
      closeOnBackdropClick={false}
    >
      <div className="w-screen h-screen overflow-y-auto no-scrollbar scroll-smooth">
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

            <Suspense fallback={<div className="lg:col-span-4 bg-white/5 rounded-3xl animate-pulse h-96" />}>
              <ContentSidePanel 
                item={item} 
                upcomingRes={upcomingRes} 
                handlePersonClick={handlePersonClick} 
              />
            </Suspense>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"><div className="w-full max-w-2xl h-[80vh] bg-[#141414] rounded-2xl animate-pulse" /></div>}>
        <PersonCreditsModal
          selectedPerson={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onRetry={handlePersonClick}
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

      <Suspense fallback={<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"><div className="w-full max-w-4xl h-[80vh] bg-[#141414] rounded-2xl animate-pulse" /></div>}>
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
    </Modal>
  );
};

export default ContentModal;