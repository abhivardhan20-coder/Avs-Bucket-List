
import { MediaItem, MediaType } from '../types';

export interface UpcomingResolution {
  type: "movie" | "episode" | "season";
  title: string;
  parentTitle?: string;
  airDate: Date | null;
  daysRemaining: number | null;
  labelText: string;
  status: 'urgent' | 'upcoming' | 'future' | 'tba';
  confidence: 'confirmed' | 'estimated';
}

/**
 * Safely parses a YYYY-MM-DD string into a local Date object at midnight.
 * Enforces YYYY-MM-DD format to prevent partial date inference (e.g. "2025").
 * Returns null if input is invalid, undefined, or malformed.
 */
export const parseLocalDate = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;

  try {
    // Handle ISO strings by taking only the date part
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return null;

    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;

    return new Date(y, m - 1, d, 0, 0, 0, 0);
  } catch (e) {
    console.warn(`Date parsing error for value "${dateStr}":`, e);
    return null;
  }
};

export const isDateUpcoming = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const date = parseLocalDate(dateStr);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

/**
 * Centralized helper for generating upcoming label text.
 * Ensures consistency across NotificationPopover, ContentModal, and Badges.
 */
export const formatReleaseLabel = (
  type: 'movie' | 'episode' | 'season',
  daysRemaining: number,
  date: Date
): { text: string; status: 'urgent' | 'upcoming' | 'future' } => {
  const isMovie = type === 'movie';
  const verb = isMovie ? "Releases" : "Airs";

  try {
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (daysRemaining === 0) {
      return { text: `${verb} Today`, status: 'urgent' };
    } else if (daysRemaining === 1) {
      return { text: `${verb} Tomorrow`, status: 'urgent' };
    } else if (daysRemaining <= 7) {
      // Relative format: "Airs in 3 days"
      const relativePrefix = isMovie ? "Releases" : "Airs";
      return {
        text: `${relativePrefix} in ${daysRemaining} days`,
        status: 'upcoming'
      };
    } else {
      // Exact format: "Airs on Jan 1, 2025"
      const exactPrefix = isMovie ? "Releases" : "Airs";
      return {
        text: `${exactPrefix} on ${dateStr}`,
        status: 'future'
      };
    }
  } catch (e) {
    return { text: 'Date Unknown', status: 'future' };
  }
};

/**
 * Resolves the nearest future release for a media item based on PRD eligibility rules.
 * Priority: Next Episode > Future Season Air Date > Release Date > Returning Series (TBA)
 */
export const resolveUpcomingContent = (
  item: MediaItem,
  progress?: { type: 'Watchlist' | 'Watched'; watchedEpisodes: number; totalEpisodes: number }
): UpcomingResolution | null => {
  // 1. Filter Invalid Types
  if (item.type === MediaType.Other) return null;

  // 3. Determine Target Date & Metadata
  let targetDateStr: string | undefined;
  let type: "movie" | "episode" | "season" = "movie";
  let title = item.title;
  let parentTitle: string | undefined;

  // Priority A: Next Episode (Series/Anime)
  if (item.nextEpisode && item.nextEpisode.airDate) {
    targetDateStr = item.nextEpisode.airDate;
    type = item.nextEpisode.episodeNumber === 1 ? "season" : "episode";
    parentTitle = item.title;
    title = item.nextEpisode.name || `Episode ${item.nextEpisode.episodeNumber}`;
    if (type === 'season') {
      title = `Season ${item.nextEpisode.seasonNumber}`;
    }
  }
  // Priority B: Future Season Air Date (if nextEpisode is missing or not useful)
  else if (item.seasons && item.seasons.length > 0) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Sort seasons by number just in case
    const sortedSeasons = [...item.seasons].sort((a, b) => a.number - b.number);

    // Find first season with airDate >= today
    const futureSeason = sortedSeasons.find(s => {
      if (!s.airDate) return false;
      const d = parseLocalDate(s.airDate);
      return d && d >= now;
    });

    if (futureSeason && futureSeason.airDate) {
      targetDateStr = futureSeason.airDate;
      type = 'season';
      title = futureSeason.title || `Season ${futureSeason.number}`;
      parentTitle = item.title;
    }
  }

  // Priority C: Release Date (Movies or New Series)
  // Only check this if we haven't found a target date yet
  if (!targetDateStr && item.releaseDate) {
    if (item.type === MediaType.Movie) {
      // Movies: check if future
      if (isDateUpcoming(item.releaseDate)) {
        targetDateStr = item.releaseDate;
        type = "movie";
      }
    } else {
      // Series: check if new series premiering
      if (isDateUpcoming(item.releaseDate)) {
        targetDateStr = item.releaseDate;
        type = "season";
      }
    }
  }

  if (!targetDateStr) return null;

  const targetDay = parseLocalDate(targetDateStr!);
  if (!targetDay) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = targetDay.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // STRICT RULE: Only return future or today. No past dates.
  if (daysRemaining < 0) return null;

  // 4. Generate Label Text using helper
  const formatted = formatReleaseLabel(type, daysRemaining, targetDay);

  return {
    type,
    title,
    parentTitle,
    airDate: targetDay,
    daysRemaining,
    labelText: formatted.text,
    status: formatted.status,
    confidence: 'confirmed'
  };
};

/**
 * Robust helper to generate standard badge properties for any card.
 * Handles fallback to activity labels if no upcoming content is resolved.
 */
export const getStandardBadge = (item: MediaItem, activityLabel?: string): { text: string; color: string } => {
  const upcoming = resolveUpcomingContent(item);
  
  if (upcoming) {
    let color = 'bg-black/60';
    if (upcoming.status === 'urgent') color = 'bg-red-600';
    else if (upcoming.status === 'upcoming') color = 'bg-indigo-600';
    
    return { text: upcoming.labelText, color };
  }

  // Fallback to activity labels or media type
  const label = activityLabel || (item.type === MediaType.Movie ? 'Movie' : 'Series');
  let color = 'bg-gray-700';
  
  if (label === 'Season Premiere') color = 'bg-purple-600';
  else if (label === 'New Episode') color = 'bg-red-600';
  else if (label === 'Airing Today') color = 'bg-green-600';
  else if (label === 'Returning') color = 'bg-blue-600';

  return { text: label, color };
};

export const getCompactUpcomingBadge = (item: MediaItem): { text: string; isUrgent: boolean } | null => {
  const res = resolveUpcomingContent(item);
  if (!res) return null;

  if (res.status === 'tba') return { text: 'SOON', isUrgent: false };

  if (res.daysRemaining === 0) return { text: 'TODAY', isUrgent: true };
  if (res.daysRemaining === 1) return { text: 'TMRW', isUrgent: true };

  if (!res.airDate) return { text: 'SOON', isUrgent: false };

  const text = res.airDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  }).toUpperCase();

  return { text, isUrgent: res.status === 'urgent' };
};