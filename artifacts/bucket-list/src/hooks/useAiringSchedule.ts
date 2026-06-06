import { useState, useEffect, useRef } from 'react';
import { MediaItem } from '@/types';
import { fetchAiringSeries } from '@/services/tmdb';
import { fetchAiringAnime } from '@/services/anilist';
import { HydrateAniListToTmdb } from '../utils/animeMapper';
import { ContentService } from '../services/contentService';
import { safeDate } from '../lib/dateUtils';

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
                    const { data, timestamp } = JSON.parse(cached, (key, value) => {
                        if (value && value.__type === 'Set') return new Set(value.value);
                        return value;
                    });
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

                // Hydrate TMDB series details first to get nextEpisode info
                const detailedTmdbSeries = await ContentService.getItemsByIds(tmdbSeries.map(s => s.id));

                 // STRICT Date Filtering (UTC)
                const validTmdb = detailedTmdbSeries.filter(item => {
                    if (!item.nextEpisode) return false;
                    const airDate = safeDate(item.nextEpisode.airDate);
                    if (!airDate) return false;
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
                    const sdA = safeDate(a.nextEpisode?.airDate);
                    const sdB = safeDate(b.nextEpisode?.airDate);
                    const dateA = sdA ? sdA.getTime() : 0;
                    const dateB = sdB ? sdB.getTime() : 0;
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

                // Cache Write
                try {
                  localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: initialFinalItems,
                    timestamp: Date.now()
                  }, (key, value) => {
                    if (value instanceof Set) return { __type: 'Set', value: Array.from(value) };
                    return value;
                  }));
                } catch (e) {
                  console.warn("Failed to write initial airing cache", e);
                }

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