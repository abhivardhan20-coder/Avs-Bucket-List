import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';

// Mock jsonwebtoken verify to bypass auth middleware for authenticated routes
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token, secret) => {
      if (token === 'valid_token') {
        return { userId: '123' };
      }
      throw new Error('Invalid token');
    })
  }
}));

describe('API Integration Tests', () => {
  describe('GET /api/health/healthz', () => {
    it('should return status ok', async () => {
      const response = await request(app).get('/api/health/healthz');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/preferences', () => {
    it('should return 401 if unauthorized', async () => {
      const response = await request(app)
        .post('/api/preferences')
        .send({ theme: 'dark', notificationsEnabled: true });
      expect(response.status).toBe(401);
    });

    it('should validate inputs and return 400 for bad data', async () => {
      const response = await request(app)
        .post('/api/preferences')
        .set('Authorization', 'Bearer valid_token')
        .send({ theme: 'invalid_theme', notificationsEnabled: true });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should return 200 with valid data and valid token', async () => {
      const response = await request(app)
        .post('/api/preferences')
        .set('Authorization', 'Bearer valid_token')
        .send({ theme: 'dark', notificationsEnabled: true });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.theme).toBe('dark');
    });
  });
});
