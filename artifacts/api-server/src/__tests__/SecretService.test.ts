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
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset private fields for testing
    (SecretService as any).cachedSecrets = [];
    (SecretService as any).lastLoadTime = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should load initial secrets from env if no file exists', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    
    const secrets = SecretService.getSecrets();
    
    expect(secrets).toEqual(['initial_secret_1', 'initial_secret_2']);
  });

  it('should load secrets from .env file if it exists', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('PORT=3000\nSUPABASE_JWT_SECRET="file_secret_1, file_secret_2"\n');
    
    const secrets = SecretService.getSecrets();
    
    expect(secrets).toEqual(['file_secret_1', 'file_secret_2']);
  });

  it('should cache secrets and not reload immediately', () => {
    vi.useFakeTimers();
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('SUPABASE_JWT_SECRET="file_secret_1"\n');
    
    // First call
    SecretService.getSecrets();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    
    // Second call immediately
    SecretService.getSecrets();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Should be cached

    // Advance time by 6 minutes
    vi.advanceTimersByTime(6 * 60 * 1000);
    
    // Third call
    SecretService.getSecrets();
    expect(fs.readFileSync).toHaveBeenCalledTimes(2); // Should reload
  });
});
