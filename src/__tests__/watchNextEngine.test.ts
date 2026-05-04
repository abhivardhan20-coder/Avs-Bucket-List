import { describe, it, expect } from 'vitest';
import { rankWatchlistForNext } from '../lib/watchNextEngine';
import { WatchlistItem, MediaType } from '../types';
import { UserTaste } from '../lib/recommendationEngine';

describe('rankWatchlistForNext', () => {
  const mockTaste: UserTaste = {
    topGenres: [{ genre: 'Action', score: 10 }, { genre: 'Sci-Fi', score: 8 }],
    topCast: [],
    topDirectors: [],
    preferredType: MediaType.Movie,
    avgRatingByGenre: {}
  };

  const baseItem: WatchlistItem = {
    id: '1',
    type: MediaType.Movie,
    title: 'Movie 1',
    poster: '',
    addedAt: Date.now(),
    updatedAt: new Date().toISOString(),
    version: 1,
    watchlistEpisodeIds: new Set(),
    watchlistSeasonIds: new Set(),
    rating: 7.0,
    year: 2024,
    genres: [],
    totalEpisodes: 1
  };

  it('should prioritize items added longer ago (staleness)', () => {
    const now = Date.now();
    const item1 = { ...baseItem, id: '1', title: 'New', addedAt: now };
    const item2 = { ...baseItem, id: '2', title: 'Old', addedAt: now - (60 * 24 * 60 * 60 * 1000) }; // 60 days ago

    const results = rankWatchlistForNext([item1, item2], mockTaste, now);
    expect(results[0].item.id).toBe('2');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('should give a massive boost to items with next episodes available', () => {
    const now = Date.now();
    const item1 = { ...baseItem, id: '1', title: 'No Episode' };
    const item2 = { 
        ...baseItem, 
        id: '2', 
        title: 'Has Episode', 
        nextEpisode: { id: 'ep1', name: 'Ep 1', airDate: '2020-01-01', seasonNumber: 1, episodeNumber: 1, daysUntil: -1 }
    };

    const results = rankWatchlistForNext([item1, item2], mockTaste, now);
    expect(results[0].item.id).toBe('2');
    expect(results[0].reason).toContain('Next up');
  });

  it('should boost items matching top genres', () => {
    const item1 = { ...baseItem, id: '1', genres: ['Drama'] };
    const item2 = { ...baseItem, id: '2', genres: ['Action'] };

    const results = rankWatchlistForNext([item1, item2], mockTaste);
    expect(results[0].item.id).toBe('2');
    expect(results[0].reason).toContain('Matches your Action preference');
  });

  it('should return top 3 picks maximum', () => {
    const items = [baseItem, baseItem, baseItem, baseItem, baseItem];
    const results = rankWatchlistForNext(items, mockTaste);
    expect(results).toHaveLength(3);
  });
});
