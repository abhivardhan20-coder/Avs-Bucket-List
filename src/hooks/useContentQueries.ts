import { useQuery } from '@tanstack/react-query';
import { ContentService } from '../services/contentService';
import { MediaItem, MediaType } from '@/types';

export function useTrending(type: MediaType, page: number = 1) {
  return useQuery({
    queryKey: ['trending', type, page],
    queryFn: () => ContentService.getTrending(type, page),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useSearch(query: string, type: 'movie' | 'tv' | 'anime' = 'movie', page: number = 1) {
  return useQuery({
    queryKey: ['search', query, type, page],
    queryFn: () => ContentService.search(query, type, page),
    enabled: !!query && query.length > 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDetails(appId: string | null) {
  return useQuery({
    queryKey: ['details', appId],
    queryFn: () => appId ? ContentService.getDetails(appId) : null,
    enabled: !!appId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (details don't change often)
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
  });
}