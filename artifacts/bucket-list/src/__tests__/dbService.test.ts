import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbService } from '../services/dbService';
import { db } from '../lib/db';
import { MediaItem, MediaType } from '../types';

vi.mock('../lib/db', () => ({
  db: {
    mediaCache: {
      put: vi.fn(),
      get: vi.fn(),
      clear: vi.fn(),
    }
  }
}));

describe('dbService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockItem: MediaItem = {
    id: '123',
    title: 'Test Movie',
    type: MediaType.Movie,
    posterUrl: '',
    rating: 8,
    year: 2023,
    genres: [],
    backdropUrl: '',
    overview: ''
  };

  it('should cache media item', async () => {
    await dbService.cacheMediaItem(mockItem);
    expect(db.mediaCache.put).toHaveBeenCalledWith(mockItem);
  });

  it('should get cached item', async () => {
    vi.mocked(db.mediaCache.get).mockResolvedValueOnce(mockItem);
    const result = await dbService.getCachedItem('123');
    expect(db.mediaCache.get).toHaveBeenCalledWith('123');
    expect(result).toEqual(mockItem);
  });

  it('should clear cache', async () => {
    await dbService.clearCache();
    expect(db.mediaCache.clear).toHaveBeenCalled();
  });
});
