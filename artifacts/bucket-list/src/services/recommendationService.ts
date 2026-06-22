import { db, RecommendationDBItem } from '../lib/db';
import { searchTmdb, fetchDetails } from './tmdb';
import { MediaType, WatchedItem } from '../types';
import { logger } from '@/lib/logger';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const FALLBACK_MODEL = 'openai/gpt-4o-mini';

const getApiKey = () => {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) throw new Error('[RecommendationService] VITE_OPENROUTER_API_KEY is not set');
  return key;
};

// Robust retry with backoff helper
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Retry on 429 (Rate Limit) or 5xx (Server Error), but NOT on 402 (Payment Required)
    if (!response.ok && (response.status === 429 || response.status >= 500) && retries > 0) {
      logger.warn(`[OpenRouter] API returned status ${response.status}. Retrying in ${backoff}ms...`);
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      logger.warn(`[OpenRouter] Network failure. Retrying in ${backoff}ms...`, { error });
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

/**
 * Searches and resolves a plain title recommended by the AI into a structured MediaItem with verified TMDB ID & assets.
 */
async function resolveRecommendation(
  title: string,
  mediaType: 'movie' | 'series',
  releaseYear?: number
): Promise<RecommendationDBItem | null> {
  try {
    const tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
    // Search TMDB
    const searchResults = await searchTmdb(title, tmdbType, 1);
    if (!searchResults || searchResults.length === 0) {
      logger.info(`[RecommendationResolver] No TMDB results found for title: "${title}" (${mediaType})`);
      return null;
    }

    // Find best match:
    // 1. Prioritize closest release year (if provided)
    // 2. Prioritize exact title match (case/punctuation insensitive)
    let bestMatch = searchResults[0];
    let bestScore = -1;

    for (const item of searchResults) {
      let score = 0;
      
      // Title match boost
      const normalizedItemTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedTargetTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedItemTitle === normalizedTargetTitle) {
        score += 50;
      } else if (normalizedItemTitle.includes(normalizedTargetTitle) || normalizedTargetTitle.includes(normalizedItemTitle)) {
        score += 20;
      }

      // Year proximity boost
      if (releaseYear && item.year) {
        const yearDiff = Math.abs(item.year - releaseYear);
        if (yearDiff === 0) {
          score += 40;
        } else if (yearDiff <= 1) {
          score += 20;
        } else if (yearDiff <= 3) {
          score += 10;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // Hydrate the matched item with full details (cast, directors, runtime, trailer, etc.)
    const fullDetails = await fetchDetails(bestMatch.id);
    if (!fullDetails) return null;

    return {
      id: bestMatch.id,
      title: fullDetails.title || bestMatch.title,
      mediaType: fullDetails.type || bestMatch.type,
      matchScore: 0, // Filled in by caller
      genres: fullDetails.genres || bestMatch.genres || [],
      releaseYear: fullDetails.year || bestMatch.year || 0,
      reason: '', // Filled in by caller
      similarity: '', // Filled in by caller
      posterUrl: fullDetails.posterUrl || bestMatch.posterUrl || '',
      rating: fullDetails.rating || bestMatch.rating || 0,
      language: (fullDetails as any).language || 'en',
      overview: fullDetails.overview || bestMatch.overview || '',
      backdropUrl: fullDetails.backdropUrl || bestMatch.backdropUrl || '',
      createdAt: Date.now()
    };
  } catch (error) {
    logger.error(`[RecommendationResolver] Failed resolving title: "${title}"`, { error });
    return null;
  }
}

export const recommendationService = {
  /**
   * Triggers the OpenRouter recommendation flow.
   */
  async generateRecommendations(
    watched: WatchedItem[],
    watchlist: any[],
    feedbackHistory: RecommendationDBItem[]
  ): Promise<RecommendationDBItem[]> {
    // 1. Prepare history input summaries to optimize prompt token counts
    const watchedSummary = watched.map(w => ({
      title: w.title,
      type: w.type,
      genres: w.genres,
      rating: w.rating || null,
      year: w.year,
      director: w.director || null
    })).slice(-15); // Limit to last 15 items to reduce token usage

    const watchlistSummary = watchlist.map(w => ({
      title: w.title,
      type: w.type,
      genres: w.genres,
      year: w.year
    })).slice(-10); // Limit to last 10 watchlist items

    // Filter feedback history categories
    const likedTitles = feedbackHistory.filter(f => f.feedback === 'liked').map(f => f.title);
    const dislikedTitles = feedbackHistory.filter(f => f.feedback === 'disliked').map(f => f.title);
    const clickedTitles = feedbackHistory.filter(f => f.feedback === 'clicked').map(f => f.title);
    const addedTitles = feedbackHistory.filter(f => f.feedback === 'added_to_watchlist').map(f => f.title);

    // 2. Construct the prompt
    const prompt = `You are an expert recommendation engine.

User Watch History (recently watched and rated items):
${JSON.stringify(watchedSummary, null, 2)}

User Watchlist (wanted content):
${JSON.stringify(watchlistSummary, null, 2)}

User Feedback on Past Recommendations:
- Liked/Upvoted recommendations: ${JSON.stringify(likedTitles)}
- Disliked/Downvoted recommendations (DO NOT recommend these or similar): ${JSON.stringify(dislikedTitles)}
- Added to Watchlist: ${JSON.stringify(addedTitles)}
- Clicked/Interested: ${JSON.stringify(clickedTitles)}

Analyze the user's preferences and recommend 15 highly relevant titles.

For each recommendation provide:
* title
* media_type (must be 'movie' or 'series')
* match_score (0-100)
* short_reason
* genres
* release_year
* similarity_explanation

Avoid recommending items already watched by the user or already on their watchlist.

Prioritize:
* Similar themes
* Similar storytelling style
* Similar character dynamics
* Similar pacing
* Similar audience preferences

Return valid JSON only. Keep the structure matching the api specification exactly:
{
  "recommendations": [
    {
      "title": "Example Title",
      "media_type": "movie",
      "match_score": 96,
      "genres": ["Drama", "Romance"],
      "release_year": 2024,
      "reason": "Strong character-driven romance similar to the user's viewing habits.",
      "similarity": "Shares emotional storytelling and relationship-focused narrative."
    }
  ]
}`;

    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("OpenRouter API key is missing. Please check your environment variables.");
    }

    const makeApiCall = async (model: string) => {
      const response = await fetchWithRetry(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173/',
          'X-Title': "AV's Bucket List"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 4096
        })
      }, 3, 1000);

      if (!response.ok) {
        throw new Error(`OpenRouter returned status ${response.status}: ${await response.text()}`);
      }

      const responseData = await response.json();
      const content = responseData?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response content from OpenRouter");
      }

      return JSON.parse(content) as {
        recommendations: {
          title: string;
          media_type: 'movie' | 'series';
          match_score: number;
          genres: string[];
          release_year: number;
          reason: string;
          similarity: string;
        }[];
      };
    };

    // Try primary, fallback to secondary model on failure
    let jsonResult;
    try {
      jsonResult = await makeApiCall(DEFAULT_MODEL);
    } catch (primaryError) {
      logger.warn(`[OpenRouter] Primary model ${DEFAULT_MODEL} failed, trying fallback ${FALLBACK_MODEL}...`, { error: primaryError });
      jsonResult = await makeApiCall(FALLBACK_MODEL);
    }

    const aiRecommendations = jsonResult?.recommendations || [];
    if (aiRecommendations.length === 0) {
      logger.warn("[OpenRouter] No recommendations returned from AI parsing.");
      return [];
    }

    // 3. Resolve plain text titles to TMDB items in parallel (limited concurrency)
    const resolvedRecommendations: RecommendationDBItem[] = [];
    const limit = 4; // Resolve 4 items concurrently

    for (let i = 0; i < aiRecommendations.length; i += limit) {
      const batch = aiRecommendations.slice(i, i + limit);
      const resolvedBatch = await Promise.all(
        batch.map(async (aiItem) => {
          const resolved = await resolveRecommendation(
            aiItem.title,
            aiItem.media_type,
            aiItem.release_year
          );
          if (resolved) {
            resolved.matchScore = Number(aiItem.match_score) || 90;
            resolved.reason = aiItem.reason;
            resolved.similarity = aiItem.similarity;
            // Preset AI recommended genres if search is empty
            if (resolved.genres.length === 0) {
              resolved.genres = aiItem.genres;
            }
            return resolved;
          }
          return null;
        })
      );

      resolvedBatch.forEach(item => {
        if (item) resolvedRecommendations.push(item);
      });
    }

    // 4. Save batch to Dexie (preserving previous and caching newly generated)
    if (resolvedRecommendations.length > 0) {
      await db.transaction('rw', db.recommendations, async () => {
        for (const item of resolvedRecommendations) {
          // Check if it already exists to avoid overwriting feedback
          const existing = await db.recommendations.get(item.id);
          if (existing) {
            // Keep feedback but update other metadata and timestamp
            await db.recommendations.put({
              ...item,
              feedback: existing.feedback,
              createdAt: Date.now()
            });
          } else {
            await db.recommendations.put(item);
          }
        }
      });
    }

    return resolvedRecommendations;
  },

  /**
   * Retrieves all cached recommendations from Dexie.
   */
  async getCachedRecommendations(): Promise<RecommendationDBItem[]> {
    try {
      return await db.recommendations.toArray();
    } catch (e) {
      logger.error("[recommendationService] Failed getting cached items", { error: e });
      return [];
    }
  },

  /**
   * Updates engagement/feedback on a recommendation.
   */
  async updateRecommendationFeedback(
    id: string,
    feedback: 'liked' | 'disliked' | 'clicked' | 'added_to_watchlist' | 'watched'
  ): Promise<void> {
    try {
      const existing = await db.recommendations.get(id);
      if (existing) {
        await db.recommendations.update(id, { feedback });
        logger.info(`[recommendationService] Updated feedback for ${id} to: ${feedback}`);
      }
    } catch (e) {
      logger.error("[recommendationService] Failed updating feedback", { error: e });
    }
  }
};
