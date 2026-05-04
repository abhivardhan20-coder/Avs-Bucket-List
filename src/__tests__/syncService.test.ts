import { describe, it, expect } from 'vitest';
import { mapWatchlistToSync, calculateDelta, SyncEntry } from '../services/syncService';
import { WatchlistItem, MediaType } from '@/types';

describe('syncService Utils', () => {
  const userId = 'user@example.com';
  
  describe('mapWatchlistToSync', () => {
    it('should correctly map a watchlist item to a sync entry', () => {
      const item: WatchlistItem = {
        id: '123',
        title: 'Inception',
        type: MediaType.Movie,
        poster: 'poster.jpg',
        addedAt: 123456789,
        updatedAt: '2025-01-01T00:00:00Z',
        version: 1,
        watchlistEpisodeIds: new Set(),
        watchlistSeasonIds: new Set(),
        rating: 8,
        year: 2010,
        genres: ['Sci-Fi'],
        totalEpisodes: 1
      };

      const sync = mapWatchlistToSync(item, userId);
      expect(sync.id).toBe('123');
      expect(sync.status).toBe('watchlist');
      expect(sync.userId).toBe(userId);
      expect(sync.version).toBe(1);
      const payload = JSON.parse(sync.payload || '{}');
      expect(payload.title).toBe('Inception');
    });
  });

  describe('calculateDelta', () => {
    it('should return only changed fields along with identity', () => {
      const current: SyncEntry = {
        id: '123',
        userId,
        status: 'watchlist',
        version: 2,
        updatedAt: '2025-01-02T00:00:00Z',
        title: 'Inception Updated',
        rating: 9
      };
      
      const previous: Partial<SyncEntry> = {
        id: '123',
        userId,
        status: 'watchlist',
        version: 1,
        updatedAt: '2025-01-01T00:00:00Z',
        title: 'Inception',
        rating: 8
      };

      const delta = calculateDelta(current, previous);
      expect(delta.id).toBe('123');
      expect(delta.title).toBe('Inception Updated');
      expect(delta.rating).toBe(9);
      expect(delta.version).toBe(2);
    });

    it('should return base identity if nothing changed', () => {
      const current: SyncEntry = {
        id: '123',
        userId,
        status: 'watchlist',
        version: 1,
        updatedAt: '2025-01-01T00:00:00Z',
        title: 'Inception'
      };
      
      const delta = calculateDelta(current, current);
      expect(delta.id).toBe('123');
      expect(Object.keys(delta).length).toBe(5); // id, userId, status, version, updatedAt
    });
  });
});
