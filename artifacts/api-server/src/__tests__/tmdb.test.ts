import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import tmdbRouter from '../routes/tmdb';
import { CacheService } from '../services/CacheService';

// Mock CacheService
vi.mock('../services/CacheService', () => ({
  CacheService: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Setup express app with the router
const app = express();
app.use('/api/v1/tmdb', tmdbRouter);

describe('TMDB Proxy Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_TMDB_API_KEY = 'test_api_key';
  });

  it('should return cached response if available', async () => {
    const cachedData = { page: 1, results: [{ id: 1, title: 'Test Movie' }] };
    vi.mocked(CacheService.get).mockResolvedValue(cachedData);

    const response = await request(app).get('/api/v1/tmdb/movie/popular');
    console.log("RESPONSE BODY:", response.body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(cachedData);
    expect(CacheService.get).toHaveBeenCalledWith('tmdb_proxy:/movie/popular');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch from TMDB and cache response if not in cache', async () => {
    vi.mocked(CacheService.get).mockResolvedValue(undefined);
    const tmdbData = { page: 1, results: [{ id: 2, title: 'New Movie' }] };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => tmdbData
    });

    const response = await request(app).get('/api/v1/tmdb/movie/top_rated');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(tmdbData);
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/top_rated?api_key=test_api_key',
      expect.objectContaining({
        headers: {
          accept: 'application/json'
        }
      })
    );

    // 86400 is 24 hours
    expect(CacheService.set).toHaveBeenCalledWith('tmdb_proxy:/movie/top_rated', tmdbData, 86400);
  });

  it('should forward query parameters to TMDB', async () => {
    vi.mocked(CacheService.get).mockResolvedValue(undefined);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    await request(app).get('/api/v1/tmdb/search/movie?query=matrix&page=2');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/search/movie?query=matrix&page=2&api_key=test_api_key',
      expect.any(Object)
    );
    expect(CacheService.set).toHaveBeenCalledWith('tmdb_proxy:/search/movie?query=matrix&page=2', expect.any(Object), 86400);
  });

  it('should return 502 if TMDB API fails', async () => {
    vi.mocked(CacheService.get).mockResolvedValue(undefined);
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const response = await request(app).get('/api/v1/tmdb/invalid_endpoint');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'TMDB API error: Not Found' });
    expect(CacheService.set).not.toHaveBeenCalled();
  });
});
