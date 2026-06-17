import { useMemo } from 'react';
import { MediaItem, MediaType, WatchlistItem, WatchedItem } from '@/types';

/**
 * A hook that filters and groups an array of media items (watched or watchlist) based on user selections.
 * It optimizes performance by doing a single pass over the data for both filtering and categorizing.
 *
 * @param items - The array of media items to filter and group
 * @param filterType - The type to filter by ('All', or a specific MediaType like Movie/Series/Anime)
 * @param filterYear - The release year to filter by ('All' or a specific 4-digit year string)
 * @param filterGenres - An array of genres to filter by (includes 'All' if no filter is active)
 * @returns An object containing the flat `filtered` array and a `groups` object split by MediaType.
 */
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
                posterUrl: item.posterUrl || '',
                backdropUrl: (item as any).backdrop || '',
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