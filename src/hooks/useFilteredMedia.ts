import { useMemo } from 'react';
import { MediaItem, MediaType, WatchlistItem, WatchedItem } from '@/types';

export function useFilteredMedia(
    items: (WatchlistItem | WatchedItem)[],
    filterType: 'All' | MediaType,
    filterYear: string,
    filterGenres: string[]
) {
    const { filtered: mappedFiltered, groups } = useMemo(() => {
        // ✅ OPTIMIZATION: Single pass with categorization instead of multiple filters
        // This reduces redundant iterations over the dataset
        const filtered: MediaItem[] = [];
        const movies: MediaItem[] = [];
        const series: MediaItem[] = [];
        const anime: MediaItem[] = [];

        const genreFilterActive = !filterGenres.includes('All');

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // ✅ OPTIMIZATION: Early termination if filter doesn't match
            if (filterType !== 'All' && item.type !== filterType) continue;
            if (filterYear !== 'All' && item.year?.toString() !== filterYear) continue;
            if (genreFilterActive && !(item.genres || []).some(g => filterGenres.includes(g))) continue;

            // Map item once instead of re-creating for each group
            const mappedItem: MediaItem = {
                ...item,
                posterUrl: item.poster || (item as any).posterUrl || '',
                backdropUrl: (item as any).backdrop || (item as any).backdropUrl || '',
                rating: item.rating || 0,
                overview: (item as any).overview || '',
                genres: item.genres || [],
                year: item.year || 0,
                totalEpisodes: (item as any).totalEpisodes || 0
            } as unknown as MediaItem;

            filtered.push(mappedItem);

            // ✅ OPTIMIZATION: Categorize during single pass
            if (item.type === MediaType.Movie) {
                movies.push(mappedItem);
            } else if (item.type === MediaType.Series) {
                series.push(mappedItem);
            } else if (item.type === MediaType.Anime) {
                anime.push(mappedItem);
            }
        }

        const groups = {
            movies,
            series,
            anime
        };

        return { filtered, groups };
    }, [items, filterType, filterYear, filterGenres]);

    return { filtered: mappedFiltered, groups };
}