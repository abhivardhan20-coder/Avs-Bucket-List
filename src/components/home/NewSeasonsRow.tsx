import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MediaItem, MediaType } from '@/types';
import { resolveUpcomingContent } from '@/lib/dateUtils';
import { ContentService } from '@/services/contentService';
import UpcomingCard from '@/components/upcoming/UpcomingCard';
import HorizontalScrollContainer from '@/components/HorizontalScrollContainer';
import { Loader } from 'lucide-react';

interface NewSeasonsRowProps {
    watched: any[];
    watchlist?: any[];
    setSelectedContent: (item: MediaItem) => void;
    isInWatchlist: (id: string) => boolean;
    toggleWatchlist: (e: React.MouseEvent, id: string) => void;
    isWatched: (id: string) => boolean;
    toggleWatched: (e: React.MouseEvent, id: string) => void;
}

const NewSeasonsRow: React.FC<NewSeasonsRowProps> = ({
    watched,
    watchlist = [],
    setSelectedContent,
    isInWatchlist,
    toggleWatchlist,
    isWatched,
    toggleWatched,
}) => {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);

    // ✅ PERFORMANCE OPTIMIZATION: Memoize the series IDs to prevent redundant re-fetches
    // when unrelated items (like movies) are updated in the library.
    const seriesIdsKey = useMemo(() => {
        const ids = new Set<string>();
        watched?.forEach(item => {
            if (item.type === MediaType.Series || item.type === MediaType.Anime) ids.add(item.id);
        });
        watchlist?.forEach(item => {
            if (item.type === MediaType.Series || item.type === MediaType.Anime) ids.add(item.id);
        });
        return Array.from(ids).sort().join(',');
    }, [watched, watchlist]);

    // Load schedule: combine watched + watchlist series/anime with upcoming episodes within ±14 days
    const loadSchedule = useCallback(async () => {
        if (!seriesIdsKey) {
            setItems([]);
            return;
        }

        try {
            setLoading(true);
            const ids = seriesIdsKey.split(',');
            // ✅ PERFORMANCE OPTIMIZATION: Use ContentService to leverage local Dexie cache
            // and drastically reduce unnecessary TMDB API calls.
            const freshItems = await ContentService.getItemsByIds(ids);

            // Filter to only items with upcoming episodes within ±14 day window
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const newSeasonItems = freshItems.filter(item => {
                const upcoming = resolveUpcomingContent(item);
                if (!upcoming) return false;
                
                // Check if within ±14 day window
                const itemTime = upcoming.airDate.getTime();
                const nowTime = now.getTime();
                const daysDiff = (itemTime - nowTime) / (24 * 60 * 60 * 1000);
                
                return daysDiff >= -14 && daysDiff <= 14;
            });

            // Sort by air date (ascending)
            newSeasonItems.sort((a, b) => {
                const aDate = resolveUpcomingContent(a)?.airDate || new Date(0);
                const bDate = resolveUpcomingContent(b)?.airDate || new Date(0);
                return aDate.getTime() - bDate.getTime();
            });

            setItems(newSeasonItems);
        } catch (e) {
            console.error("Error loading new seasons", e);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [seriesIdsKey]);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    const handleToggleWatchlist = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const item = items.find(i => i.id === id);
        if (!item) return;
        toggleWatchlist(e, id);
    };

    if (loading && items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader className="w-8 h-8 animate-spin text-red-600" />
                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Loading new seasons</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12 px-4 bg-white/2 rounded-2xl border border-dashed border-white/5">
                <p className="text-gray-600 font-bold text-sm uppercase tracking-widest">
                    No upcoming episodes in the next 14 days
                </p>
            </div>
        );
    }

    return (
        <HorizontalScrollContainer>
            {items.map(item => (
                <div key={`new-season-${item.id}`} className="snap-start flex-shrink-0">
                    <UpcomingCard
                        item={item}
                        onClick={setSelectedContent}
                        isInWatchlist={isInWatchlist(item.id)}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched(item.id)}
                        onToggleWatched={toggleWatched}
                        isMySchedule={true}
                    />
                </div>
            ))}
            <div className="w-12 flex-shrink-0"></div>
        </HorizontalScrollContainer>
    );
};

export default NewSeasonsRow;