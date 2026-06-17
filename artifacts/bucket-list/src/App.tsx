import React, { Suspense, useCallback } from 'react';
import { useAuth, useWatchlist, useWatched } from '@/contexts/AppContext';
import { useUI } from '@/contexts/UIContext';
import { MediaItem } from '@/types';

import StatsListModal from '@/components/stats/StatsListModal';
import { RootLayout } from '@/layouts/RootLayout';
import ContentModal from '@/components/ContentModal';
import LoginPage from '@/components/LoginPage';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useMediaToggles } from '@/hooks/useMediaToggles';
import { useStatsModalData } from '@/hooks/useStatsModalData';
import { dbService } from '@/services/dbService';
import { AppRoutes } from '@/AppRoutes';

// Lazy Pages for better initial load performance
const Home = lazyWithRetry(() => import(/* webpackChunkName: "home" */ '@/pages/Home').then(module => ({ default: module.Home })));
const Upcoming = lazyWithRetry(() => import(/* webpackChunkName: "upcoming" */ '@/pages/Upcoming').then(module => ({ default: module.Upcoming })));
const Watchlist = lazyWithRetry(() => import(/* webpackChunkName: "watchlist" */ '@/pages/Watchlist').then(module => ({ default: module.Watchlist })));
const Watched = lazyWithRetry(() => import(/* webpackChunkName: "watched" */ '@/pages/Watched').then(module => ({ default: module.Watched })));
const StatsDashboard = lazyWithRetry(() => import(/* webpackChunkName: "stats" */ '@/components/stats/StatsDashboard'));

function App() {
  const { user } = useAuth();
  const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { watched, unmarkMovie, unmarkSeries, markMovieAsWatched, markSeriesAsWatched, isWatched } = useWatched();

  const {
    isSearchOpen, setIsSearchOpen,
    isSettingsOpen, setIsSettingsOpen,
    appError, setAppError,
    selectedContent, initialEpisodeId,
    statsModalConfig, setStatsModalConfig,
    handleSetSelectedContent, handleCloseModal
  } = useUI();

  const { handleToggleWatchlist, handleToggleWatched, isProcessing } = useMediaToggles(
    isInWatchlist, removeFromWatchlist, addToWatchlist,
    isWatched, unmarkMovie, unmarkSeries, markMovieAsWatched, markSeriesAsWatched,
    setAppError
  );

  const handleSearchResultClick = useCallback((item: MediaItem) => {
    dbService.cacheMediaItem(item);
    handleSetSelectedContent(item);
    setIsSearchOpen(false);
  }, [handleSetSelectedContent, setIsSearchOpen]);

  const statsModalData = useStatsModalData(statsModalConfig, watched as unknown as MediaItem[]);

  if (!user) return <LoginPage />;

  return (
    <RootLayout
      watchedCount={watched.length}
      isSearchOpen={isSearchOpen}
      setIsSearchOpen={setIsSearchOpen}
      isSettingsOpen={isSettingsOpen}
      setIsSettingsOpen={setIsSettingsOpen}
      onSearchResultClick={handleSearchResultClick}
      isProcessing={isProcessing}
      appError={appError}
      setAppError={setAppError}
      setSelectedContent={handleSetSelectedContent}
    >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-12 focus:z-[100] focus:px-4 focus:py-2 focus:bg-red-600 focus:text-white focus:rounded-md focus:font-bold">
        Skip to content
      </a>

      <main id="main-content" className="outline-none" tabIndex={-1}>
        <Suspense fallback={
          <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-6">
            <div className="relative">
                <div className="w-12 h-12 border-t-2 border-red-600 rounded-full animate-spin" />
                <div className="absolute inset-0 blur-2xl bg-red-600/20 animate-pulse" />
            </div>
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em]">Syncing Interface</p>
          </div>
        }>
          <AppRoutes
            Home={Home} Upcoming={Upcoming} Watchlist={Watchlist} Watched={Watched} StatsDashboard={StatsDashboard}
          />
        </Suspense>
      </main>

      {selectedContent && (
        <ContentModal
          isOpen={true}
          onClose={handleCloseModal}
          item={selectedContent}
          initialEpisodeId={initialEpisodeId}
        />
      )}

      {statsModalConfig && statsModalData && (
        <StatsListModal
          isOpen={statsModalConfig.isOpen}
          onClose={() => setStatsModalConfig(null)}
          title={statsModalConfig.title}
          groups={statsModalData.groups}
          totalCount={statsModalData.totalCount}
          countLabel={statsModalConfig.type === 'movies' ? 'Titles' : 'Episodes'}
          onCardClick={(item) => handleSetSelectedContent(item)}
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={handleToggleWatchlist}
          isWatched={isWatched}
          onToggleWatched={handleToggleWatched}
        />
      )}
    </RootLayout>
  );
}

export default React.memo(App);