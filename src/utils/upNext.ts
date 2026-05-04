import { MediaItem, Episode, WatchedItem } from '../types';

export interface UpNextItem {
  showId: string;
  showTitle: string;
  showPoster: string;
  nextEpisode: Episode;
  seasonNumber: number;
}

/**
 * Parses an episode ID to extract season and episode numbers.
 * Format: ep_${tmdbId}_${season}_${episode}
 */
export const parseEpisodeId = (id: string) => {
  const parts = id.split('_');
  if (parts.length < 4) return { season: 0, episode: 0 };
  return {
    season: parseInt(parts[2], 10),
    episode: parseInt(parts[3], 10)
  };
};

/**
 * Identifies the next episode to watch for a given series.
 */
export const getUpNextForSeries = (
  watchedItem: WatchedItem,
  fullMedia: MediaItem | null
): UpNextItem | null => {
  if (!fullMedia || !fullMedia.seasons || fullMedia.seasons.length === 0) return null;

  // 1. Find the highest watched episode
  let maxSeason = -1;
  let maxEpisode = -1;

  watchedItem.watchedEpisodeIds.forEach(id => {
    const { season, episode } = parseEpisodeId(id);
    if (season > maxSeason) {
      maxSeason = season;
      maxEpisode = episode;
    } else if (season === maxSeason && episode > maxEpisode) {
      maxEpisode = episode;
    }
  });

  // If nothing watched, start with S1 E1
  if (maxSeason === -1) {
    maxSeason = 1;
    maxEpisode = 0; // Pretend we watched E0 of S1
  }

  // 2. Look for the next episode in the same season
  const currentSeason = fullMedia.seasons.find(s => s.number === maxSeason);
  if (currentSeason && currentSeason.episodes) {
    const nextInSeason = currentSeason.episodes.find(e => e.number === maxEpisode + 1);
    if (nextInSeason) {
      return {
        showId: fullMedia.id,
        showTitle: fullMedia.title,
        showPoster: fullMedia.posterUrl,
        nextEpisode: nextInSeason,
        seasonNumber: maxSeason
      };
    }
  }

  // 3. If not found, look for the first episode of the next season
  const nextSeason = fullMedia.seasons.find(s => s.number === maxSeason + 1);
  if (nextSeason && nextSeason.episodes) {
    const firstInNext = nextSeason.episodes.find(e => e.number === 1);
    if (firstInNext) {
      return {
        showId: fullMedia.id,
        showTitle: fullMedia.title,
        showPoster: fullMedia.posterUrl,
        nextEpisode: firstInNext,
        seasonNumber: maxSeason + 1
      };
    }
  }

  return null;
};
