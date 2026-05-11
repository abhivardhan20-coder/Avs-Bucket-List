import { MediaItem, MediaType, Season, Episode, NextEpisodeInfo } from '@/types';
const BASE_URL = 'https://api.themoviedb.org/3';

// ✅ PERFORMANCE OPTIMIZED: Use optimized image sizes
const getImageUrl = (path: string | null, size: 'original' | 'w1280' | 'w780' | 'w500' | 'w342' | 'w300' = 'original') => {
  if (!path) return '';
  const base = `https://image.tmdb.org/t/p/${size}`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${cleanPath}`;
};

export const GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
};

const getHeaders = () => ({
  accept: 'application/json'
});

async function fetchWithRetry(url: string, options: RequestInit, retries = 5, backoff = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    // Retry on 5xx server errors or 429 rate-limit responses
    if (!response.ok && (response.status >= 500 || response.status === 429) && retries > 0) {
      // Respect Retry-After header if present (in seconds), otherwise use exponential backoff
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter 
        ? Math.min(parseInt(retryAfter, 10) * 1000, 15000) 
        : (response.status === 429 ? backoff * 2 : backoff);
      
      console.warn(`[TMDB] Retrying ${url.split('api_key')[0]} due to ${response.status}... (${retries} left, delay: ${delay}ms)`);
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`[TMDB] Retrying ${url.split('api_key')[0]} due to network error... (${retries} left)`);
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

/**
 * Robust fetch wrapper for TMDB (via Backend Proxy)
 */
async function safeTmdbFetch<T>(endpoint: string, signal?: AbortSignal): Promise<T | null> {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}api_key=${apiKey}`;

  try {
    const response = await fetchWithRetry(url, { headers: getHeaders(), signal }, 5);
    if (!response.ok) {
      if (response.status !== 404) {
        throw new Error(`TMDB_API_ERROR_${response.status}: ${response.statusText}`);
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('TMDB_API_ERROR')) {
      throw error;
    }
    console.error(`TMDB Fetch Failure for ${endpoint}:`, error);
    throw error;
  }
}

export const toAppId = (type: 'movie' | 'tv', id: number) => `${type === 'movie' ? 'movie' : 'series'}_${id}`;

export const parseAppId = (appId: string) => {
  if (!appId || !appId.includes('_')) return { type: 'unknown', id: -1 };
  const parts = appId.split('_');
  const typeStr = parts[0];
  const type = typeStr === 'movie' ? 'movie' : typeStr === 'series' ? 'tv' : 'unknown';
  const id = parseInt(parts[1], 10);

  if (isNaN(id)) return { type: 'unknown', id: -1 };
  return { type, id };
};

const calculateDaysUntil = (dateStr: string): number => {
  if (!dateStr) return 0;
  // Use UTC to avoid timezone issues where users in early timezones see "tomorrow" content as "today" incorrectly or vice versa
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 0; // Handle invalid dates safely
  target.setUTCHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

interface TmdbResult {
  id: number;
  title?: string;
  name?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  original_language?: string;
  runtime?: number;
  episode_run_time?: number[];
  backdrop_path?: string | null;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number | null;
  release_date?: string;
  first_air_date?: string;
  last_air_date?: string;
  status?: string;
  number_of_episodes?: number;
  next_episode_to_air?: {
    id: number;
    air_date: string;
    season_number: number;
    episode_number: number;
    name: string;
  } | null;
  videos?: { results: { site: string; type: string; official: boolean; key: string }[] };
  credits?: { cast: { name: string }[]; crew: { name: string; job: string }[] };
  seasons?: { season_number: number; name: string; poster_path: string | null; air_date: string; episode_count: number }[];
}

const mapResultToItem = (item: TmdbResult, type: MediaType): MediaItem => {
  const genreIds = item.genre_ids || (item.genres ? item.genres.map(g => g.id) : []);
  const hasAnimationGenre = genreIds.includes(16);
  const isJapanese = item.original_language === 'ja';
  const finalType = (type === MediaType.Series && hasAnimationGenre && isJapanese) ? MediaType.Anime : type;

  const tmdbType = finalType === MediaType.Movie ? 'movie' : 'tv';
  const runtime = Number(item.runtime) || (item.episode_run_time && Number(item.episode_run_time[0])) || 0;

  let nextEpisode: NextEpisodeInfo | undefined = undefined;
  if (item.next_episode_to_air) {
    nextEpisode = {
      id: String(item.next_episode_to_air.id),
      airDate: item.next_episode_to_air.air_date,
      seasonNumber: item.next_episode_to_air.season_number,
      episodeNumber: item.next_episode_to_air.episode_number,
      name: item.next_episode_to_air.name || `Episode ${item.next_episode_to_air.episode_number}`,
      daysUntil: calculateDaysUntil(item.next_episode_to_air.air_date)
    };
  }

  const mapped = {
    id: toAppId(tmdbType, item.id),
    title: item.title || item.name,
    type: finalType,
    backdropUrl: getImageUrl(item.backdrop_path, 'original'),
    posterUrl: getImageUrl(item.poster_path || item.backdrop_path, 'original'),
    overview: item.overview || '',
    rating: (item.vote_average !== undefined && item.vote_average !== null) ? Number(Number(item.vote_average).toFixed(1)) : 0,
    year: new Date(item.release_date || item.first_air_date || Date.now()).getFullYear(),
    genres: item.genre_ids ? item.genre_ids.map((id: number) => GENRES[id]).filter(Boolean) : (item.genres ? item.genres.map(g => g.name) : []),
    runtime,
    totalEpisodes: item.number_of_episodes,
    releaseDate: item.release_date || item.first_air_date,
    lastAirDate: item.last_air_date,
    status: item.status,
    nextEpisode
  };
  
  return mapped;
};

// Helper for reverse lookup with some manual overrides for common mismatches
const getGenreId = (name: string): number | undefined => {
  const normalized = name.toLowerCase();
  const entry = Object.entries(GENRES).find(([, val]) => val.toLowerCase() === normalized);
  if (entry) return parseInt(entry[0]);

  // Manual overrides if map differs from API string
  if (normalized === 'science fiction') return 878;
  if (normalized === 'action & adventure') return 10759;
  if (normalized === 'sci-fi & fantasy') return 10765;

  return undefined;
};

export const fetchTrailerKey = async (appId: string): Promise<string | undefined> => {
  const { type, id } = parseAppId(appId);
  if (id === -1 || type === 'unknown') return undefined;
  const data = await safeTmdbFetch<{ results?: { site: string; type: string; official: boolean; key: string }[] }>(`/${type}/${id}/videos`);
  if (!data) return undefined;

  const videos = data.results?.filter(v => v.site === 'YouTube') || [];
  const trailer = videos.find(v => v.type === 'Trailer' && v.official === true)
    || videos.find(v => v.type === 'Trailer')
    || videos.find(v => v.type === 'Teaser' && v.official === true);
  return trailer?.key;
};

export const fetchSeasonDetails = async (appId: string, seasonNumber: number): Promise<Episode[] | null> => {
  const { id } = parseAppId(appId);
  if (id === -1) return null;
  const data = await safeTmdbFetch<{ episodes?: { episode_number: number; name: string; runtime: number; overview: string; still_path: string | null; air_date: string }[] }>(`/tv/${id}/season/${seasonNumber}`);
  if (!data) return null;

  return data.episodes?.map(e => ({
    id: `ep_${id}_${seasonNumber}_${e.episode_number}`,
    number: e.episode_number,
    title: e.name,
    runtime: Number(e.runtime) || 0,
    watched: false,
    overview: e.overview,
    stillUrl: getImageUrl(e.still_path, 'original'),
    airDate: e.air_date
  })) || [];
};

export const fetchDetails = async (appId: string, signal?: AbortSignal): Promise<Partial<MediaItem> | null> => {
  const { type, id } = parseAppId(appId);
  if (id === -1 || type === 'unknown') return null;
  const data = await safeTmdbFetch<Record<string, any>>(`/${type}/${id}?append_to_response=videos,credits`, signal);
  if (!data) return null;

  const videos = data.videos?.results?.filter((v: Record<string, any>) => v.site === 'YouTube') || [];
  const trailer = videos.find((v: Record<string, any>) => v.type === 'Trailer' && v.official === true)
    || videos.find((v: Record<string, any>) => v.type === 'Trailer')
    || videos.find((v: Record<string, any>) => v.type === 'Teaser' && v.official === true);

  const cast = data.credits?.cast?.slice(0, 5).map((c: Record<string, any>) => c.name) || [];
  const director = data.credits?.crew?.find((c: Record<string, any>) => c.job === 'Director')?.name;

  let seasons: Season[] | undefined = undefined;
  if (type === 'tv' && data.seasons) {
    seasons = data.seasons
      .filter((s: { season_number: number }) => s.season_number > 0)
      .map((s: { season_number: number; name: string; poster_path: string | null; air_date: string; episode_count: number }) => ({
        id: `season_${id}_${s.season_number}`,
        number: s.season_number,
        title: s.name,
        posterUrl: getImageUrl(s.poster_path, 'original'),
        airDate: s.air_date,
        episodes: [],
        episodeCount: s.episode_count
      }));
  }
  const mediaType = type === 'movie' ? MediaType.Movie : MediaType.Series;
  const mapped = mapResultToItem(data as TmdbResult, mediaType);
  return {
    ...mapped,
    trailerId: trailer?.key,
    cast,
    director,
    seasons,
    genres: data.genres?.map((g: Record<string, any>) => g.name) || [],
    totalEpisodes: data.number_of_episodes,
    runtime: Number(data.runtime) || (data.episode_run_time && Number(data.episode_run_time[0])) || 0
  };
};

export const searchTmdb = async (query: string, type: 'movie' | 'tv', page: number = 1): Promise<MediaItem[]> => {
  const data = await safeTmdbFetch<{ results: TmdbResult[] }>(`/search/${type}?query=${encodeURIComponent(query)}&page=${page}`);
  if (!data || !data.results) return [];
  return (data.results.map((item: TmdbResult) => mapResultToItem(item, type === 'movie' ? MediaType.Movie : MediaType.Series)) || []).filter(i => i.posterUrl);
};

export const fetchTrendingMovies = async (page: number = 1) => {
  const data = await safeTmdbFetch<{ results: TmdbResult[] }>(`/trending/movie/week?page=${page}`);
  return (data?.results?.map((i: TmdbResult) => mapResultToItem(i, MediaType.Movie)) || []).filter(i => i.posterUrl);
};

export const fetchTrendingSeries = async (page: number = 1) => {
  const data = await safeTmdbFetch<{ results: TmdbResult[] }>(`/trending/tv/week?page=${page}`);
  return (data?.results?.map((i: TmdbResult) => mapResultToItem(i, MediaType.Series)) || []).filter(i => i.posterUrl);
};

export const fetchTrendingAnime = async (page: number = 1) => {
  const data = await safeTmdbFetch<{ results: TmdbResult[] }>(`/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`);
  return (data?.results?.map((i: TmdbResult) => mapResultToItem(i, MediaType.Anime)) || []).filter(i => i.posterUrl);
};

export const fetchTopRatedMovies = async (page: number = 1) => {
  const data = await safeTmdbFetch<any>(`/movie/top_rated?page=${page}`);
  return (data?.results?.map((i: any) => mapResultToItem(i, MediaType.Movie)) || []).filter(i => i.posterUrl);
};

export const fetchTopRatedSeries = async (page: number = 1) => {
  const data = await safeTmdbFetch<any>(`/tv/top_rated?page=${page}`);
  return (data?.results?.map((i: any) => mapResultToItem(i, MediaType.Series)) || []).filter(i => i.posterUrl);
};

export const fetchTopRatedAnime = async (page: number = 1) => {
  const data = await safeTmdbFetch<any>(`/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=200&page=${page}`);
  return (data?.results?.map((i: any) => mapResultToItem(i, MediaType.Anime)) || []).filter(i => i.posterUrl);
};

export const fetchUpcomingMovies = async (page: number = 1) => {
  const data = await safeTmdbFetch<any>(`/movie/upcoming?page=${page}`);
  return (data?.results?.map((i: any) => mapResultToItem(i, MediaType.Movie)) || []).filter(i => i.posterUrl);
};

export const fetchAiringSeries = async (page: number = 1) => {
  const data = await safeTmdbFetch<any>(`/tv/on_the_air?page=${page}`);
  return (data?.results?.map((i: any) => mapResultToItem(i, MediaType.Series)) || []).filter(i => i.posterUrl);
};

export const fetchUpcomingAnime = async (page: number = 1) => {
  const today = new Date().toISOString().split('T')[0];
  const data = await safeTmdbFetch<any>(`/discover/tv?with_genres=16&with_original_language=ja&first_air_date.gte=${today}&sort_by=popularity.desc&page=${page}`);
  return (data?.results?.map((i: any) => mapResultToItem(i, MediaType.Anime)) || []).filter(i => i.posterUrl);
};

export const searchAnime = async (query: string, page: number = 1): Promise<MediaItem[]> => {
  const data = await safeTmdbFetch<{ results: TmdbResult[] }>(`/search/tv?query=${encodeURIComponent(query)}&page=${page}`);
  if (!data || !data.results) return [];
  // Filter for Anime type items
  return data.results
    .map((item: TmdbResult) => mapResultToItem(item, MediaType.Series)) // mapResultToItem handles the detection logic so we pass Series first
    .filter((item: MediaItem) => item.type === MediaType.Anime && item.posterUrl);
};

export const fetchItemsByIds = async (ids: string[]): Promise<MediaItem[]> => {
  const results = await Promise.all(ids.map(id => fetchDetails(id)));
  return results.filter((item): item is MediaItem => item !== null);
};

export const hydrateSeason = async (item: MediaItem, season: Season): Promise<Season> => {
  if (season.episodes && season.episodes.length > 0) return season;
  const episodes = await fetchSeasonDetails(item.id, season.number);
  return { ...season, episodes: episodes || [] };
};

/**
 * Helper to run promises with limited concurrency
 */
async function limitConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const batches = [];
  for (let i = 0; i < items.length; i += limit) {
    batches.push(items.slice(i, i + limit));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    // Optional: add a tiny delay between batches to further smooth out bursts
    if (batches.length > 1) await new Promise(r => setTimeout(r, 100));
  }

  return results;
}

export const hydrateSeries = async (item: MediaItem): Promise<MediaItem> => {
  if (item.type === MediaType.Movie) return item;
  let fullItem = item;
  if (!fullItem.seasons) {
    const details = await fetchDetails(item.id);
    if (!details) return item;
    fullItem = { ...item, ...details } as MediaItem;
  }
  
  // Use concurrency limiting to avoid hitting TMDB rate limits (max 3 seasons at a time)
  const hydratedSeasons = await limitConcurrency(
    fullItem.seasons!, 
    3, 
    (s) => hydrateSeason(fullItem, s)
  );
  
  return { ...fullItem, seasons: hydratedSeasons };
};

export const fetchPersonCredits = async (name: string, role: 'actor' | 'director'): Promise<MediaItem[] | null> => {
  try {
    const searchData = await safeTmdbFetch<any>(`/search/person?query=${encodeURIComponent(name)}`);
    if (!searchData?.results?.length) return null;

    // Improved matching logic:
    // 1. Sort by popularity (descending)
    // 2. Find first person matching the target department
    // 3. Fallback to the most popular person if no department match found
    const targetDept = role === 'actor' ? 'Acting' : 'Directing';

    const candidates = [...searchData.results].sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
    const person = candidates.find((p: any) => p.known_for_department === targetDept) || candidates[0];

    if (!person) return null;

    const creditsData = await safeTmdbFetch<any>(`/person/${person.id}/combined_credits`);
    if (!creditsData) return null;

    const items = role === 'actor'
      ? (creditsData.cast || [])
      : (creditsData.crew?.filter((c: any) => c.job === 'Director') || []);

    return items
      .filter((i: any) => (i.poster_path || i.backdrop_path) && i.overview)
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 60)
      .map((i: any) => mapResultToItem(i, i.media_type === 'movie' ? MediaType.Movie : MediaType.Series));
  } catch (error) {
    console.error(`Failed to fetch credits for ${name}:`, error);
    return null;
  }
};

