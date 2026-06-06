import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentService } from '../services/contentService';
import { db } from '../lib/db';
import * as tmdb from '../services/tmdb';
import { resolveUpcomingContent, getStandardBadge, parseLocalDate } from '../lib/dateUtils';
import { MediaType, MediaItem } from '../types';

vi.mock('../lib/db', () => {
  const mockCache: any = {
    get: () => Promise.resolve(null),
    put: () => Promise.resolve(),
    bulkPut: () => Promise.resolve(),
    where: () => mockCache,
    anyOf: () => mockCache,
    toArray: () => Promise.resolve([])
  };
  return {
    db: {
      mediaCache: mockCache
    }
  };
});

vi.mock('../services/tmdb', () => ({
  fetchItemsByIds: vi.fn()
}));

describe('Upcoming Features & Cache Hydration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('ContentService.getItemsByIds caching & hydration', () => {
    it('should return cached items if they are complete and fresh', async () => {
      const mockCached: MediaItem[] = [
        {
          id: 'movie_1',
          title: 'Fresh Movie',
          type: MediaType.Movie,
          backdropUrl: '',
          posterUrl: '',
          overview: '',
          rating: 7.5,
          year: 2024,
          genres: ['Action'],
          runtime: 120,
          lastRefreshedAt: Date.now() - 1000 // 1 sec ago (fresh)
        }
      ];

      db.mediaCache.toArray = () => Promise.resolve(mockCached) as any;

      const results = await ContentService.getItemsByIds(['movie_1']);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Fresh Movie');
      expect(tmdb.fetchItemsByIds).not.toHaveBeenCalled();
    });

    it('should re-fetch and hydrate items if cached item is incomplete (missing seasons/runtime)', async () => {
      const mockCachedIncomplete: MediaItem[] = [
        {
          id: 'series_123',
          title: 'Incomplete Series',
          type: MediaType.Series,
          backdropUrl: '',
          posterUrl: '',
          overview: '',
          rating: 8.0,
          year: 2024,
          genres: ['Drama'],
          // missing runtime and seasons
          lastRefreshedAt: Date.now() - 1000
        }
      ];

      const mockFetchedComplete: MediaItem[] = [
        {
          id: 'series_123',
          title: 'Incomplete Series',
          type: MediaType.Series,
          backdropUrl: '',
          posterUrl: '',
          overview: '',
          rating: 8.0,
          year: 2024,
          genres: ['Drama'],
          runtime: 45,
          seasons: [{ id: 's1', number: 1, title: 'Season 1', posterUrl: '', airDate: '2025-01-01', episodes: [], episodeCount: 10 }],
          lastRefreshedAt: Date.now()
        }
      ];

      db.mediaCache.toArray = () => Promise.resolve(mockCachedIncomplete) as any;
      (tmdb.fetchItemsByIds as any).mockResolvedValue(mockFetchedComplete);

      const results = await ContentService.getItemsByIds(['series_123']);
      expect(results).toHaveLength(1);
      expect(results[0].seasons).toBeDefined();
      expect(results[0].runtime).toBe(45);
      expect(tmdb.fetchItemsByIds).toHaveBeenCalledWith(['series_123']);
    });
  });

  describe('resolveUpcomingContent fallback and badges', () => {
    it('should generate fallback badges via getStandardBadge even if resolveUpcomingContent is null', () => {
      const releasedMovie: MediaItem = {
        id: 'movie_released',
        title: 'Old Movie',
        type: MediaType.Movie,
        backdropUrl: '',
        posterUrl: '',
        overview: '',
        rating: 6.5,
        year: 2020,
        genres: ['Sci-Fi'],
        releaseDate: '2020-01-01'
      };

      const upcoming = resolveUpcomingContent(releasedMovie);
      expect(upcoming).toBeNull(); // past release date is not upcoming

      const badge = getStandardBadge(releasedMovie);
      expect(badge.text).toBe('Movie');
      expect(badge.color).toBe('bg-gray-700');
    });

    it('should parse YYYY-MM-DD cleanly using parseLocalDate', () => {
      const date = parseLocalDate('2026-05-31');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(4); // 0-indexed May
      expect(date?.getDate()).toBe(31);
    });
  });
});
