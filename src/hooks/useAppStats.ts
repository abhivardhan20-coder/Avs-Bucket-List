import { useMemo } from 'react';
import { WatchedItem } from '@/types';
import { calculateTimeStats } from '@/components/stats/StatsHelpers';

export function useAppStats(watched: WatchedItem[]) {
  const dashboardStats = useMemo(() => {
    const t = calculateTimeStats(watched);
    return {
      hours: t.hours,
      minutes: t.totalMinutes % 60,
      movieCount: t.movieCount,
      seriesCount: t.seriesCount,
      animatedCount: t.animeCount,
      totalTitles: watched.length,
      hoursMovies: t.hoursMovies,
      minutesMovies: t.movieMinutes % 60,
      hoursSeries: t.hoursSeries,
      minutesSeries: t.seriesMinutes % 60,
      hoursAnime: t.hoursAnime,
      minutesAnime: t.animeMinutes % 60
    };
  }, [watched]);

  return { dashboardStats };
}