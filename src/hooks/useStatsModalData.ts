import { useMemo } from 'react';
import { MediaItem, MediaType, WatchedItem } from '@/types';
import { StatsGroup } from '@/components/stats/StatsListModal';

export function useStatsModalData(
  statsModalConfig: { isOpen: boolean; title: string; type: 'series' | 'anime' | 'movies' } | null,
  watched: MediaItem[]
) {
  return useMemo(() => {
    if (!statsModalConfig) return null;

    let groups: StatsGroup[] = [];
    let totalCount = 0;
    const watchedItems = watched as unknown as WatchedItem[];

    if (statsModalConfig.type === 'series') {
      const items = watchedItems
        .filter(w => w.type === MediaType.Series)
        .sort((a, b) => b.watchedEpisodes - a.watchedEpisodes)
        .map(w => ({ ...w, backdropUrl: w.backdrop }));

      totalCount = items.reduce((acc, i) => acc + i.watchedEpisodes, 0);
      const animatedSeries = items.filter(w => w.genres?.includes('Animation'));
      const liveActionSeries = items.filter(w => !w.genres?.includes('Animation'));
      
      groups = [
        { title: 'Live Action Series', items: liveActionSeries as any[], subCount: liveActionSeries.reduce((acc, i) => acc + i.watchedEpisodes, 0), subLabel: 'EPISODES' },
        { title: 'Animated Series', items: animatedSeries as any[], subCount: animatedSeries.reduce((acc, i) => acc + i.watchedEpisodes, 0), subLabel: 'EPISODES' }
      ].filter(g => g.items.length > 0);
    } else if (statsModalConfig.type === 'anime') {
      const allAnime = watchedItems
        .filter(w => w.type === MediaType.Anime)
        .map(w => ({ ...w, backdropUrl: w.backdrop }));

      const animeSeries = allAnime.filter(w => (w.totalEpisodes || 0) > 1).sort((a, b) => b.watchedEpisodes - a.watchedEpisodes);
      const animeMovies = allAnime.filter(w => (w.totalEpisodes || 0) <= 1).sort((a, b) => b.watchedEpisodes - a.watchedEpisodes);
      totalCount = allAnime.reduce((acc, i) => acc + i.watchedEpisodes, 0);

      groups = [
        { title: 'Animated Series', items: animeSeries as any[], subCount: animeSeries.reduce((acc, i) => acc + i.watchedEpisodes, 0), subLabel: 'EPISODES' },
        { title: 'Animated Movies', items: animeMovies as any[] }
      ].filter(g => g.items.length > 0);
    } else if (statsModalConfig.type === 'movies') {
      const allMovies = watchedItems
        .filter(w => w.type === MediaType.Movie || (w.type === MediaType.Anime && (w.totalEpisodes || 0) <= 1))
        .map(w => ({ ...w, backdropUrl: w.backdrop }));

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
}
