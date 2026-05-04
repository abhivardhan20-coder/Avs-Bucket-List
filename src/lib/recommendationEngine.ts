// src/lib/recommendationEngine.ts
import { db } from './db';
import { MediaItem, MediaType } from '../types';

export interface UserTaste {
  topGenres: { genre: string; score: number }[];
  topCast: string[];
  topDirectors: string[];
  preferredType: MediaType;
  avgRatingByGenre: Record<string, number>;
}

/**
 * Builds a user taste profile by analyzing watched items in the local database.
 * Higher weight is given to recent watches and highly rated genres.
 */
export async function buildUserTaste(userEmail: string): Promise<UserTaste> {
  const watched = await db.watched
    .where('userEmail').equals(userEmail)
    .toArray();

  const genreScores: Record<string, number> = {};
  const castCount: Record<string, number> = {};
  const directorCount: Record<string, number> = {};
  const genreRatings: Record<string, number[]> = {};
  const typeCounts: Record<string, number> = {};

  const now = Date.now();
  const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;

  for (const item of watched) {
    // Recency weight: items watched more recently score higher
    const updatedAt = new Date(item.updatedAt || now).getTime();
    const recencyWeight = Math.max(0.3, 1 - (now - updatedAt) / (ONE_YEAR * 2));
    const ratingBoost = item.rating ? item.rating / 5 : 0.5;
    const weight = recencyWeight * ratingBoost;

    (item.genres || []).forEach((g: string) => {
      genreScores[g] = (genreScores[g] || 0) + weight;
      if (item.rating) {
        genreRatings[g] = genreRatings[g] || [];
        genreRatings[g].push(item.rating);
      }
    });

    // Cast & Director weight (if available in database record)
    (item.cast || []).slice(0, 3).forEach((c: string) => {
      castCount[c] = (castCount[c] || 0) + 1;
    });

    if (item.director) directorCount[item.director] = (directorCount[item.director] || 0) + 1;
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
  }

  const topGenres = Object.entries(genreScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, score]) => ({ genre, score }));

  const avgRatingByGenre: Record<string, number> = {};
  for (const [genre, ratings] of Object.entries(genreRatings)) {
    avgRatingByGenre[genre] = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }

  return {
    topGenres,
    topCast: Object.entries(castCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([c]) => c),
    topDirectors: Object.entries(directorCount).sort((a,b) => b[1]-a[1]).slice(0,3).map(([d]) => d),
    preferredType: (Object.entries(typeCounts).sort((a,b) => b[1]-a[1])[0]?.[0] as MediaType) || MediaType.Movie,
    avgRatingByGenre
  };
}

/**
 * Scores a single item against the derived UserTaste profile.
 */
export function scoreItem(item: MediaItem, taste: UserTaste, excludedIds: Set<string>): number {
  if (excludedIds.has(item.id)) return -1; // Skip already watched or in watchlist
  
  let score = 0;

  // Genre Matching (Heaviest Weight)
  item.genres?.forEach(g => {
    const match = taste.topGenres.find(t => t.genre === g);
    if (match) score += match.score * 2.5; // High boost for top genres
    if (taste.avgRatingByGenre[g] > 3.5) score += 1.5; // Boost if you tend to rate this genre highly
  });

  // Cast & Director Matching
  item.cast?.forEach(c => { if (taste.topCast.includes(c)) score += 2; });
  if (item.director && taste.topDirectors.includes(item.director)) score += 3;
  
  // Type Affinity
  if (item.type === taste.preferredType) score += 1;
  
  // Popularity/Rating baseline
  score += (item.rating || 0) / 4;

  return score;
}
