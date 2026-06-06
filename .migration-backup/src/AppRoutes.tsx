import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MediaItem } from '@/types';

// Types for props
interface AppRoutesProps {
  Home: React.ComponentType<any>;
  Upcoming: React.ComponentType<any>;
  Watchlist: React.ComponentType<any>;
  Watched: React.ComponentType<any>;
  StatsDashboard: React.ComponentType<any>;
  heroItems: any[];
  continueWatchingItems: any[];
  watched: any[];
  loadingHero: boolean;
  heroError: any;
  loadHero: () => void;
  handleSetSelectedContent: (item: MediaItem, episodeId?: string) => void;
  isInWatchlist: (id: string) => boolean;
  handleToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  handleToggleWatched: (e: React.MouseEvent, id: string) => void;
  excludedIds: Set<string>;
  userEmail?: string;
  watchlistGroups: { movies: MediaItem[]; series: MediaItem[]; anime: MediaItem[]; };
  filterType: any;
  setFilterType: any;
  filterYear: any;
  setFilterYear: any;
  filterGenre: any;
  setFilterGenre: any;
  expandedSections: any;
  handleToggleSection: (tab: 'watchlist' | 'watched', section: 'movies' | 'series' | 'anime') => void;
  setSelectedContent: (item: MediaItem | null) => void;
  setActiveTab: (tab: any) => void;
  watchedGroups: { movies: MediaItem[]; series: MediaItem[]; anime: MediaItem[]; };
  dashboardStats: any;
  setStatsModalConfig: (config: any) => void;
  isDbLoaded: boolean;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  Home, Upcoming, Watchlist, Watched, StatsDashboard,
  heroItems, continueWatchingItems, watched, loadingHero, heroError, loadHero,
  handleSetSelectedContent, isInWatchlist, handleToggleWatchlist, isWatched, handleToggleWatched,
  excludedIds, userEmail, watchlistGroups, filterType, setFilterType, filterYear, setFilterYear,
  filterGenre, setFilterGenre, expandedSections, handleToggleSection, setSelectedContent, setActiveTab,
  watchedGroups, dashboardStats, setStatsModalConfig, isDbLoaded
}) => {
  const toggleWatchlistSection = React.useCallback(
    (s: any) => handleToggleSection('watchlist', s),
    [handleToggleSection]
  );
  
  const toggleWatchedSection = React.useCallback(
    (s: any) => handleToggleSection('watched', s),
    [handleToggleSection]
  );

  const handleBrowseContent = React.useCallback(
    () => setActiveTab('home'),
    [setActiveTab]
  );

  const handleOpenStatsModal = React.useCallback(
    (type: any) => setStatsModalConfig({ 
      isOpen: true, 
      title: type === 'series' ? 'Series Watched' : type === 'anime' ? 'Animated Titles' : 'Movies Watched', 
      type 
    }),
    [setStatsModalConfig]
  );

  return (
    <Routes>
      <Route path="/" element={
        <Home
          heroItems={heroItems}
          continueWatchingItems={continueWatchingItems}
          watched={watched}
          loadingHero={loadingHero}
          heroError={heroError}
          loadHero={loadHero}
          setSelectedContent={handleSetSelectedContent}
          isInWatchlist={isInWatchlist}
          toggleWatchlist={handleToggleWatchlist}
          isWatched={isWatched}
          toggleWatched={handleToggleWatched}
          updateCache={() => {}}
          excludedIds={excludedIds}
          userEmail={userEmail}
        />
      } />

      <Route path="/upcoming" element={
        <Upcoming setSelectedContent={setSelectedContent} />
      } />

      <Route path="/watchlist" element={
        <Watchlist
          watchlistGroups={watchlistGroups}
          filterType={filterType} setFilterType={setFilterType}
          filterYear={filterYear} setFilterYear={setFilterYear}
          filterGenre={filterGenre} setFilterGenre={setFilterGenre}
          expandedSections={expandedSections.watchlist}
          toggleSection={toggleWatchlistSection}
          setSelectedContent={setSelectedContent}
          toggleWatchlist={handleToggleWatchlist}
          isWatched={isWatched}
          toggleWatched={handleToggleWatched}
          onBrowseContent={handleBrowseContent}
        />
      } />

      <Route path="/watched" element={
        <Watched
          watchedGroups={watchedGroups}
          dashboardStats={dashboardStats}
          filterType={filterType} setFilterType={setFilterType}
          filterYear={filterYear} setFilterYear={setFilterYear}
          filterGenre={filterGenre} setFilterGenre={setFilterGenre}
          expandedSections={expandedSections.watched}
          toggleSection={toggleWatchedSection}
          setSelectedContent={setSelectedContent}
          isInWatchlist={isInWatchlist}
          toggleWatchlist={handleToggleWatchlist}
          isWatched={isWatched}
          toggleWatched={handleToggleWatched}
          openStatsModal={handleOpenStatsModal}
          isDbLoaded={isDbLoaded}
        />
      } />

      <Route path="/stats" element={
        <StatsDashboard />
      } />

      <Route path="*" element={
        <Navigate to="/" replace />
      } />
    </Routes>
  );
};
