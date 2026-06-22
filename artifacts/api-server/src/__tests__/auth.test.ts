import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { AuthService } from '../services/AuthService';

vi.mock('../services/AuthService', () => {
  return {
    AuthService: {
      register: vi.fn(),
      login: vi.fn(),
      resetPassword: vi.fn(),
      logout: vi.fn(),
    }
  };
});

// Mock Sentry to prevent it from trying to connect during tests
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
}));

// Mock jsonwebtoken to bypass authMiddleware JWT verification for logout tests
vi.mock('jsonwebtoken', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jsonwebtoken')>();
  return {
    ...actual,
    default: {
      ...actual,
      verify: vi.fn((token: string) => {
        if (token === 'valid_test_token') {
          return { sub: 'user_123', email: 'test@example.com', role: 'authenticated' };
        }
        throw new Error('Invalid token');
      }),
      decode: actual.decode,
    }
  };
});

// Mock blacklist to prevent DB calls during tests
vi.mock('../lib/blacklist', () => ({
  isBlacklisted: vi.fn(async () => false),
  addToBlacklist: vi.fn(async () => {}),
  cleanupBlacklist: vi.fn(async () => {}),
}));

// Mock CacheService to prevent Redis calls during tests
vi.mock('../services/CacheService', () => ({
  CacheService: {
    get: vi.fn(async () => undefined),
    set: vi.fn(async () => true),
    del: vi.fn(async () => 1),
    flushAll: vi.fn(async () => {}),
  }
}));

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a user', async () => {
      const mockResult = {
        user: { id: 'usr_123', email: 'test@example.com' },
        session: { access_token: 'mock_token', expires_in: 3600 }
      };
      vi.mocked(AuthService.register).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/auth/register').set('Origin', 'http://localhost:5173')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(AuthService.register).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should validate email and password length', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register').set('Origin', 'http://localhost:5173')
        .send({ email: 'invalid-email', password: '123' });

      expect(response.status).toBe(400);
      expect(AuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully login a user', async () => {
      const mockResult = {
        user: { id: 'usr_123', email: 'test@example.com' },
        session: { access_token: 'mock_token', expires_in: 3600 }
      };
      vi.mocked(AuthService.login).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/auth/login').set('Origin', 'http://localhost:5173')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(AuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should validate inputs', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login').set('Origin', 'http://localhost:5173')
        .send({ email: 'test@example.com' }); // missing password

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should successfully reset password', async () => {
      const mockResult = { success: true, message: 'Password reset instructions sent' };
      vi.mocked(AuthService.resetPassword).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/auth/reset-password').set('Origin', 'http://localhost:5173')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(AuthService.resetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should successfully logout with a valid Bearer token', async () => {
      const mockResult = { success: true, message: 'Logged out successfully' };
      vi.mocked(AuthService.logout).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', 'Bearer valid_test_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(AuthService.logout).toHaveBeenCalledWith(
        'Bearer valid_test_token',
        'user_123'
      );
    });

    it('should return 401 when no Authorization header is provided', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(401);
      expect(AuthService.logout).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is not a Bearer token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(response.status).toBe(401);
      expect(AuthService.logout).not.toHaveBeenCalled();
    });

    it('should return 401 when the JWT token is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', 'Bearer expired_or_invalid_token');

      expect(response.status).toBe(401);
      expect(AuthService.logout).not.toHaveBeenCalled();
    });

    it('should pass through service errors correctly', async () => {
      vi.mocked(AuthService.logout).mockRejectedValue(new Error('Token sub does not match authenticated user'));

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', 'Bearer valid_test_token');

      // The global error handler catches thrown errors
      expect(response.status).toBe(500);
      expect(AuthService.logout).toHaveBeenCalled();
    });

    it('should reject logout with extra body fields (strict validation)', async () => {
      const mockResult = { success: true, message: 'Logged out successfully' };
      vi.mocked(AuthService.logout).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Origin', 'http://localhost:5173')
        .set('Authorization', 'Bearer valid_test_token')
        .send({ malicious: 'data' });

      // The logoutSchema has body: z.object({}).strict().optional()
      // Sending extra fields should fail validation
      expect(response.status).toBe(400);
    });
  });
});
