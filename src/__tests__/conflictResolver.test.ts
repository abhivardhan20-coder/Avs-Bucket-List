import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveConflict, resolveMerge } from '../lib/conflictResolver';
import { SyncEntry } from '../services/syncService';

describe('resolveConflict', () => {
  const base: SyncEntry = { 
    id: 'movie123', 
    userId: 'user@example.com',
    status: 'watched',
    version: 2, 
    updatedAt: '2026-01-01T00:00:00Z', 
  };

  beforeEach(() => {
    // Mock localStorage for conflict auditing
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, val: string) => { storage[key] = val; },
    });
  });

  describe('LWW (Last-Write-Wins) Strategy', () => {
    it('should pick cloud when cloud version is newer', () => {
      const local = { ...base, version: 1, updatedAt: '2025-12-01T00:00:00Z' };
      const cloud = { ...base, version: 2, updatedAt: '2026-01-01T00:00:00Z' };
      const result = resolveConflict(local as any, cloud as any, 'lww');
      expect(result.version).toBe(2);
      expect(result.updatedAt).toBe(cloud.updatedAt);
    });

    it('should pick local when local version is newer', () => {
      const local = { ...base, version: 3, updatedAt: '2026-01-02T00:00:00Z' };
      const cloud = { ...base, version: 2, updatedAt: '2026-01-01T00:00:00Z' };
      const result = resolveConflict(local as any, cloud as any, 'lww');
      expect(result.version).toBe(3);
    });

    it('should use updatedAt as tie-breaker for same versions', () => {
      const local = { ...base, version: 2, updatedAt: '2026-01-01T10:00:00Z' };
      const cloud = { ...base, version: 2, updatedAt: '2026-01-01T11:00:00Z' };
      const result = resolveConflict(local as any, cloud as any, 'lww');
      expect(result.updatedAt).toBe('2026-01-01T11:00:00Z');
    });

    it('should pick local when timestamps are equal but local version is higher', () => {
      const local = { ...base, version: 5, updatedAt: '2026-01-01T00:00:00Z' };
      const cloud = { ...base, version: 3, updatedAt: '2026-01-01T00:00:00Z' };
      const result = resolveConflict(local as any, cloud as any, 'lww');
      expect(result.version).toBe(5);
      expect(result.id).toBe('movie123');
    });
  });

  describe('Merge Strategy', () => {
    it('should take remote when remote version is higher (fast path)', () => {
      const local = { ...base, version: 1, updatedAt: '2025-12-01T00:00:00Z' };
      const remote = { ...base, version: 2, updatedAt: '2026-01-01T00:00:00Z' };
      const result = resolveConflict(local as any, remote as any, 'merge');
      // Fast path: remoteVer > localVer → version = remoteVer + 1
      expect(result.version).toBe(3);
    });

    it('should take local when local version is higher (fast path)', () => {
      const local = { ...base, version: 5, updatedAt: '2026-01-02T00:00:00Z' };
      const remote = { ...base, version: 2, updatedAt: '2026-01-01T00:00:00Z' };
      const result = resolveConflict(local as any, remote as any, 'merge');
      // Fast path: localVer > remoteVer → version = localVer + 1
      expect(result.version).toBe(6);
      expect(result.id).toBe(local.id);
    });

    it('should union watchedEpisodeIds from both sides and increment version', () => {
      const local = { 
        ...base, 
        version: 1,
        payload: JSON.stringify({ watchedEpisodeIds: ['e1', 'e2'] }) 
      };
      const cloud = { 
        ...base, 
        version: 1, 
        payload: JSON.stringify({ watchedEpisodeIds: ['e2', 'e3'] }) 
      };
      
      const result = resolveConflict(local as any, cloud as any, 'merge');
      const payload = JSON.parse(result.payload || '{}');
      expect(payload.watchedEpisodeIds).toContain('e1');
      expect(payload.watchedEpisodeIds).toContain('e2');
      expect(payload.watchedEpisodeIds).toContain('e3');
      expect(payload.watchedEpisodeIds.length).toBe(3);
      expect(result.version).toBe(2); // 1 + 1
    });

    it('should union watchlistEpisodeIds from both sides', () => {
      const local = {
        ...base, version: 2,
        payload: JSON.stringify({ watchlistEpisodeIds: ['ep_s1e1', 'ep_s1e2'] })
      };
      const remote = {
        ...base, version: 2,
        payload: JSON.stringify({ watchlistEpisodeIds: ['ep_s1e2', 'ep_s2e1'] })
      };
      const result = resolveConflict(local as any, remote as any, 'merge');
      const payload = JSON.parse(result.payload || '{}');
      expect(payload.watchlistEpisodeIds).toEqual(expect.arrayContaining(['ep_s1e1', 'ep_s1e2', 'ep_s2e1']));
      expect(new Set(payload.watchlistEpisodeIds).size).toBe(3);
    });

    it('should union watchlistSeasonIds from both sides', () => {
      const local = {
        ...base, version: 2,
        payload: JSON.stringify({ watchlistSeasonIds: ['s1', 's2'] })
      };
      const remote = {
        ...base, version: 2,
        payload: JSON.stringify({ watchlistSeasonIds: ['s2', 's3'] })
      };
      const result = resolveConflict(local as any, remote as any, 'merge');
      const payload = JSON.parse(result.payload || '{}');
      expect(payload.watchlistSeasonIds).toEqual(expect.arrayContaining(['s1', 's2', 's3']));
      expect(new Set(payload.watchlistSeasonIds).size).toBe(3);
    });

    it('should take the max of watchedEpisodes from both sides', () => {
      const local = { ...base, version: 2, payload: JSON.stringify({ watchedEpisodes: 3 }) };
      const remote = { ...base, version: 2, payload: JSON.stringify({ watchedEpisodes: 7 }) };
      const result = resolveConflict(local as any, remote as any, 'merge');
      expect(JSON.parse(result.payload || '{}').watchedEpisodes).toBe(7);
    });

    it('should take the max progress from both sides', () => {
      const local = { ...base, version: 2, payload: JSON.stringify({ progress: 40 }) };
      const cloud = { ...base, version: 2, payload: JSON.stringify({ progress: 75 }) };
      
      const result = resolveConflict(local as any, cloud as any, 'merge');
      const payload = JSON.parse(result.payload || '{}');
      expect(payload.progress).toBe(75);
      expect(result.version).toBe(3); // 2 + 1
    });

    it('should handle one side having no payload gracefully', () => {
      const local = { ...base, version: 2, payload: undefined };
      const remote = { ...base, version: 2, payload: JSON.stringify({ title: 'Test' }) };
      const result = resolveConflict(local as any, remote as any, 'merge');
      // When payloads don't both exist, base payload is used as-is
      expect(result.version).toBe(3);
    });

    it('should handle identical payloads without duplication', () => {
      const payload = JSON.stringify({ watchedEpisodeIds: ['e1', 'e2'], watchedEpisodes: 5 });
      const local = { ...base, version: 2, payload };
      const remote = { ...base, version: 2, payload };
      const result = resolveConflict(local as any, remote as any, 'merge');
      // Same payload string → no merge needed, base payload used
      expect(result.version).toBe(3);
    });

    it('should handle malformed JSON payload without throwing', () => {
      const local = { ...base, version: 2, payload: '{not valid json' };
      const remote = { ...base, version: 2, payload: JSON.stringify({ title: 'Test' }) };
      // Should not throw — falls back to base payload
      expect(() => resolveConflict(local as any, remote as any, 'merge')).not.toThrow();
    });

    it('should use remote as base when remote updatedAt is newer (same version)', () => {
      const local = {
        ...base, version: 3,
        updatedAt: '2026-01-01T00:00:00Z',
        payload: JSON.stringify({ title: 'Local Title', watchedEpisodes: 2 })
      };
      const remote = {
        ...base, version: 3,
        updatedAt: '2026-01-02T00:00:00Z',
        payload: JSON.stringify({ title: 'Remote Title', watchedEpisodes: 5 })
      };
      const result = resolveConflict(local as any, remote as any, 'merge');
      const payload = JSON.parse(result.payload || '{}');
      // watchedEpisodes should be max(2, 5) = 5
      expect(payload.watchedEpisodes).toBe(5);
      expect(result.version).toBe(4);
    });
  });

  // ── Seed Tests (Direct resolveMerge) ──
  describe('resolveMerge', () => {
    it('returns remote when remote version is strictly higher', () => {
      const local  = { ...base, version: 1 };
      const remote = { ...base, version: 4 };
      const result = resolveMerge(local as any, remote as any);
      expect(result.version).toBeGreaterThan(4);
    });

    it('unions watchedEpisodeIds from both sides — no duplicates', () => {
      const local  = { ...base, payload: JSON.stringify({ watchedEpisodeIds: ['ep1', 'ep2'] }) };
      const remote = { ...base, payload: JSON.stringify({ watchedEpisodeIds: ['ep2', 'ep3'] }) };
      const result = resolveMerge(local as any, remote as any);
      const ids = JSON.parse(result.payload || '{}').watchedEpisodeIds.sort();
      expect(ids).toEqual(['ep1', 'ep2', 'ep3']);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('picks max watchedEpisodes from both sides', () => {
      const local  = { ...base, payload: JSON.stringify({ watchedEpisodes: 4 }) };
      const remote = { ...base, payload: JSON.stringify({ watchedEpisodes: 11 }) };
      const result = resolveMerge(local as any, remote as any);
      expect(JSON.parse(result.payload || '{}').watchedEpisodes).toBe(11);
    });

    it('always outputs version strictly above both inputs on tie', () => {
      const result = resolveMerge(
        { ...base, version: 5 } as any,
        { ...base, version: 5 } as any
      );
      expect(result.version).toBeGreaterThan(5);
    });
  });
});
