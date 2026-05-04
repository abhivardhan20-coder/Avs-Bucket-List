import { MediaType } from '@/types';
import { db } from '@/lib/db';

const ANILIST_URL = 'https://graphql.anilist.co';
const SCHEDULE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const query = `
query ($start: Int, $end: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
      id
      airingAt
      episode
      media {
        id
        idMal
        title {
          romaji
          english
          native
        }
        relations {
          edges {
            relationType
            node {
              id
              title {
                romaji
                english
              }
              type
            }
          }
        }
        coverImage {
          extraLarge
          large
        }
        bannerImage
        status
        episodes
        averageScore
        genres
        description
        format
        startDate {
            year
        }
      }
    }
  }
}
`;

export interface AniListAiringInfo {
    anilistId: number;
    malId?: number;
    romajiTitle: string;
    englishTitle?: string;
    nativeTitle?: string;
    baseTitle?: string; // The title of the parent/prequel series
    episode: number;
    airingAt: number;
}

interface AniListSchedule {
    id: number;
    airingAt: number;
    episode: number;
    media: {
        id: number;
        idMal?: number;
        title: {
            romaji: string;
            english?: string;
            native?: string;
        };
        startDate: {
            year: number;
        };
        relations?: {
            edges: Array<{
                relationType: string;
                node: {
                    id: number;
                    title: {
                        romaji: string;
                        english?: string;
                    }
                }
            }>
        }
    };
}

/**
 * Fetch airing anime with Dexie cache layer.
 * Checks mediaCache for a synthetic key; only hits AniList if missing or stale (>1hr).
 */
export const fetchAiringAnime = async (startSeconds: number, endSeconds: number): Promise<AniListAiringInfo[]> => {
    // Check Dexie cache first
    const cacheKey = `anilist_schedule_${new Date(startSeconds * 1000).toISOString().slice(0, 10)}`;
    try {
        const cached = await db.mediaCache.get(cacheKey);
        if (cached && cached.lastRefreshedAt && Date.now() - cached.lastRefreshedAt < SCHEDULE_CACHE_TTL) {
            return JSON.parse((cached as any).payload || '[]');
        }
    } catch { /* cache miss, proceed to fetch */ }

    try {
        const response = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: {
                    start: startSeconds,
                    end: endSeconds,
                    page: 1
                }
            })
        });

        const json = await response.json();

        if (!json.data || !json.data.Page || !json.data.Page.airingSchedules) {
            return [];
        }

        const schedules: AniListSchedule[] = json.data.Page.airingSchedules;

        const results = schedules.map(item => {
            // Find the PREQUEL or PARENT relation if it exists
            const rootRelation = item.media.relations?.edges.find(e => 
                e.relationType === 'PREQUEL' || e.relationType === 'PARENT'
            );
            
            const baseTitle = rootRelation?.node.title.english || rootRelation?.node.title.romaji;

            return {
                anilistId: item.media.id,
                malId: item.media.idMal,
                romajiTitle: item.media.title.romaji,
                englishTitle: item.media.title.english,
                nativeTitle: item.media.title.native,
                baseTitle: baseTitle,
                episode: item.episode,
                airingAt: item.airingAt
            };
        });

        // Write to Dexie cache
        try {
            await db.mediaCache.put({
                id: cacheKey,
                title: 'AniList Schedule Cache',
                type: MediaType.Anime,
                payload: JSON.stringify(results),
                lastRefreshedAt: Date.now(),
            } as any);
        } catch { /* cache write failure is non-fatal */ }

        return results;

    } catch (error) {
        console.error("Error fetching AniList schedule:", error);
        return [];
    }
};