import React, { useState, useMemo, Suspense, useCallback } from 'react';
import { useAuth, useWatchlist, useWatched } from '@/contexts/AppContext';
import { MediaItem, MediaType } from '@/types';

import StatsListModal from '@/components/stats/StatsListModal';
import { RootLayout } from '@/layouts/RootLayout';
import ContentModal from '@/components/ContentModal';
import LoginPage from '@/components/LoginPage';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useTrending } from '@/hooks/useContentQueries';
import { useAppStats } from '@/hooks/useAppStats';
import { useFilteredMedia } from '@/hooks/useFilteredMedia';
import { useMediaToggles } from '@/hooks/useMediaToggles';
import { useStatsModalData } from '@/hooks/useStatsModalData';
import { db } from '@/lib/db';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRoutes } from '@/AppRoutes';

// Lazy Pages for better initial load performance
const Home = lazyWithRetry(() => import(/* webpackChunkName: "home" */ '@/pages/Home').then(module => ({ default: module.Home })));
const Upcoming = lazyWithRetry(() => import(/* webpackChunkName: "upcoming" */ '@/pages/Upcoming').then(module => ({ default: module.Upcoming })));
const Watchlist = lazyWithRetry(() => import(/* webpackChunkName: "watchlist" */ '@/pages/Watchlist').then(module => ({ default: module.Watchlist })));
const Watched = lazyWithRetry(() => import(/* webpackChunkName: "watched" */ '@/pages/Watched').then(module => ({ default: module.Watched })));
const StatsDashboard = lazyWithRetry(() => import(/* webpackChunkName: "stats" */ '@/components/stats/StatsDashboard'));

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/upcoming')) return 'upcoming';
    if (path.startsWith('/watchlist')) return 'watchlist';
    if (path.startsWith('/watched')) return 'watched';
    if (path.startsWith('/stats')) return 'stats';
    return 'home';
  }, [location.pathname]);

  const setActiveTab = useCallback((tab: 'home' | 'upcoming' | 'watchlist' | 'watched' | 'stats') => {
    navigate(tab === 'home' ? '/' : `/${tab}`);
  }, [navigate]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const { user } = useAuth();
  const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, isDbLoaded: wlLoaded } = useWatchlist();
  const { watched, continueWatching, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries, isWatched, isDbLoaded: wdLoaded } = useWatched();
  const isDbLoaded = wlLoaded && wdLoaded;

  const [selectedContent, setSelectedContent] = useState<MediaItem | null>(null);
  const [initialEpisodeId, setInitialEpisodeId] = useState<string | undefined>(undefined);

  const { handleToggleWatchlist, handleToggleWatched, isProcessing } = useMediaToggles(
    isInWatchlist, removeFromWatchlist, addToWatchlist,
    isWatched, unmarkMovie, unmarkSeries, markMovieAsWatched, markSeriesAsWatched,
    setAppError
  );

  const handleSetSelectedContent = useCallback((item: MediaItem, episodeId?: string) => {
    setSelectedContent(item);
    setInitialEpisodeId(episodeId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedContent(null);
    setInitialEpisodeId(undefined);
  }, []);

  // Filter States
  const [filterType, setFilterType] = useState<'All' | MediaType>('All');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterGenre, setFilterGenre] = useState<string[]>(['All']);

  // Reset filters when changing tabs (handled in render phase to avoid cascading effects)
  const [prevTab, setPrevTab] = useState(activeTab);
  if (activeTab !== prevTab) {
    setPrevTab(activeTab);
    setFilterType('All');
    setFilterYear('All');
    setFilterGenre(['All']);
  }

  // Stats Modal State
  const [statsModalConfig, setStatsModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    type: 'series' | 'anime' | 'movies';
  } | null>(null);

  const [expandedSections, setExpandedSections] = useState({
    watchlist: { movies: true, series: true, anime: true },
    watched: { movies: true, series: true, anime: true }
  });



  // Derived Data Hooks
  const { dashboardStats } = useAppStats(watched);
  const { groups: watchlistGroups } = useFilteredMedia(watchlist, filterType, filterYear, filterGenre);
  const { groups: watchedGroups } = useFilteredMedia(watched, filterType, filterYear, filterGenre);

  // Trending / Hero Data
  const { 
    data: heroItems = [], 
    isLoading: loadingHero, 
    isFetching: isFetchingHero,
    isError: heroError, 
    refetch: loadHero 
  } = useTrending(MediaType.Movie);



  const excludedIds = useMemo(() => {
    return new Set([
      ...watchlist.map(w => w.id),
      ...watched.map(w => w.id)
    ]);
  }, [watchlist, watched]);

  const handleToggleSection = useCallback((tab: 'watchlist' | 'watched', section: 'movies' | 'series' | 'anime') => {
    setExpandedSections(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [section]: !prev[tab][section]
      }
    }));
  }, []);

  const handleSearchResultClick = useCallback((item: MediaItem) => {
    db.mediaCache.put(item);
    setSelectedContent(item);
    setIsSearchOpen(false);
  }, []);

  const continueWatchingItems = useMemo(() => {
    return continueWatching.map(item => ({
      ...item,
      progress: item.totalEpisodes > 0 ? (item.watchedEpisodes / item.totalEpisodes) * 100 : 0,
      posterUrl: item.posterUrl,
      backdropUrl: (item as any).backdrop || '',
      overview: (item as any).overview || ''
    })) as MediaItem[];
  }, [continueWatching]);

  const statsModalData = useStatsModalData(statsModalConfig, watched as unknown as MediaItem[]);

  if (!user) return <LoginPage />;

  return (
    <RootLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
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
            heroItems={heroItems} continueWatchingItems={continueWatchingItems} watched={watched}
            loadingHero={loadingHero || (isFetchingHero && heroItems.length === 0)} heroError={heroError}
            loadHero={() => loadHero()} handleSetSelectedContent={handleSetSelectedContent}
            isInWatchlist={isInWatchlist} handleToggleWatchlist={handleToggleWatchlist}
            isWatched={isWatched} handleToggleWatched={handleToggleWatched}
            excludedIds={excludedIds} userEmail={user?.email}
            watchlistGroups={watchlistGroups} filterType={filterType} setFilterType={setFilterType}
            filterYear={filterYear} setFilterYear={setFilterYear} filterGenre={filterGenre} setFilterGenre={setFilterGenre}
            expandedSections={expandedSections} handleToggleSection={handleToggleSection}
            setSelectedContent={setSelectedContent} setActiveTab={setActiveTab}
            watchedGroups={watchedGroups} dashboardStats={dashboardStats} setStatsModalConfig={setStatsModalConfig}
            isDbLoaded={isDbLoaded}
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