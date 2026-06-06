import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMediaItem } from '../lib/api/mediaFetcher';
import { db } from '../lib/db';
import { fetchDetails } from '../services/tmdb';
import { fetchOmdbDetails, fetchJikanAnime } from '../services/fallbacks';
import { clearDedupCache } from '../lib/requestDeduplicator';

vi.mock('../lib/db', () => ({
  db: {
    mediaCache: {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined)
    }
  }
}));

vi.mock('../services/tmdb', () => ({
  fetchDetails: vi.fn()
}));

vi.mock('../services/fallbacks', () => ({
  fetchOmdbDetails: vi.fn(),
  fetchJikanAnime: vi.fn(),
  fetchKitsuAnime: vi.fn()
}));

describe('mediaFetcher', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        clearDedupCache();
    });

    it('should return TMDB data if available and cache it', async () => {
        const mockTmdb = { title: 'TMDB Show', rating: 9, dataSource: 'tmdb' };
        (fetchDetails as any).mockResolvedValue(mockTmdb);

        const res = await fetchMediaItem('show_123', 'tv');

        expect(res?.title).toBe('TMDB Show');
        expect(db.mediaCache.put).toHaveBeenCalled();
        expect(fetchOmdbDetails).not.toHaveBeenCalled();
    });

    it('should fallback to OMDB if TMDB fails for a movie', async () => {
        (fetchDetails as any).mockResolvedValue(null);
        (fetchOmdbDetails as any).mockResolvedValue({ title: 'OMDB Movie', dataSource: 'omdb' });
        (db.mediaCache.get as any).mockResolvedValue({ title: 'Cached Title' });

        const res = await fetchMediaItem('movie_123', 'movie');

        expect(res?.title).toBe('OMDB Movie');
        expect(res?.dataSource).toBe('omdb');
        expect(fetchOmdbDetails).toHaveBeenCalled();
    });

    it('should fallback to Jikan for anime', async () => {
        (fetchDetails as any).mockResolvedValue(null);
        (fetchJikanAnime as any).mockResolvedValue({ title: 'Anime Show', dataSource: 'jikan' });

        const res = await fetchMediaItem('anime_123', 'anime', true);

        expect(res?.title).toBe('Anime Show');
        expect(fetchJikanAnime).toHaveBeenCalled();
    });

    it('should return stale cached data if all external sources fail', async () => {
        (fetchDetails as any).mockResolvedValue(null);
        (fetchOmdbDetails as any).mockResolvedValue(null);
        (db.mediaCache.get as any).mockResolvedValue({ title: 'Stale Cache', overview: '' });

        const res = await fetchMediaItem('movie_123', 'movie');

        expect(res?.title).toBe('Stale Cache');
        expect(res?.dataSource).toBe('local_cache');
    });

    it('should return null if everything fails and nothing is cached', async () => {
        (fetchDetails as any).mockResolvedValue(null);
        (fetchOmdbDetails as any).mockResolvedValue(null);
        (db.mediaCache.get as any).mockResolvedValue(null);

        const res = await fetchMediaItem('movie_123', 'movie');
        expect(res).toBeNull();
    });

    it('should force refresh for Returning Series without nextEpisode (The Boys case)', async () => {
        const now = Date.now();
        const theBoysCache = {
            id: 'series_3572',
            title: 'The Boys',
            type: 'Series',
            status: 'Returning Series',
            nextEpisode: undefined, // Missing - should trigger refresh
            lastAirDate: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
            lastRefreshedAt: now - 12 * 60 * 60 * 1000 // 12 hours ago (within 48-hour window)
        };
        
        const freshData = { 
            title: 'The Boys', 
            status: 'Returning Series',
            nextEpisode: { 
                airDate: '2026-04-29', 
                episodeNumber: 5, 
                seasonNumber: 4 
            }
        };
        
        (db.mediaCache.get as any).mockResolvedValue(theBoysCache);
        (fetchDetails as any).mockResolvedValue(freshData);

        const res = await fetchMediaItem('series_3572', 'tv');

        // Should have fetched fresh data from TMDB despite being cached < 48h
        expect(fetchDetails).toHaveBeenCalledWith('series_3572', undefined);
        expect(res?.nextEpisode).toBeDefined();
        expect(res?.nextEpisode?.airDate).toBe('2026-04-29');
        expect(db.mediaCache.put).toHaveBeenCalled();
    });

    it('should force refresh for shows that aired recently (within 7 days)', async () => {
        const now = Date.now();
        const recentShow = {
            id: 'series_12345',
            title: 'Recent Show',
            type: 'Series',
            status: 'Returning Series',
            nextEpisode: undefined,
            lastAirDate: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
            lastRefreshedAt: now - 48 * 60 * 60 * 1000 // 48 hours ago
        };
        
        const freshData = { 
            title: 'Recent Show', 
            status: 'Returning Series',
            nextEpisode: { airDate: '2026-05-05', episodeNumber: 3, seasonNumber: 1 }
        };
        
        (db.mediaCache.get as any).mockResolvedValue(recentShow);
        (fetchDetails as any).mockResolvedValue(freshData);

        const res = await fetchMediaItem('series_12345', 'tv');

        // Should fetch fresh data because show aired recently
        expect(fetchDetails).toHaveBeenCalledWith('series_12345', undefined);
        expect(res?.nextEpisode).toBeDefined();
        expect(db.mediaCache.put).toHaveBeenCalled();
    });
});
