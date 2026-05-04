import { MediaItem, WatchedItem, MediaType } from '../types';
import { parseLocalDate } from '../lib/dateUtils';

const WINDOW_DAYS = 14;
const UPCOMING_WINDOW = 14; 

export interface ActivityResult {
  isActive: boolean;
  score: number;
  label?: 'Season Premiere' | 'New Episode' | 'Returning' | 'Airing Today' | 'Upcoming';
  currentSeasonProgress?: number;
}

/**
 * Intelligent show activity detection restricted to ±14 days.
 */
export function calculateShowActivity(
  media: MediaItem, 
  watched: WatchedItem, 
  now: Date = new Date()
): ActivityResult {
  if (media.type === MediaType.Movie) return { isActive: false, score: 0 };

  // --- 0. STATUS FILTER ---
  const isEndedOrCanceled = media.status === 'Ended' || media.status === 'Canceled';
  if (isEndedOrCanceled) {
    return { isActive: false, score: 0 };
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const pastWindow = new Date(today);
  pastWindow.setDate(today.getDate() - WINDOW_DAYS);

  const futureWindow = new Date(today);
  futureWindow.setDate(today.getDate() + UPCOMING_WINDOW);

  let isActive = false;
  let score = 0;
  let label: ActivityResult['label'] = undefined;

  // 1. Check Official TMDB Airing Info (Highest Priority)
  if (media.nextEpisode) {
    const epDate = parseLocalDate(media.nextEpisode.airDate);
    if (epDate) {
      // If it's within the ±14 day window, mark as active
      if (epDate >= pastWindow && epDate <= futureWindow) {
        isActive = true;
        score += 50;

        if (epDate.getTime() === today.getTime()) label = 'Airing Today';
        else if (epDate > today) label = 'Upcoming';
        else label = 'New Episode';

        if (media.nextEpisode.episodeNumber === 1) label = 'Season Premiere';
      }
    }
  }

  // 2. Recent Past Airing (Secondary Priority)
  if (!isActive && media.lastAirDate) {
    const lastAir = parseLocalDate(media.lastAirDate);
    if (lastAir && lastAir >= pastWindow && lastAir <= today) {
      isActive = true;
      score += 40;
      label = 'New Episode';
    }
  }

  // 3. Returning Series fallback: if status is 'Returning Series' and
  //    lastAirDate is within 30 days, treat as active even without nextEpisode.
  //    This catches shows like The Boys whose nextEpisode cache may be stale.
  if (!isActive && media.status === 'Returning Series' && media.lastAirDate) {
    const lastAir = parseLocalDate(media.lastAirDate);
    const recentWindow = new Date(today);
    recentWindow.setDate(today.getDate() - 30);
    if (lastAir && lastAir >= recentWindow && lastAir <= today) {
      isActive = true;
      score += 30;
      label = 'Returning';
    }
  }

  // 4. Progress calculation for the current active season
  let currentSeasonProgress: number | undefined = undefined;
  if (isActive && media.seasons && media.seasons.length > 0) {
    const currentSeasonNum = media.nextEpisode?.seasonNumber || 
                            (media.lastAirDate ? media.seasons.find(s => s.airDate === media.lastAirDate)?.number : undefined);
    
    if (currentSeasonNum) {
      const currentSeason = media.seasons.find(s => s.number === currentSeasonNum);
      if (currentSeason && currentSeason.episodes && currentSeason.episodes.length > 0) {
        const watchedIds = watched.watchedEpisodeIds || new Set();
        const watchedInSeason = currentSeason.episodes.filter(e => watchedIds.has(e.id)).length;
        currentSeasonProgress = (watchedInSeason / currentSeason.episodes.length) * 100;
      }
    }
  }

  // 5. Stable Sorting Weight
  const baseEpoch = new Date('2026-01-01').getTime();
  const updateEpoch = new Date(watched.updatedAt || Date.now()).getTime();
  const stableWeight = (updateEpoch - baseEpoch) / (1000 * 60 * 60 * 24 * 365 * 10); 
  score += stableWeight;

  return { isActive, score, label, currentSeasonProgress };
}