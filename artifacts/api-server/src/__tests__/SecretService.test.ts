import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecretService } from '../services/SecretService';
import fs from 'fs';
import { env } from '../lib/env';

vi.mock('fs');
vi.mock('../lib/env', () => ({
  env: {
    SUPABASE_JWT_SECRET: ['initial_secret_1', 'initial_secret_2']
  }
}));

describe('SecretService', () => {
  const originalEnv = process.env.SUPABASE_JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset private fields for testing
    (SecretService as any).cachedSecrets = [];
    (SecretService as any).lastLoadTime = 0;
    delete process.env.SUPABASE_JWT_SECRET;
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.SUPABASE_JWT_SECRET = originalEnv;
  });

  it('should load initial secrets from env if process.env is empty', () => {
    const secrets = SecretService.getSecrets();
    expect(secrets).toEqual(['initial_secret_1', 'initial_secret_2']);
  });

  it('should load secrets from process.env if it exists dynamically', () => {
    process.env.SUPABASE_JWT_SECRET = "env_secret_1, env_secret_2";
    const secrets = SecretService.getSecrets();
    expect(secrets).toEqual(['env_secret_1', 'env_secret_2']);
  });

  it('should cache secrets and not reload immediately', () => {
    vi.useFakeTimers();
    process.env.SUPABASE_JWT_SECRET = "env_secret_1";
    
    // First call
    const s1 = SecretService.getSecrets();
    expect(s1).toEqual(['env_secret_1']);
    
    // Change environment directly
    process.env.SUPABASE_JWT_SECRET = "env_secret_2";
    
    // Second call immediately should be cached
    const s2 = SecretService.getSecrets();
    expect(s2).toEqual(['env_secret_1']); // Still cached

    // Advance time by 6 minutes
    vi.advanceTimersByTime(6 * 60 * 1000);
    
    // Third call should reload
    const s3 = SecretService.getSecrets();
    expect(s3).toEqual(['env_secret_2']);
  });
});
