import {
  searchTmdb,
  fetchTrendingMovies,
  fetchTrendingSeries,
  searchAnime as searchTmdbAnime,
  fetchTrendingAnime,
  fetchContentByGenre,
  GENRES
} from '../services/tmdb';
import { MediaItem, MediaType } from '../types';

export interface SearchResults {
  movies: MediaItem[];
  series: MediaItem[];
  anime: MediaItem[];
}

// Cache for unified search
// ✅ OPTIMIZATION: In-memory cache with TTL to avoid repeated API calls
interface CacheEntry {
  data: SearchResults;
  timestamp: number;
}
const searchCache: Record<string, CacheEntry> = {};

// ✅ OPTIMIZATION: Memoized similarity scores to avoid recalculating for same queries
const similarityMemo: Record<string, number> = {};

// Keep memo size bounded to prevent memory bloat — use key-count-based logic to avoid counter drift
const MAX_MEMO_SIZE = 500;

const getCachedSimilarity = (title: string, query: string): number => {
  const key = `${title}||${query}`;
  if (key in similarityMemo) {
    return similarityMemo[key];
  }

  // Prune by actual key count, not a drifting counter — prevents cache bloat
  const keys = Object.keys(similarityMemo);
  if (keys.length >= MAX_MEMO_SIZE) {
    // Remove oldest 20% of entries to make room
    keys.slice(0, Math.floor(MAX_MEMO_SIZE * 0.2)).forEach(k => delete similarityMemo[k]);
  }

  const score = calculateSimilarityScore(title, query);
  similarityMemo[key] = score;
  return score;
};

// --- UTILS: Fuzzy & Ranking ---

const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

const levenshtein = (a: string, b: string): number => {
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array(bn + 1).fill(null).map(() => Array(an + 1).fill(null));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[bn][an];
};

export const getSimilarityScore = (title: string, query: string): number => {
  return getCachedSimilarity(title, query);
};

const calculateSimilarityScore = (title: string, query: string): number => {
  const t = normalize(title);
  const q = normalize(query);

  if (t === q) return 100; // Exact match
  if (t.startsWith(q)) return 80; // Prefix match
  if (t.includes(q)) return 60; // Substring match

  // ✅ OPTIMIZATION: Use Levenshtein for fuzzy matching with caching
  const dist = levenshtein(t, q);
  const maxLen = Math.max(t.length, q.length);
  const similarity = 1 - (dist / maxLen);

  return similarity * 50;
};

export const rankItems = (items: MediaItem[], query: string): MediaItem[] => {
  return items.map(item => ({
    item,
    similarity: getSimilarityScore(item.title, query)
  }))
    .sort((a, b) => {
      // Primary: Similarity (Exact match/relevance first)
      if (Math.abs(b.similarity - a.similarity) > 5) {
        return b.similarity - a.similarity;
      }

      // Secondary: Year Descending (Latest first for similar relevance)
      const yearA = a.item.year || 0;
      const yearB = b.item.year || 0;
      return yearB - yearA;
    })
    .map(wrapper => wrapper.item);
};

// --- GENRE DETECTION ---

const detectGenre = (query: string): { id: number, name: string } | null => {
  const normQuery = normalize(query);
  if (normQuery.length < 3) return null;

  const entries = Object.entries(GENRES);

  // 1. Check strict match
  for (const [id, name] of entries) {
    if (normalize(name) === normQuery) return { id: Number(id), name };
  }

  // 2. Check "X movies" / "X anime" / "X show"
  const indicators = ['movies', 'movie', 'series', 'show', 'shows', 'anime', 'tv'];
  for (const [id, name] of entries) {
    const nName = normalize(name);
    for (const indicator of indicators) {
       if (normQuery === `${nName} ${indicator}` || normQuery === `${indicator} ${nName}`) {
         return { id: Number(id), name };
       }
    }
  }

  return null;
};

// --- SMART SEARCH FUNCTIONS ---

export const searchMovies = async (query: string, page: number = 1): Promise<MediaItem[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  // 1. Genre Check
  const genreMatch = detectGenre(trimmedQuery);
  if (genreMatch) {
    try {
      return await fetchContentByGenre(genreMatch.name, MediaType.Movie, page);
    } catch (e) { console.error(e); }
  }

  // 2. Normal Search & Rank
  const results = await searchTmdb(trimmedQuery, 'movie', page);
  return rankItems(results, trimmedQuery);
};

export const searchSeries = async (query: string, page: number = 1): Promise<MediaItem[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const genreMatch = detectGenre(trimmedQuery);
  if (genreMatch) {
    try {
      return await fetchContentByGenre(genreMatch.name, MediaType.Series, page);
    } catch (e) { console.error(e); }
  }

  const results = await searchTmdb(trimmedQuery, 'tv', page);
  return rankItems(results, trimmedQuery);
};

export const searchAnime = async (query: string, page: number = 1): Promise<MediaItem[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  // Anime generally doesn't use the standard Genre ID map the same way for "Anime" genre search
  // But if someone searches "Action Anime", we can try.
  // implementing a basic anime search
  const results = await searchTmdbAnime(trimmedQuery, page);
  return rankItems(results, trimmedQuery);
};


