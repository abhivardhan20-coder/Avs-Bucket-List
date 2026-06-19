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
});
