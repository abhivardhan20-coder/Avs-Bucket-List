import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';

// Mock jsonwebtoken verify to bypass auth middleware for authenticated routes
vi.mock('jsonwebtoken', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual.default,
      verify: vi.fn((token) => {
        if (token === 'valid_token') {
          return { sub: '123' };
        }
        throw new Error('Invalid token');
      })
    }
  };
});

vi.mock('../lib/blacklist', () => ({
  isBlacklisted: vi.fn(async (token) => false)
}));

describe('API Integration Tests', () => {
  describe('GET /api/v1/health/healthz', () => {
    it('should return status ok', async () => {
      const response = await request(app).get('/api/v1/health/healthz').set('Origin', 'http://localhost:5173');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/v1/preferences', () => {
    it('should return 401 if unauthorized', async () => {
      const response = await request(app)
        .post('/api/v1/preferences')
        .set('Origin', 'http://localhost:5173')
        .send({ theme: 'dark', notificationsEnabled: true });
      expect(response.status).toBe(401);
    });

    it('should validate inputs and return 400 for bad data', async () => {
      const response = await request(app)
        .post('/api/v1/preferences')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', 'Bearer valid_token')
        .send({ theme: 'invalid_theme', notificationsEnabled: true });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 200 with valid data and valid token', async () => {
      const response = await request(app)
        .post('/api/v1/preferences')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', 'Bearer valid_token')
        .send({ theme: 'dark', notificationsEnabled: true });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.theme).toBe('dark');
    });
  });
});
