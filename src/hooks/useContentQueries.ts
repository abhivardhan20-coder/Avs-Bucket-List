'use client';

import { useQuery } from '@tanstack/react-query';
import { ContentService } from '../services/contentService';
import { MediaType } from '@/types';

/**
 * Fetches trending media of a specific type (movie, tv) for a given page.
 * Uses React Query for caching to reduce network requests.
 * @param type - The type of media (e.g., MediaType.Movie, MediaType.Series)
 * @param page - The page number to fetch (defaults to 1)
 * @returns React Query object containing the trending data, loading state, etc.
 */
export function useTrending(type: MediaType, page: number = 1) {
  return useQuery({
    queryKey: ['trending', type, page],
    queryFn: () => ContentService.getTrending(type, page),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 1,
  });
}

/**
 * Searches for media based on a text query.
 * @param query - The search string
 * @param type - The type of media to search for
 * @param page - The page number
 * @returns React Query object containing search results
 */
export function useSearch(query: string, type: 'movie' | 'tv' | 'anime' = 'movie', page: number = 1) {
  return useQuery({
    queryKey: ['search', query, type, page],
    queryFn: () => ContentService.search(query, type, page),
    enabled: !!query && query.length > 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useDetails(appId: string | null) {
  return useQuery({
    queryKey: ['details', appId],
    queryFn: () => appId ? ContentService.getDetails(appId) : null,
    enabled: !!appId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (details don't change often)
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

export function useItemsByIds(ids: string[]) {
  // Sort + join for a stable, order-independent cache key
  const stableKey = [...ids].sort().join(',');

  return useQuery({
    queryKey: ['mediaItems', stableKey],
    queryFn: () => ContentService.getItemsByIds(ids),
    enabled: ids.length > 0,
    staleTime: 1000 * 60 * 30, // 30 min — IDs rarely change
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
