import React from 'react';
import { useLibraryData, useSync } from '../../contexts/AppContext';
import HorizontalScrollContainer from '../HorizontalScrollContainer';
import ContentCard from '../ContentCard';
import { Play } from 'lucide-react';
import { MediaItem } from '../../types';

interface UpNextRowProps {
  onCardClick: (item: MediaItem, episodeId?: string) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
}

const UpNextRow: React.FC<UpNextRowProps> = ({
  onCardClick,
  isInWatchlist,
  onToggleWatchlist,
  isWatched,
  onToggleWatched,
}) => {
  const { getMediaDetails } = useSync();
  const { upNextItems } = useLibraryData();

  if (!upNextItems || upNextItems.length === 0) return null;

  const handleCardClick = async (showId: string, type: any, episodeId: string) => {
    // We fetch full details to ensure the modal has everything it needs to scroll to the episode
    const details = await getMediaDetails(showId, type);
    if (details) {
      onCardClick(details, episodeId);
    }
  };

  return (
    <div className="px-4 md:px-12">
      <div className="flex items-center gap-2 mb-4 text-gray-300">
        <Play className="w-5 h-5 text-red-500 fill-red-500" />
        <h2 className="text-xl md:text-2xl font-bold text-white">Up Next</h2>
      </div>
      
      <HorizontalScrollContainer>
        {upNextItems.map((item) => {
          // Construct a partial MediaItem for the card to render basic info
          const showItem: Partial<MediaItem> = {
            id: item.showId,
            title: item.showTitle,
            posterUrl: item.showPoster,
            type: (item.showId.startsWith('movie') ? 'movie' : 'series' as any), // This is a heuristic, better to have type in UpNextItem
          };

          const subtitle = `S${item.seasonNumber} - E${item.nextEpisode.number}: ${item.nextEpisode.title}`;

          return (
            <div key={`upnext-${item.showId}`} className="snap-start">
              <ContentCard
                item={showItem as MediaItem}
                onClick={() => handleCardClick(item.showId, showItem.type, item.nextEpisode.id)}
                isInWatchlist={isInWatchlist(item.showId)}
                onToggleWatchlist={onToggleWatchlist}
                isWatched={isWatched(item.showId)}
                onToggleWatched={onToggleWatched}
                subtitleOverride={subtitle}
                badgeText="UP NEXT"
                badgeColor="bg-red-600"
              />
            </div>
          );
        })}
        <div className="w-12 flex-shrink-0"></div>
      </HorizontalScrollContainer>
    </div>
  );
};

export default UpNextRow;
