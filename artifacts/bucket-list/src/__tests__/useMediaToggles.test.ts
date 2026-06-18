import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMediaToggles } from '../hooks/useMediaToggles';
import { useLibraryData, useLibraryActions } from '../contexts/AppContext';

// Mock contexts
vi.mock('../contexts/AppContext', () => ({
  useLibraryData: vi.fn(),
  useLibraryActions: vi.fn()
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

describe('useMediaToggles', () => {
  const mockIsInWatchlist = vi.fn();
  const mockIsWatched = vi.fn();
  const mockRemoveFromWatchlist = vi.fn();
  const mockAddToWatchlist = vi.fn();
  const mockUnmarkMovie = vi.fn();
  const mockUnmarkSeries = vi.fn();
  const mockMarkMovieAsWatched = vi.fn();
  const mockMarkSeriesAsWatched = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useLibraryData as any).mockReturnValue({
      isInWatchlist: mockIsInWatchlist,
      isWatched: mockIsWatched
    });
    (useLibraryActions as any).mockReturnValue({
      removeFromWatchlist: mockRemoveFromWatchlist,
      addToWatchlist: mockAddToWatchlist,
      unmarkMovie: mockUnmarkMovie,
      unmarkSeries: mockUnmarkSeries,
      markMovieAsWatched: mockMarkMovieAsWatched,
      markSeriesAsWatched: mockMarkSeriesAsWatched
    });
  });

  it('should remove from watchlist if item is already in watchlist', async () => {
    mockIsInWatchlist.mockReturnValue(true);
    const { result } = renderHook(() => useMediaToggles());

    const fakeEvent = { stopPropagation: vi.fn() } as any;
    await act(async () => {
      await result.current.handleToggleWatchlist(fakeEvent, '123');
    });

    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(mockIsInWatchlist).toHaveBeenCalledWith('123');
    expect(mockRemoveFromWatchlist).toHaveBeenCalledWith('123');
    expect(mockAddToWatchlist).not.toHaveBeenCalled();
  });
});