export const fetchContentByGenre = async (genre: string, type: MediaType, page: number = 1): Promise<MediaItem[]> => {
  const genreId = getGenreId(genre);
  if (!genreId) return [];

  const endpointType = type === MediaType.Movie ? 'movie' : 'tv';
  // Use discover
  const data = await safeTmdbFetch<any>(`/discover/${endpointType}?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`);
  if (!data?.results) return [];
  return (data.results.map((i: any) => mapResultToItem(i, type)) || []).filter(i => i.posterUrl);
};

export const fetchRecommendationPool = async (): Promise<MediaItem[]> => {
  try {
    const [trendingMovies, trendingTV, topMovies, topTV, discoverAnime] = await Promise.all([
      fetchTrendingMovies(1),
      fetchTrendingSeries(1),
      fetchTopRatedMovies(1),
      fetchTopRatedSeries(1),
      fetchTrendingAnime(1)
    ]);

    // Flatten and deduplicate by ID
    const poolMap = new Map<string, MediaItem>();
    [...trendingMovies, ...trendingTV, ...topMovies, ...topTV, ...discoverAnime].forEach(item => {
      poolMap.set(item.id, item);
    });

    return Array.from(poolMap.values());
  } catch (error) {
    console.error("[TMDB] Failed to fetch recommendation pool", error);
    return [];
  }
};
