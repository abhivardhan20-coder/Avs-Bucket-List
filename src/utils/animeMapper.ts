import { AniListAiringInfo } from '@/services/anilist';
import { MediaItem, MediaType } from '@/types';
import { searchTmdb } from '@/services/tmdb';
import { fetchMediaItem } from '@/lib/api/mediaFetcher';
import { db } from '@/lib/db';
import { cleanSeriesTitle } from './stringUtils';

/**
 * Maps an AniList airing entry to a full TMDB MediaItem.
 * Uses local cache first, then performs a title-based search on TMDB.
 */
export const HydrateAniListToTmdb = async (info: AniListAiringInfo): Promise<MediaItem | null> => {
    try {
        // 1. Check if we already have a mapping for this AniList ID in our mediaCache
        const cachedMatch = await db.mediaCache
            .where('anilistId')
            .equals(info.anilistId)
            .first();
        
        // Cache Validation: If the cached item title contains seasonal keywords, it might be a "Season-Only" entry.
        // We should ignore it once to try finding the root series.
        let tmdbItem: MediaItem | null = null;
        if (cachedMatch) {
            const lowTitle = cachedMatch.title.toLowerCase();
            if (!(lowTitle.includes('season') || lowTitle.includes('part') || lowTitle.includes('cour'))) {
                tmdbItem = cachedMatch;
            }
        }

        // 2. If not cached, search TMDB
        if (!tmdbItem) {
            // Aggressive Priority: Cleaned Base Title -> Base Title -> Cleaned English -> English -> Romaji
            const rawQueries = [
                info.baseTitle,
                info.englishTitle,
                info.romajiTitle
            ].filter(Boolean) as string[];

            const searchQueries: string[] = [];
            rawQueries.forEach(q => {
                const cleaned = cleanSeriesTitle(q);
                if (cleaned && cleaned !== q) searchQueries.push(cleaned);
                searchQueries.push(q);
            });

            // De-duplicate while preserving order
            const uniqueQueries = [...new Set(searchQueries)];
            
            for (const query of uniqueQueries) {
                const results = await searchTmdb(query, 'tv');
                if (results.length > 0) {
                    // Refined matching: 
                    // 1. Filter for Animation (genre 16) if possible
                    // 2. Sort by title length ascending (prefer short names like "Fire Force" over "Fire Force Season 3")
                    const tmdbMatch = results
                        .sort((a, b) => a.title.length - b.title.length)
                        .find(r => r.genres?.includes('Animation')) || results[0];
                    
                    if (tmdbMatch) {
                        tmdbItem = await fetchMediaItem(tmdbMatch.id, 'tv', true);
                        if (tmdbItem) {
                          (tmdbItem as MediaItem & { anilistId?: number }).anilistId = info.anilistId;
                          await db.mediaCache.put(tmdbItem);
                        }
                    }
                    
                    break;
                }
            }
        }

        if (!tmdbItem) return null;

        // 3. Construct the final MediaItem with AniList's precise date info
        const airDate = new Date(info.airingAt * 1000).toISOString();
        
        // Calculate days until
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const target = new Date(info.airingAt * 1000);
        target.setUTCHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate Seasonal Numbering
        let currentSeason = 1;
        let seasonalEpisode = info.episode;

        if (tmdbItem.seasons && tmdbItem.seasons.length > 0) {
            // Try to find a season in TMDB that matches the AniList airing title or season keywords
            // e.g. "Season 3" in AniList title matches TMDB's Season 3
            const alTitle = (info.englishTitle || info.romajiTitle || '').toLowerCase();
            const matchedSeason = tmdbItem.seasons.find(s => {
                const sNumStr = s.number.toString();
                return alTitle.includes(`season ${sNumStr}`) || alTitle.includes(`part ${sNumStr}`);
            });

            if (matchedSeason) {
                currentSeason = matchedSeason.number;
            } else if (info.episode > 30) {
                // Fallback: If episode number is high (likely cumulative), try to calculate season
                let totalProcessed = 0;
                const regularSeasons = [...tmdbItem.seasons]
                    .filter(s => s.number > 0)
                    .sort((a, b) => a.number - b.number);
                
                for (const s of regularSeasons) {
                    const count = s.episodeCount || 0;
                    if (info.episode > totalProcessed + count && count > 0) {
                        totalProcessed += count;
                    } else {
                        currentSeason = s.number;
                        seasonalEpisode = info.episode - totalProcessed;
                        break;
                    }
                }
            }
        }

        return {
            ...tmdbItem,
            type: MediaType.Anime,
            nextEpisode: {
                id: `al_${info.anilistId}_${info.episode}`,
                airDate: airDate,
                seasonNumber: currentSeason,
                episodeNumber: seasonalEpisode,
                name: `Episode ${info.episode}`,
                daysUntil: daysUntil
            }
        };

    } catch (error: unknown) {
        console.error("Mapping failed for", info.romajiTitle, error);
        return null;
    }
};

/**
 * Takes a TMDB MediaItem and attempts to find its precise next episode date on AniList.
 */
export const HydrateTmdbToAniList = async (tmdbItem: MediaItem): Promise<MediaItem> => {
    if (tmdbItem.type !== MediaType.Anime) return tmdbItem;

    try {
        // AniList English/Romaji search
        const query = `
        query ($search: String) {
          Media(search: $search, type: ANIME) {
            id
            nextAiringAt {
              airingAt
              episode
            }
          }
        }
        `;

        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { search: tmdbItem.title }
            })
        });

        const json = await response.json();
        const alMatch = json?.data?.Media;

        if (alMatch?.nextAiringAt) {
            const next = alMatch.nextAiringAt;
            const airDate = new Date(next.airingAt * 1000).toISOString();
            
            // Calculate days until
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const target = new Date(next.airingAt * 1000);
            target.setUTCHours(0, 0, 0, 0);
            const daysUntil = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            return {
                ...tmdbItem,
                nextEpisode: {
                    id: `al_${alMatch.id}_${next.episode}`,
                    airDate: airDate,
                    seasonNumber: 1,
                    episodeNumber: next.episode,
                    name: `Episode ${next.episode}`,
                    daysUntil: daysUntil
                }
            };
        }
    } catch (error) {
        console.warn("AniList hydration failed for", tmdbItem.title, error);
    }

    return tmdbItem;
};