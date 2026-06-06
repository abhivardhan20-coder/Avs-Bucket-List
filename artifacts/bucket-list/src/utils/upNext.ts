import { MediaItem, Episode, WatchedItem, MediaType } from '../types';

export interface UpNextItem {
  showId: string;
  showTitle: string;
  showPoster: string;
  nextEpisode: Episode;
  seasonNumber: number;
  type: MediaType;
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
  if (!fullMedia?.seasons?.length) return null;

  // Build a flat ordered list of all episodes across all seasons
  const allEpisodes = fullMedia.seasons
    .sort((a, b) => a.number - b.number)
    .flatMap(season =>
      (season.episodes || [])
        .sort((a, b) => a.number - b.number)
        .map(ep => ({ ...ep, seasonNumber: season.number }))
    );

  if (allEpisodes.length === 0) return null;

  // Find the last watched episode in series order
  const watchedIds = watchedItem.watchedEpisodeIds;
  let lastWatchedIndex = -1;
  for (let i = allEpisodes.length - 1; i >= 0; i--) {
    if (watchedIds.has(allEpisodes[i].id)) {
      lastWatchedIndex = i;
      break;
    }
  }

  const nextIndex = lastWatchedIndex + 1; // -1 + 1 = 0 if nothing watched → S1E1
  if (nextIndex >= allEpisodes.length) return null; // All watched

  const nextEp = allEpisodes[nextIndex];
  return {
    showId: fullMedia.id,
    showTitle: fullMedia.title,
    showPoster: fullMedia.posterUrl,
    nextEpisode: nextEp,
    seasonNumber: nextEp.seasonNumber,
    type: fullMedia.type,
  };
};
