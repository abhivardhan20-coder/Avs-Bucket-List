import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService } from '../services/CacheService';
import Redis from 'ioredis';
import { logger } from '../lib/logger';

const { mockGet, mockSet, mockDel } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
  mockDel: vi.fn()
}));

vi.mock('ioredis', () => {
  return {
    default: vi.fn(function() {
      // @ts-ignore
      this.get = mockGet;
      // @ts-ignore
      this.set = mockSet;
      // @ts-ignore
      this.del = mockDel;
      // @ts-ignore
      this.flushall = vi.fn();
    })
  };
});

vi.mock('../lib/logger', () => ({
  logger: {
    warn: vi.fn()
  }
}));

describe('CacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should gracefully handle Redis get failure and log warning', async () => {
    mockGet.mockRejectedValue(new Error('Redis connection lost'));

    const result = await CacheService.get('test_key');

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'test_key' }),
      'Redis get failed, falling back to database or primary source'
    );
  });

  it('should gracefully handle Redis set failure and log warning', async () => {
    mockSet.mockRejectedValue(new Error('Redis connection lost'));

    const result = await CacheService.set('test_key', 'test_value');

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'test_key' }),
      'Redis set failed'
    );
  });

  it('should gracefully handle Redis del failure and log warning', async () => {
    mockDel.mockRejectedValue(new Error('Redis connection lost'));

    const result = await CacheService.del('test_key');

    expect(result).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'test_key' }),
      'Redis del failed'
    );
  });
});
