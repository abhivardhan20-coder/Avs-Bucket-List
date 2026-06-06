import { WatchlistItem } from '../types';
import { UserTaste } from './recommendationEngine';

export interface WatchNextCandidate {
  item: WatchlistItem;
  score: number;
  reason: string;
}

/**
 * Ranks items in the user's watchlist to recommend what to watch next.
 * Factors:
 * 1. Staleness: Items added a long time ago score higher (30-day scaling).
 * 2. Next Episode: Highly weighted if a new episode is already aired and available.
 * 3. Rating: Small boost for high TMDB ratings.
 * 4. Taste: Boosts genres that match the user's top taste profile.
 */
export function rankWatchlistForNext(
  watchlist: WatchlistItem[],
  taste: UserTaste,
  now = Date.now()
): WatchNextCandidate[] {
  const ONE_DAY = 1000 * 60 * 60 * 24;

  return watchlist
    .map(item => {
      let score = 0;
      let reason = '';

      // 1. Staleness (Max 3 pts)
      // Items sitting unwatched for longer score higher to encourage clearing the backlog.
      const addedAt = new Date(item.addedAt || now).getTime();
      const daysSinceAdded = (now - addedAt) / ONE_DAY;
      score += Math.min(daysSinceAdded / 30, 3);

      // 2. Next Episode Availability (5 pts)
      // If a series has an episode that has already aired, it's a prime candidate.
      if (item.nextEpisode && item.nextEpisode.airDate) {
        const airDate = new Date(item.nextEpisode.airDate).getTime();
        if (airDate <= now) {
          score += 5;
          reason = `Next up: ${item.nextEpisode.name}`;
        }
      }

      // 3. TMDB Rating (1.5 pts)
      if (item.rating && item.rating > 7.5) {
        score += 1.5;
      }

      // 4. Genre Match with Taste (2 pts)
      // Checks item genres against the user's top 3 preferred genres.
      const userTopGenres = taste.topGenres.slice(0, 3).map(tg => tg.genre);
      const genreMatch = item.genres?.some(g => userTopGenres.includes(g));
      
      if (genreMatch) {
        score += 2;
        if (!reason) reason = `Matches your ${userTopGenres[0]} preference`;
      }

      // Default reason if nothing specific triggered
      if (!reason) {
        reason = daysSinceAdded > 7 
          ? `Waiting for ${Math.round(daysSinceAdded)} days` 
          : "Fresh in your watchlist";
      }

      return { item, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
