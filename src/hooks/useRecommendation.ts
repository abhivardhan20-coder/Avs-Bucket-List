'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AppContext';
import { buildUserTaste, scoreItem, UserTaste } from '../lib/recommendationEngine';
import { MediaItem } from '../types';

export function useRecommendation(watched: any[], watchlist: any[]) {
  const { user } = useAuth();
  const [taste, setTaste] = useState<UserTaste | null>(null);
  const [loading, setLoading] = useState(false);

  const watchedHash = useMemo(() => {
    if (!watched || watched.length === 0) return '';
    return watched.map(w => `${w.id}-${w.updated_at || ''}-${w.rating || 0}`).join('|');
  }, [watched]);

  useEffect(() => {
    if (!user?.email || !watchedHash) return;

    let isMounted = true;
    const updateTaste = async () => {
      setLoading(true);
      try {
        const newTaste = await buildUserTaste(watched);
        if (isMounted) setTaste(newTaste);
      } catch (err) {
        console.error("Failed to build user taste", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    updateTaste();
    return () => { isMounted = false; };
  }, [user?.email, watchedHash]); // Depend on watchedHash, not watched reference

  const getRecommendations = useMemo(() => {
    return (pool: MediaItem[]) => {
      if (!taste) return pool;
      
      const excludedIds = new Set([
        ...watched.map((w: any) => w.id),
        ...watchlist.map((w: any) => w.id)
      ]);

      return [...pool]
        .map(item => ({ item, score: scoreItem(item, taste, excludedIds) }))
        .filter(entry => entry.score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.item);
    };
  }, [taste, watched, watchlist]);

  return { taste, getRecommendations, loading };
}
