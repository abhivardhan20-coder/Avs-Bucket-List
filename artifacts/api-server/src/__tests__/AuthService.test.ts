import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/AuthService';
import * as blacklist from '../lib/blacklist';
import jwt from 'jsonwebtoken';

vi.mock('../lib/blacklist', () => ({
  addToBlacklist: vi.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logout', () => {
    it('should successfully logout and blacklist a valid token', async () => {
      const mockToken = 'valid.jwt.token';
      const mockSub = 'user123';
      
      vi.spyOn(jwt, 'decode').mockReturnValue({ sub: mockSub, exp: (Date.now() / 1000) + 3600 } as any);
      
      const result = await AuthService.logout(`Bearer ${mockToken}`, mockSub);
      
      expect(result.success).toBe(true);
      expect(blacklist.addToBlacklist).toHaveBeenCalledWith(mockToken);
    });

    it('should throw an error if the sub does not match', async () => {
      const mockToken = 'valid.jwt.token';
      const mockSub = 'user123';
      
      vi.spyOn(jwt, 'decode').mockReturnValue({ sub: 'differentUser', exp: (Date.now() / 1000) + 3600 } as any);
      
      await expect(AuthService.logout(`Bearer ${mockToken}`, mockSub))
        .rejects
        .toThrow('Token sub does not match authenticated user');
        
      expect(blacklist.addToBlacklist).not.toHaveBeenCalled();
    });

    it('should throw an error if the token is already expired', async () => {
      const mockToken = 'expired.jwt.token';
      const mockSub = 'user123';
      
      vi.spyOn(jwt, 'decode').mockReturnValue({ sub: mockSub, exp: (Date.now() / 1000) - 3600 } as any);
      
      await expect(AuthService.logout(`Bearer ${mockToken}`, mockSub))
        .rejects
        .toThrow('Token has already expired');
        
      expect(blacklist.addToBlacklist).not.toHaveBeenCalled();
    });
  });
});
