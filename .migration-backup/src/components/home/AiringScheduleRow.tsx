import React from 'react';
import ContentCard from '@/components/ContentCard';
import HorizontalScrollContainer from '@/components/HorizontalScrollContainer';
import { useAiringSchedule } from '@/hooks/useAiringSchedule';
import { MediaItem } from '@/types';
import { getStandardBadge } from '@/lib/dateUtils';

interface AiringScheduleRowProps {
    setSelectedContent: (item: MediaItem) => void;
    isInWatchlist: (id: string) => boolean;
    toggleWatchlist: (e: React.MouseEvent, id: string) => void;
    isWatched: (id: string) => boolean;
    toggleWatched: (e: React.MouseEvent, id: string) => void;
}

const AiringScheduleRow: React.FC<AiringScheduleRowProps> = ({
    setSelectedContent,
    isInWatchlist,
    toggleWatchlist,
    isWatched,
    toggleWatched
}) => {
    const { items: airingItems, loading: loadingAiring } = useAiringSchedule();

    const validAiring = airingItems.filter(item => {
        if (!item.nextEpisode) return false;
        return (item.nextEpisode.daysUntil ?? 0) >= 0;
    });

    if (loadingAiring) {
        return (
            <HorizontalScrollContainer>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={`airing-skel-${i}`} className="snap-start">
                        <div className="relative w-[160px] md:w-[200px] aspect-[2/3] bg-white/5 rounded-2xl overflow-hidden border border-white/10 animate-pulse" />
                    </div>
                ))}
                <div className="w-12 flex-shrink-0"></div>
            </HorizontalScrollContainer>
        );
    }

    if (validAiring.length === 0) {
        return <div className="text-gray-500 text-sm italic">No shows airing this week for your region/time.</div>;
    }

    return (
        <HorizontalScrollContainer>
            {validAiring.map(item => {
                const { text: badgeText, color: badgeColor } = getStandardBadge(item);

                return (
                    <div key={`airing-key-${item.id}`} className="snap-start">
                        <ContentCard
                            item={item}
                            onClick={setSelectedContent}
                            isInWatchlist={isInWatchlist(item.id)}
                            onToggleWatchlist={toggleWatchlist}
                            isWatched={isWatched(item.id)}
                            onToggleWatched={toggleWatched}
                            subtitleOverride={item.nextEpisode ? `S${item.nextEpisode.seasonNumber} E${item.nextEpisode.episodeNumber} • ${new Date(item.nextEpisode.airDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : undefined}
                            badgeText={badgeText}
                            badgeColor={badgeColor}
                            enableHoverFlip={true}
                        />
                    </div>
                )
            })}
            <div className="w-12 flex-shrink-0"></div>
        </HorizontalScrollContainer>
    );
};

export default AiringScheduleRow;