import { MediaItem } from '../types';

import { BACKEND_URL } from './config';
const OMDB_URL = `${BACKEND_URL}/api/omdb`;

/**
 * Robust fetch with timeout
 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

/**
 * OMDB Fallback (Primary for Movies/Series if TMDB falls)
 */
export const fetchOmdbDetails = async (title: string, year?: number, imdbId?: string): Promise<Partial<MediaItem> | null> => {
  let url = `${OMDB_URL}?plot=full`;
  if (imdbId) url += `&i=${imdbId}`;
  else url += `&t=${encodeURIComponent(title)}${year ? `&y=${year}` : ''}`;

  try {
    const res = await fetchWithTimeout(url);
    const data = await res.json();

    if (data.Response === 'False') return null;

    return {
      title: data.Title,
      overview: data.Plot,
      posterUrl: data.Poster !== 'N/A' ? data.Poster : '',
      rating: data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : 0,
      year: parseInt(data.Year),
      genres: data.Genre?.split(', ') || [],
      director: data.Director !== 'N/A' ? data.Director : undefined,
      cast: data.Actors?.split(', ').slice(0, 5) || [],
      runtime: parseInt(data.Runtime),
      imdbId: data.imdbID,
      dataSource: 'omdb'
    };
  } catch (e) {
    console.warn("OMDB fallback failed", e);
    return null;
  }
};

/**
 * Jikan (MAL) Fallback (Primary for Anime if AniList falls)
 */
export const fetchJikanAnime = async (title: string, malId?: number): Promise<Partial<MediaItem> | null> => {
  let url = `https://api.jikan.moe/v4/anime`;
  if (malId) url = `https://api.jikan.moe/v4/anime/${malId}/full`;
  else url += `?q=${encodeURIComponent(title)}&limit=1`;

  try {
    const res = await fetchWithTimeout(url);
    const json = await res.json();
    const data = malId ? json.data : json.data?.[0];

    if (!data) return null;

    return {
      title: data.title_english || data.title,
      overview: data.synopsis,
      posterUrl: data.images?.webp?.large_image_url || data.images?.jpg?.large_image_url,
      rating: data.score || 0,
      year: data.year || (data.aired?.from ? new Date(data.aired.from).getFullYear() : 0),
      genres: data.genres?.map((g: { name: string }) => g.name) || [],
      status: data.status,
      totalEpisodes: data.episodes,
      malId: data.mal_id,
      dataSource: 'jikan'
    };
  } catch (e) {
    console.warn("Jikan fallback failed", e);
    return null;
  }
};

/**
 * Kitsu Fallback (Secondary for Anime)
 */
export const fetchKitsuAnime = async (title: string): Promise<Partial<MediaItem> | null> => {
  const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(title)}&page[limit]=1`;

  try {
    const res = await fetchWithTimeout(url);
    const json = await res.json();
    const data = json.data?.[0]?.attributes;

    if (!data) return null;

    return {
      title: data.en || data.en_jp || data.canonicalTitle,
      overview: data.synopsis,
      posterUrl: data.posterImage?.large || data.posterImage?.original,
      rating: data.averageRating ? parseFloat(data.averageRating) / 10 : 0,
      year: data.startDate ? new Date(data.startDate).getFullYear() : 0,
      status: data.status,
      totalEpisodes: data.episodeCount,
      dataSource: 'kitsu'
    };
  } catch (e) {
    console.warn("Kitsu fallback failed", e);
    return null;
  }
};