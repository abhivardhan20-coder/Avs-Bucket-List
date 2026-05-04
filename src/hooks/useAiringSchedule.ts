import { useState, useEffect, useRef } from 'react';
import { MediaItem, MediaType } from '@/types';
import { fetchAiringSeries } from '@/services/tmdb';
import { fetchMediaItem } from '@/lib/api/mediaFetcher';
import { fetchAiringAnime } from '@/services/anilist';
import { HydrateAniListToTmdb } from '../utils/animeMapper';

export const useAiringSchedule = () => {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchedOnce = useRef(false);

    useEffect(() => {
        if (fetchedOnce.current) return;
        fetchedOnce.current = true;

        const CACHE_KEY = 'av_airing_schedule_v2';
        const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

        const fetchData = async () => {
            // Check Cache
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        // De-duplicate cached data just in case
                        const uniqueMap = new Map<string, MediaItem>();
                        (data as MediaItem[]).forEach(item => {
                            if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
                        });
                        setItems(Array.from(uniqueMap.values()));
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.warn("Failed to read airing cache", e);
            }

            try {
                setLoading(true);

                // UTC based calculation for consistency
                const now = new Date();
                const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
                const nextWeekUTC = new Date(todayUTC);
                nextWeekUTC.setDate(todayUTC.getDate() + 7);

                // AniList expects Unix timestamp in seconds
                const startSeconds = Math.floor(todayUTC.getTime() / 1000);
                const endSeconds = Math.floor(nextWeekUTC.getTime() / 1000);

                const [tmdbSeries, anilistAnime] = await Promise.all([
                    fetchAiringSeries(1) as Promise<MediaItem[]>,
                    fetchAiringAnime(startSeconds, endSeconds)
                ]);

                if (import.meta.env.DEV) {
                    console.debug("[AiringSchedule] Fetch complete:", {
                        tmdbCount: tmdbSeries.length,
                        anilistCount: anilistAnime.length,
                        startSeconds,
                        endSeconds
                    });
                }

                 // STRICT Date Filtering (UTC)
                const validTmdb = tmdbSeries.filter(item => {
                    if (!item.nextEpisode) return false;
                    const airDate = new Date(item.nextEpisode.airDate);
                    return airDate >= todayUTC && airDate <= nextWeekUTC;
                });

                // DEEP HYDRATION (Anime): Already handled by HydrateAniListToTmdb mapper
                const animatedItems = await Promise.all(
                    anilistAnime.map(info => HydrateAniListToTmdb(info))
                ).then(results => results.filter((i): i is MediaItem => i !== null));

                const allInitialItems = [...validTmdb, ...animatedItems];

                // Sort by air date (soonest first)
                const sortByAirDate = (list: MediaItem[]) => {
                  return [...list].sort((a, b) => {
                    const dateA = a.nextEpisode?.airDate ? new Date(a.nextEpisode.airDate).getTime() : 0;
                    const dateB = b.nextEpisode?.airDate ? new Date(b.nextEpisode.airDate).getTime() : 0;
                    return dateA - dateB;
                  });
                };

                // DE-DUPLICATE: Ensure each unique TMDB series ID only appear once
                const getUniqueItems = (list: MediaItem[]) => {
                  const uniqueItemsMap = new Map<string, MediaItem>();
                  list.forEach(item => {
                    if (!uniqueItemsMap.has(item.id)) uniqueItemsMap.set(item.id, item);
                  });
                  return Array.from(uniqueItemsMap.values());
                };

                const initialFinalItems = getUniqueItems(sortByAirDate(allInitialItems));
                setItems(initialFinalItems);
                setLoading(false);

                // Initial Cache Write
                try {
                  localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: initialFinalItems,
                    timestamp: Date.now()
                  }));
                } catch (e) {
                  console.warn("Failed to write initial airing cache", e);
                }

                // BACKGROUND HYDRATION: Batch all detail fetches, then apply a single setState + cache write
                const hydratedUpdates = new Map<string, MediaItem>();
                await Promise.allSettled(
                  validTmdb.map(async (item) => {
                    try {
                      const details = await fetchMediaItem(item.id, item.type === 'movie' ? 'movie' : 'tv');
                      if (details) hydratedUpdates.set(item.id, details);
                    } catch { /* silently skip failed hydrations */ }
                  })
                );

                if (hydratedUpdates.size > 0) {
                  setItems(prev => {
                    const updated = prev.map(p =>
                      hydratedUpdates.has(p.id) ? { ...p, ...hydratedUpdates.get(p.id) } : p
                    );
                    const final = getUniqueItems(sortByAirDate(updated));
                    // Single cache write after all hydrations complete
                    try {
                      localStorage.setItem(CACHE_KEY, JSON.stringify({
                        data: final,
                        timestamp: Date.now()
                      }));
                    } catch { /* non-fatal cache write failure */ }
                    return final;
                  });
                }

                // Cache is updated above during initial set and background updates.
                return; 


            } catch (err) {
                console.error("Failed to fetch airing schedule", err);
                setError("Could not load airing schedule.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { items, loading, error };
};