import React from 'react';
import { render, screen } from '@testing-library/react';
import { UpcomingCard } from '../components/upcoming/UpcomingCard';
import { describe, it, expect, vi } from 'vitest';
import { MediaItem, MediaType } from '../types';

describe('UpcomingCard', () => {
  const mockItem: MediaItem = {
    id: '1',
    title: 'Upcoming Movie',
    type: MediaType.Movie,
    posterUrl: '/poster.jpg',
    backdropUrl: '/backdrop.jpg',
    overview: 'A great movie coming soon.',
    releaseDate: '2024-12-25',
    rating: 0,
    year: 2024,
    genres: ['Action']
  };

  it('renders the title and release date', () => {
    render(
      <UpcomingCard
        item={mockItem}
        onClick={vi.fn()}
        onToggleWatchlist={vi.fn()}
        isInWatchlist={false}
      />
    );

    expect(screen.getByText('Upcoming Movie')).toBeDefined();
    // Use partial match since date might be formatted
    expect(screen.getByText(/2024/)).toBeDefined();
  });
});
