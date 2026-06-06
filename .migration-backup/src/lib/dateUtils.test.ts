import { describe, it, expect, vi } from 'vitest';
import { parseLocalDate, resolveUpcomingContent } from './dateUtils';
import { MediaItem, MediaType } from '@/types';

describe('DateUtils', () => {
  describe('parseLocalDate', () => {
    it('should return correct local midnight Date for YYYY-MM-DD', () => {
      const result = parseLocalDate('2025-01-15');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0); // Jan
      expect(result?.getDate()).toBe(15);
      expect(result?.getHours()).toBe(0);
    });

    it('should return null for invalid format like YYYY', () => {
      expect(parseLocalDate('2025')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(parseLocalDate(null)).toBeNull();
    });
    
    it('should return null for invalid date values', () => {
      expect(parseLocalDate('2025-13-45')).toBeNull();
    });
  });

  describe('resolveUpcomingContent', () => {
    const baseItem: MediaItem = {
      id: 'movie_1',
      title: 'Upcoming Movie',
      type: MediaType.Movie,
      backdropUrl: '',
      posterUrl: '',
      overview: '',
      rating: 0,
      year: 2025,
      genres: []
    };

    it('should return null for past dates', () => {
      // Set "today" to 2025-01-01
      const mockToday = new Date(2025, 0, 15);
      vi.useFakeTimers();
      vi.setSystemTime(mockToday);
      
      const pastItem = { ...baseItem, releaseDate: '2025-01-10' };
      expect(resolveUpcomingContent(pastItem)).toBeNull();
      
      vi.useRealTimers();
    });

    it('should return correct daysRemaining for future dates', () => {
      // Set "today" to 2025-01-15
      const mockToday = new Date(2025, 0, 15);
      vi.useFakeTimers();
      vi.setSystemTime(mockToday);
      
      // Target: 2025-01-18 (3 days out)
      const futureItem = { ...baseItem, releaseDate: '2025-01-18' };
      
      const result = resolveUpcomingContent(futureItem);
      expect(result?.daysRemaining).toBe(3);
      
      vi.useRealTimers();
    });
  });
});
