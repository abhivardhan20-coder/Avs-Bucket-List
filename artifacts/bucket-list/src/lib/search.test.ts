import { describe, it, expect } from 'vitest';
// We only import what we need to unit test pure logic
// Note: search.ts has some non-exported helper functions we might need to export or test via public ones
// Since getSimilarityScore and rankItems are internal but used by searchMovies, 
// we'll assume they are testable if we export them or test via a public wrapper.
// Actually, looking at search.ts, they ARE NOT exported.
// I will temporarily export them in search.ts or test via unifiedSearch (mapped to mocks)
// But the user asked to "unit test the pure functions". 
// I'll update search.ts to export them.

import { MediaItem, MediaType } from '@/types';

// For this test to work, I'll update search.ts to export getSimilarityScore and rankItems
import { getSimilarityScore, rankItems } from './search';

describe('Search Utils', () => {
  describe('getSimilarityScore', () => {
    it('should return 100 for exact match', () => {
      expect(getSimilarityScore('Inception', 'Inception')).toBe(100);
    });

    it('should return 80 for prefix match', () => {
      expect(getSimilarityScore('Inception', 'Incep')).toBe(80);
    });

    it('should return 60 for substring match', () => {
      expect(getSimilarityScore('The Inception Movie', 'Inception')).toBe(60);
    });
  });

  describe('rankItems', () => {
    const items: MediaItem[] = [
      { id: '1', title: 'The Matrix', year: 1999, type: MediaType.Movie, backdropUrl: '', posterUrl: '', overview: '', rating: 0, genres: [] },
      { id: '2', title: 'Matrix Reloaded', year: 2003, type: MediaType.Movie, backdropUrl: '', posterUrl: '', overview: '', rating: 0, genres: [] },
      { id: '3', title: 'Matrix', year: 1999, type: MediaType.Movie, backdropUrl: '', posterUrl: '', overview: '', rating: 0, genres: [] }
    ];

    it('should put exact match first', () => {
      const ranked = rankItems(items, 'Matrix');
      expect(ranked[0].title).toBe('Matrix');
    });

    it('should sort by year descending for similar relevance', () => {
      const similarItems: MediaItem[] = [
        { id: '1', title: 'Action Movie', year: 2010, type: MediaType.Movie, backdropUrl: '', posterUrl: '', overview: '', rating: 0, genres: [] },
        { id: '2', title: 'Action Movie', year: 2020, type: MediaType.Movie, backdropUrl: '', posterUrl: '', overview: '', rating: 0, genres: [] }
      ];
      const ranked = rankItems(similarItems, 'Action');
      expect(ranked[0].year).toBe(2020);
    });
  });
});
