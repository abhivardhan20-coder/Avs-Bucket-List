'use client';

import { useState } from 'react';
import { MediaItem, MediaType } from '../types';
import { fetchContentByGenre } from '../services/tmdb';

export function useGenreResults(itemType: MediaType) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreResults, setGenreResults] = useState<MediaItem[]>([]);
  const [loadingGenre, setLoadingGenre] = useState(false);
  const [genreError, setGenreError] = useState(false);
  const [genrePage, setGenrePage] = useState(1);
  const [hasMoreGenre, setHasMoreGenre] = useState(true);

  const handleGenreClick = async (genre: string) => {
    setSelectedGenre(genre);
    setLoadingGenre(true);
    setGenreError(false);
    setGenreResults([]);
    setGenrePage(1);
    setHasMoreGenre(true);
    try {
      const results = await fetchContentByGenre(genre, itemType, 1);
      setGenreResults(results);
      if (results.length < 20) setHasMoreGenre(false);
    } catch {
      setGenreError(true);
    } finally {
      setLoadingGenre(false);
    }
  };

  const handleGenreScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    if (loadingGenre || !hasMoreGenre || !selectedGenre) return;
    if (scrollLeft + clientWidth >= scrollWidth - 400) {
      setLoadingGenre(true);
      const nextPage = genrePage + 1;
      try {
        const results = await fetchContentByGenre(selectedGenre, itemType, nextPage);
        if (results.length === 0) setHasMoreGenre(false);
        else {
          setGenreResults(prev => [...prev, ...results]);
          setGenrePage(nextPage);
          if (results.length < 20) setHasMoreGenre(false);
        }
      } catch {
        setHasMoreGenre(false);
      } finally {
        setLoadingGenre(false);
      }
    }
  };

  return {
    selectedGenre, setSelectedGenre,
    genreResults, loadingGenre, genreError,
    handleGenreClick, handleGenreScroll
  };
}
