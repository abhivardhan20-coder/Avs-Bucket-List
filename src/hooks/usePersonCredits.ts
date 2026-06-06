import { useState } from 'react';
import { MediaItem } from '../types';
import { fetchPersonCredits } from '../services/tmdb';

export function usePersonCredits(INITIAL_VISIBLE_COUNT: number, LOAD_MORE_BATCH: number) {
  const [selectedPerson, setSelectedPerson] = useState<{ name: string; role: 'actor' | 'director' } | null>(null);
  const [allPersonCredits, setAllPersonCredits] = useState<MediaItem[]>([]);
  const [visiblePersonCredits, setVisiblePersonCredits] = useState<MediaItem[]>([]);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [creditsError, setCreditsError] = useState(false);

  const handlePersonClick = async (name: string, role: 'actor' | 'director') => {
    setSelectedPerson({ name, role });
    setLoadingCredits(true);
    setCreditsError(false);
    try {
      const credits = await fetchPersonCredits(name, role);
      setAllPersonCredits(credits || []);
      setVisiblePersonCredits((credits || []).slice(0, INITIAL_VISIBLE_COUNT));
    } catch {
      setCreditsError(true);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleCreditsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    if (loadingCredits || visiblePersonCredits.length >= allPersonCredits.length) return;
    if (scrollLeft + clientWidth >= scrollWidth - 400) {
      const nextBatch = allPersonCredits.slice(visiblePersonCredits.length, visiblePersonCredits.length + LOAD_MORE_BATCH);
      setVisiblePersonCredits(prev => [...prev, ...nextBatch]);
    }
  };

  return {
    selectedPerson, setSelectedPerson,
    allPersonCredits, visiblePersonCredits,
    loadingCredits, creditsError,
    handlePersonClick, handleCreditsScroll
  };
}
