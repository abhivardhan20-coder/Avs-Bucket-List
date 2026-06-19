import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/AuthService';
import { db } from '@workspace/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn()
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn()
      }))
    }))
  },
  usersTable: {
    email: 'email',
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn()
  }
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn()
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = 'test_secret_that_is_long_enough_32_chars';
  });

  describe('register', () => {
    it('should throw if user already exists', async () => {
      // Mock db.select().from().where() returning an array with an existing user
      const mockWhere = vi.fn().mockResolvedValue([{ id: '1' }]);
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: mockWhere })
      });

      await expect(AuthService.register('test@example.com', 'password123')).rejects.toThrow('User already exists');
    });

    it('should successfully register a new user', async () => {
      // Mock db.select().from().where() returning empty array
      const mockWhere = vi.fn().mockResolvedValue([]);
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: mockWhere })
      });

      // Mock hash
      (bcrypt.hash as any).mockResolvedValue('hashed_pwd');

      // Mock insert().values().returning()
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'new_id', email: 'test@example.com' }]);
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({ returning: mockReturning })
      });

      // Mock JWT sign
      (jwt.sign as any).mockReturnValue('mock_token');

      const result = await AuthService.register('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.session.access_token).toBe('mock_token');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });

  describe('login', () => {
    it('should throw on invalid credentials if user not found', async () => {
      const mockWhere = vi.fn().mockResolvedValue([]);
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: mockWhere })
      });

      await expect(AuthService.login('test@example.com', 'password123')).rejects.toThrow('Invalid email or password');
    });

    it('should login successfully with correct credentials', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{ id: '1', email: 'test@example.com', passwordHash: 'hashed_pwd' }]);
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: mockWhere })
      });

      (bcrypt.compare as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue('mock_token');

      const result = await AuthService.login('test@example.com', 'password123');
      expect(result.user.id).toBe('1');
      expect(result.session.access_token).toBe('mock_token');
    });
  });
});
