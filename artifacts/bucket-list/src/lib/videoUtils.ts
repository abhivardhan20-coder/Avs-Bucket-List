
/**
 * Opens a YouTube video in a new tab using the provided video key.
 * @param videoKey The YouTube video ID (e.g., from TMDB).
 * @returns boolean True if successful (key existed), false otherwise.
 */
export const openYouTubeTrailer = (videoKey: string | undefined | null): boolean => {
  if (!videoKey) {
    console.warn("Cannot open trailer: No video key provided.");
    return false;
  }
  const url = `https://www.youtube.com/watch?v=${videoKey}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};