// --- MAIN UNIFIED SEARCH ---

export const unifiedSearch = async (query: string): Promise<SearchResults> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return { movies: [], series: [], anime: [] };

  // ✅ OPTIMIZATION #1: Check cache first (12-minute TTL)
  const now = Date.now();
  if (searchCache[trimmedQuery] && (now - searchCache[trimmedQuery].timestamp < 12 * 60 * 1000)) {
    return searchCache[trimmedQuery].data;
  }

  try {
    // ✅ OPTIMIZATION #2: Parallel search across all categories
    const [movies, series, anime] = await Promise.all([
      searchMovies(trimmedQuery, 1),
      searchSeries(trimmedQuery, 1),
      searchAnime(trimmedQuery, 1)
    ]);

    // 3. Fallback: If results are very poor/empty, try fuzzy matching against Trending
    let finalMovies = movies;
    let finalSeries = series;

    // ✅ OPTIMIZATION #3: Only fallback if no strong matches found
    const hasGoodMatch = [...movies, ...series, ...anime].some(i => getSimilarityScore(i.title, trimmedQuery) > 50);

    // Only fallback to trending if query is substantial to prevent API spam
    if (!hasGoodMatch && trimmedQuery.length >= 5 && movies.length < 5 && series.length < 5) {
      const [tMovies, tSeries] = await Promise.all([
        fetchTrendingMovies(1),
        fetchTrendingSeries(1)
      ]);

      const fuzzyMovies = tMovies.filter(m => getSimilarityScore(m.title, trimmedQuery) > 40);
      const fuzzySeries = tSeries.filter(s => getSimilarityScore(s.title, trimmedQuery) > 40);

      finalMovies = mergeUnique(finalMovies, fuzzyMovies);
      finalSeries = mergeUnique(finalSeries, fuzzySeries);

      // Re-rank merged results
      finalMovies = rankItems(finalMovies, trimmedQuery);
      finalSeries = rankItems(finalSeries, trimmedQuery);
    }

    const results = {
      movies: finalMovies.slice(0, 20),
      series: finalSeries.slice(0, 20),
      anime: anime.slice(0, 20)
    };

    // ✅ OPTIMIZATION #4: Cache the result with LRU eviction
    searchCache[trimmedQuery] = { data: results, timestamp: now };

    // Manage Cache Size: Remove oldest entry when cache is full
    const MAX_CACHE = 25;
    const cacheKeys = Object.keys(searchCache);
    if (cacheKeys.length > MAX_CACHE) {
      const oldest = cacheKeys.sort(
        (a, b) => (searchCache[a]?.timestamp ?? 0) - (searchCache[b]?.timestamp ?? 0)
      )[0];
      delete searchCache[oldest];
    }


    return results;
  } catch (error) {
    console.error("Unified search failed:", error);
    return { movies: [], series: [], anime: [] };
  }
};

// Helper
const mergeUnique = (base: MediaItem[], extra: MediaItem[]) => {
  const ids = new Set(base.map(i => i.id));
  return [...base, ...extra.filter(i => !ids.has(i.id))];
};

// --- HISTORY & SUGGESTIONS (Unchanged) ---

const HISTORY_KEY = 'av_bucket_list_recent_searches_v2';

export const getRecentSearches = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

export const addRecentSearch = (term: string) => {
  if (!term.trim()) return;
  const current = getRecentSearches();
  const newHistory = [term, ...current.filter(s => s !== term)].slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
};

export const removeRecentSearch = (term: string) => {
  const current = getRecentSearches();
  const newHistory = current.filter(s => s !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  return newHistory;
};

export const clearRecentSearches = () => {
  localStorage.removeItem(HISTORY_KEY);
};

// Cache suggestions for 15 minutes
let suggestionsCache: { data: MediaItem[], timestamp: number } | null = null;
const SUGGESTIONS_CACHE_DURATION = 15 * 60 * 1000;

export const getPopularSuggestions = async (): Promise<MediaItem[]> => {
  if (suggestionsCache && (Date.now() - suggestionsCache.timestamp < SUGGESTIONS_CACHE_DURATION)) {
    return suggestionsCache.data;
  }

  try {
    const [movies, series, anime] = await Promise.all([
      fetchTrendingMovies(1),
      fetchTrendingSeries(1),
      fetchTrendingAnime(1)
    ]);

    const suggestions: MediaItem[] = [];
    const maxItems = 12;

    for (let i = 0; i < 4; i++) {
      if (suggestions.length >= maxItems) break;
      if (movies[i]) suggestions.push(movies[i]);

      if (suggestions.length >= maxItems) break;
      if (series[i]) suggestions.push(series[i]);

      if (suggestions.length >= maxItems) break;
      if (anime[i]) suggestions.push(anime[i]);
    }

    suggestionsCache = { data: suggestions, timestamp: Date.now() };

    return suggestions;
  } catch (e) {
    console.error("Failed to load suggestions", e);
    return [];
  }
};