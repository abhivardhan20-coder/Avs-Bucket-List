import React, { Suspense } from 'react';
import { useAuth, useWatchlist, useWatched } from '@/contexts/AppContext';
import { useUI } from '@/contexts/UIContext';
import StatsListModal from '@/components/stats/StatsListModal';
import { RootLayout } from '@/layouts/RootLayout';
import ContentModal from '@/components/ContentModal';
import LoginPage from '@/components/LoginPage';
import { useMediaToggles } from '@/hooks/useMediaToggles';
import { useStatsModalData } from '@/hooks/useStatsModalData';
import { AppRoutes } from '@/AppRoutes';

function App() {
  const { user } = useAuth();
  const { isInWatchlist } = useWatchlist();
  const { watched, isWatched } = useWatched();
  const { selectedContent, initialEpisodeId, statsModalConfig, setStatsModalConfig, handleSetSelectedContent, handleCloseModal } = useUI();
  const { handleToggleWatchlist, handleToggleWatched } = useMediaToggles();
  const statsModalData = useStatsModalData(statsModalConfig, watched);

  if (!user) return <LoginPage />;

  return (
    <RootLayout>
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
          <AppRoutes />
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