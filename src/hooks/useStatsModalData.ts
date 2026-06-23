import { useMemo } from 'react';
import { MediaItem, MediaType, WatchedItem } from '@/types';
import { StatsGroup } from '@/components/stats/StatsListModal';

/**
 * Processes watched items to group them for the Stats Modal.
 * It categorizes media (Series, Anime, Movies) based on user's watched items and calculates watch statistics.
 *
 * @param statsModalConfig - Configuration for the modal state including type of stats to show.
 * @param watched - The user's array of watched items.
 * @returns An object containing `groups` (categorized stats) and `totalCount` (total episodes or titles watched).
 */
export function useStatsModalData(
  statsModalConfig: { isOpen: boolean; title: string; type: 'series' | 'anime' | 'movies' } | null,
  watched: WatchedItem[]
) {
  return useMemo(() => {
    if (!statsModalConfig) return null;

    let groups: StatsGroup[] = [];
    let totalCount = 0;
    const watchedItems = watched;

    if (statsModalConfig.type === 'series') {
      const items = watchedItems
        .filter(w => w.type === MediaType.Series)
        .sort((a, b) => b.watchedEpisodes - a.watchedEpisodes)
        .map(w => ({ ...w, backdropUrl: w.backdrop } as unknown as MediaItem));

      totalCount = items.reduce((acc, i) => acc + (i as unknown as WatchedItem).watchedEpisodes, 0);
      const animatedSeries = items.filter(w => w.genres?.includes('Animation'));
      const liveActionSeries = items.filter(w => !w.genres?.includes('Animation'));
      
      groups = [
        { title: 'Live Action Series', items: liveActionSeries, subCount: liveActionSeries.reduce((acc, i) => acc + (i as unknown as WatchedItem).watchedEpisodes, 0), subLabel: 'EPISODES' },
        { title: 'Animated Series', items: animatedSeries, subCount: animatedSeries.reduce((acc, i) => acc + (i as unknown as WatchedItem).watchedEpisodes, 0), subLabel: 'EPISODES' }
      ].filter(g => g.items.length > 0);
    } else if (statsModalConfig.type === 'anime') {
      const allAnime = watchedItems
        .filter(w => w.type === MediaType.Anime)
        .map(w => ({ ...w, backdropUrl: w.backdrop } as unknown as MediaItem));

      const animeSeries = allAnime.filter(w => (w.totalEpisodes || 0) > 1).sort((a, b) => (b as unknown as WatchedItem).watchedEpisodes - (a as unknown as WatchedItem).watchedEpisodes);
      const animeMovies = allAnime.filter(w => (w.totalEpisodes || 0) <= 1).sort((a, b) => (b as unknown as WatchedItem).watchedEpisodes - (a as unknown as WatchedItem).watchedEpisodes);
      totalCount = allAnime.reduce((acc, i) => acc + (i as unknown as WatchedItem).watchedEpisodes, 0);

      groups = [
        { title: 'Animated Series', items: animeSeries, subCount: animeSeries.reduce((acc, i) => acc + (i as unknown as WatchedItem).watchedEpisodes, 0), subLabel: 'EPISODES' },
        { title: 'Animated Movies', items: animeMovies }
      ].filter(g => g.items.length > 0);
    } else if (statsModalConfig.type === 'movies') {
      const allMovies = watchedItems
        .filter(w => w.type === MediaType.Movie || (w.type === MediaType.Anime && (w.totalEpisodes || 0) <= 1))
        .map(w => ({ ...w, backdropUrl: w.backdrop } as unknown as MediaItem));

      const liveAction = allMovies.filter(w => w.type === MediaType.Movie && !w.genres?.includes('Animation'));
      const animatedMovies = allMovies.filter(w => w.type === MediaType.Movie && w.genres?.includes('Animation'));
      const animeMovies = allMovies.filter(w => w.type === MediaType.Anime && (w.totalEpisodes || 0) <= 1);

      groups = [
        { title: 'Live-Action Movies', items: liveAction },
        { title: 'Animated Movies', items: animatedMovies },
        { title: 'Anime Movies', items: animeMovies }
      ].filter(g => g.items.length > 0);
      totalCount = groups.reduce((acc, g) => acc + g.items.length, 0);
    }

    return { groups, totalCount };
  }, [statsModalConfig, watched]);
}
