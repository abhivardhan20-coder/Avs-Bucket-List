import React from 'react';
import { useWatchlist, useWatched } from '@/contexts/AppContext';
import { useUI } from '@/contexts/UIContext';
import StatsListModal from '@/components/stats/StatsListModal';
import ContentModal from '@/components/ContentModal';
import { useMediaToggles } from '@/hooks/useMediaToggles';
import { useStatsModalData } from '@/hooks/useStatsModalData';

export function ModalsLayer() {
  const { isInWatchlist } = useWatchlist();
  const { watched, isWatched } = useWatched();
  const { selectedContent, initialEpisodeId, statsModalConfig, setStatsModalConfig, handleSetSelectedContent, handleCloseModal } = useUI();
  const { handleToggleWatchlist, handleToggleWatched } = useMediaToggles();
  const statsModalData = useStatsModalData(statsModalConfig, watched);

  return (
    <>
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
    </>
  );
}
