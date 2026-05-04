import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useAuth, useWatchlist, useWatched } from '@/contexts/AppContext';
import { MediaItem, MediaType } from '@/types';
import { 
  hydrateSeries 
} from '@/services/tmdb';
import { fetchMediaItem } from '@/lib/api/mediaFetcher';
import StatsListModal, { StatsGroup } from '@/components/stats/StatsListModal';
import { RootLayout } from '@/layouts/RootLayout';
import ContentModal from '@/components/ContentModal';
import LoginPage from '@/components/LoginPage';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useTrending } from '@/hooks/useContentQueries';
import { useAppStats } from '@/hooks/useAppStats';
import { useFilteredMedia } from '@/hooks/useFilteredMedia';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

// Lazy Pages for better initial load performance
const Home = lazyWithRetry(() => import('@/pages/Home').then(module => ({ default: module.Home })));
const Upcoming = lazyWithRetry(() => import('@/pages/Upcoming').then(module => ({ default: module.Upcoming })));
const Watchlist = lazyWithRetry(() => import('@/pages/Watchlist').then(module => ({ default: module.Watchlist })));
const Watched = lazyWithRetry(() => import('@/pages/Watched').then(module => ({ default: module.Watched })));
const StatsDashboard = lazyWithRetry(() => import('@/components/stats/StatsDashboard'));

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'upcoming' | 'watchlist' | 'watched' | 'stats'>('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const { user } = useAuth();
  const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, isDbLoaded: wlLoaded } = useWatchlist();
  const { watched, continueWatching, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries, isWatched, isDbLoaded: wdLoaded } = useWatched();
  const isDbLoaded = wlLoaded && wdLoaded;

  const [selectedContent, setSelectedContent] = useState<MediaItem | null>(null);
  const [initialEpisodeId, setInitialEpisodeId] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Reset filters when changing tabs
  useEffect(() => {
    setFilterType('All');
    setFilterYear('All');
    setFilterGenre(['All']);
  }, [activeTab]);

  const excludedIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < watchlist.length; i++) ids.add(watchlist[i].id);
    for (let i = 0; i < watched.length; i++) ids.add(watched[i].id);
    return ids;
  }, [watchlist, watched]);

  // Handlers memoized for child component performance
  const handleToggleWatchlist = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isInWatchlist(id)) {
      removeFromWatchlist(id);
    } else {
      const item = await db.mediaCache.get(id);
      if (item) addToWatchlist(item);
    }
  }, [isInWatchlist, removeFromWatchlist, addToWatchlist]);

  const handleToggleWatched = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = await db.mediaCache.get(id);
    if (!item) return;

    if (isWatched(id)) {
      if (item.type === MediaType.Movie) unmarkMovie(item);
      else unmarkSeries(item);
    } else {
      setIsProcessing(true);
      try {
        let fullItem = item;
        if (!item.runtime || !item.rating || (item.type !== MediaType.Movie && !item.seasons)) {
          const fullItemData = await fetchMediaItem(item.id, item.type === MediaType.Movie ? 'movie' : 'tv', item.type === MediaType.Anime);
          if (fullItemData) {
            fullItem = { ...item, ...fullItemData } as MediaItem;
            await db.mediaCache.put(fullItem);
          }
        }

        if (fullItem.type === MediaType.Movie) {
          markMovieAsWatched(fullItem);
        } else {
          const hydrated = await hydrateSeries(fullItem);
          await db.mediaCache.put(hydrated);
          markSeriesAsWatched(hydrated);
        }
      } catch {
        setAppError("Status update interruption.");
        setTimeout(() => setAppError(null), 3000);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [isWatched, unmarkMovie, unmarkSeries, markMovieAsWatched, markSeriesAsWatched]);

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
      posterUrl: item.poster,
      backdropUrl: item.backdrop || '',
      overview: (item as any).overview || ''
    })) as MediaItem[];
  }, [continueWatching]);

  const statsModalData = useMemo(() => {
    if (!statsModalConfig) return null;

    let groups: StatsGroup[] = [];
    let totalCount = 0;

    if (statsModalConfig.type === 'series') {
      const items = watched
        .filter(w => w.type === MediaType.Series)
        .sort((a, b) => b.watchedEpisodes - a.watchedEpisodes)
        .map(w => ({ ...w, posterUrl: w.poster, backdropUrl: w.backdrop }));

      totalCount = items.reduce((acc, i) => acc + i.watchedEpisodes, 0);
      const animatedSeries = items.filter(w => w.genres?.includes('Animation'));
      const liveActionSeries = items.filter(w => !w.genres?.includes('Animation'));
      
      groups = [
        { title: 'Live Action Series', items: liveActionSeries as any[], subCount: liveActionSeries.reduce((acc, i) => acc + i.watchedEpisodes, 0), subLabel: 'EPISODES' },
        { title: 'Animated Series', items: animatedSeries as any[], subCount: animatedSeries.reduce((acc, i) => acc + i.watchedEpisodes, 0), subLabel: 'EPISODES' }
      ].filter(g => g.items.length > 0);
    } else if (statsModalConfig.type === 'anime') {
      const allAnime = watched
        .filter(w => w.type === MediaType.Anime)
        .map(w => ({ ...w, posterUrl: w.poster, backdropUrl: w.backdrop }));

      const animeSeries = allAnime.filter(w => (w.totalEpisodes || 0) > 1).sort((a, b) => b.watchedEpisodes - a.watchedEpisodes);
      const animeMovies = allAnime.filter(w => (w.totalEpisodes || 0) <= 1).sort((a, b) => b.watchedEpisodes - a.watchedEpisodes);
      totalCount = allAnime.reduce((acc, i) => acc + i.watchedEpisodes, 0);

      groups = [
        { title: 'Animated Series', items: animeSeries as any[], subCount: animeSeries.reduce((acc, i) => acc + i.watchedEpisodes, 0), subLabel: 'EPISODES' },
        { title: 'Animated Movies', items: animeMovies as any[] }
      ].filter(g => g.items.length > 0);
    } else if (statsModalConfig.type === 'movies') {
      const allMovies = watched
        .filter(w => w.type === MediaType.Movie || (w.type === MediaType.Anime && (w.totalEpisodes || 0) <= 1))
        .map(w => ({ ...w, posterUrl: w.poster, backdropUrl: w.backdrop }));

      const liveAction = allMovies.filter(w => w.type === MediaType.Movie && !w.genres?.includes('Animation'));
      const animatedMovies = allMovies.filter(w => w.type === MediaType.Movie && w.genres?.includes('Animation'));
      const animeMovies = allMovies.filter(w => w.type === MediaType.Anime && (w.totalEpisodes || 0) <= 1);

      groups = [
        { title: 'Live-Action Movies', items: liveAction as any[] },
        { title: 'Animated Movies', items: animatedMovies as any[] },
        { title: 'Anime Movies', items: animeMovies as any[] }
      ].filter(g => g.items.length > 0);
      totalCount = groups.reduce((acc, g) => acc + g.items.length, 0);
    }

    return { groups, totalCount };
  }, [statsModalConfig, watched]);

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
          {activeTab === 'home' && (
            <Home
              heroItems={heroItems}
              continueWatchingItems={continueWatchingItems}
              watched={watched}
              loadingHero={loadingHero || (isFetchingHero && heroItems.length === 0)}
              heroError={heroError}
              loadHero={() => loadHero()}
              setSelectedContent={handleSetSelectedContent}
              isInWatchlist={isInWatchlist}
              toggleWatchlist={handleToggleWatchlist}
              isWatched={isWatched}
              toggleWatched={handleToggleWatched}
              updateCache={() => {}}
              excludedIds={excludedIds}
              userEmail={user?.email}
            />
          )}

          {activeTab === 'upcoming' && (
            <Upcoming setSelectedContent={setSelectedContent} />
          )}

          {activeTab === 'watchlist' && (
            <Watchlist
              watchlistGroups={watchlistGroups}
              filterType={filterType} setFilterType={setFilterType}
              filterYear={filterYear} setFilterYear={setFilterYear}
              filterGenre={filterGenre} setFilterGenre={setFilterGenre}
              expandedSections={expandedSections.watchlist}
              toggleSection={(s) => handleToggleSection('watchlist', s)}
              setSelectedContent={setSelectedContent}
              toggleWatchlist={handleToggleWatchlist}
              isWatched={isWatched}
              toggleWatched={handleToggleWatched}
              onBrowseContent={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'watched' && (
            <Watched
              watchedGroups={watchedGroups}
              dashboardStats={dashboardStats}
              filterType={filterType} setFilterType={setFilterType}
              filterYear={filterYear} setFilterYear={setFilterYear}
              filterGenre={filterGenre} setFilterGenre={setFilterGenre}
              expandedSections={expandedSections.watched}
              toggleSection={(s) => handleToggleSection('watched', s)}
              setSelectedContent={setSelectedContent}
              isInWatchlist={isInWatchlist}
              toggleWatchlist={handleToggleWatchlist}
              isWatched={isWatched}
              toggleWatched={handleToggleWatched}
              openStatsModal={(type) => setStatsModalConfig({ 
                isOpen: true, 
                title: type === 'series' ? 'Series Watched' : type === 'anime' ? 'Animated Titles' : 'Movies Watched', 
                type 
              })}
              isDbLoaded={isDbLoaded}
            />
          )}

          {activeTab === 'stats' && (
            <StatsDashboard />
          )}
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