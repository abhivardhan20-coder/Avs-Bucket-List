import { useState, useCallback } from 'react';
import { MediaItem, MediaType, Episode } from '../types';
import { ContentService } from '../services/contentService';
import { fetchSeasonDetails } from '../services/tmdb';
import { safeDate as parseLocalDate } from '../lib/dateUtils';
import { CalendarEntry } from '../components/upcoming/CalendarConstants';

export function useCalendarData(watchlist: MediaItem[], watched: MediaItem[]) {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const uniqueIds = new Set<string>();
      watchlist.forEach(item => uniqueIds.add(item.id));
      watched.forEach(item => uniqueIds.add(item.id));

      const ids = Array.from(uniqueIds);
      if (ids.length === 0) {
        setEntries([]);
        return;
      }

      const freshItems = await ContentService.getItemsByIds(ids);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const calEntries: CalendarEntry[] = [];

      const seasonFetchTasks: (() => Promise<void>)[] = [];

      for (const item of freshItems) {
        if (item.type === MediaType.Movie) {
          if (item.releaseDate) {
            const d = parseLocalDate(item.releaseDate);
            if (d && d >= today) {
              calEntries.push({
                item,
                date: item.releaseDate,
                label: 'Movie Release',
                type: MediaType.Movie,
              });
            }
          }
        } else {
          if (item.nextEpisode) {
            const seasonNum = item.nextEpisode.seasonNumber;
            seasonFetchTasks.push(() =>
              fetchSeasonDetails(item.id, seasonNum)
                .then((episodes: Episode[] | null) => {
                  if (!episodes) return;
                  for (const ep of episodes) {
                    if (!ep.airDate) continue;
                    const epDate = parseLocalDate(ep.airDate);
                    if (!epDate || epDate < today) continue;

                    calEntries.push({
                      item,
                      date: ep.airDate,
                      label: `S${seasonNum} E${ep.number}${ep.title ? ` – ${ep.title}` : ''}`,
                      type: item.type,
                      episodeInfo: { season: seasonNum, episode: ep.number, name: ep.title || '' },
                    });
                  }
                })
                .catch(err => {
                  console.warn(`Failed to fetch S${seasonNum} for ${item.title}:`, err);
                  if (item.nextEpisode!.airDate) {
                    const nd = parseLocalDate(item.nextEpisode!.airDate);
                    if (nd && nd >= today) {
                      calEntries.push({
                        item,
                        date: item.nextEpisode!.airDate,
                        label: `S${item.nextEpisode!.seasonNumber} E${item.nextEpisode!.episodeNumber}${item.nextEpisode!.name ? ` – ${item.nextEpisode!.name}` : ''}`,
                        type: item.type,
                        episodeInfo: {
                          season: item.nextEpisode!.seasonNumber,
                          episode: item.nextEpisode!.episodeNumber,
                          name: item.nextEpisode!.name || '',
                        },
                      });
                    }
                  }
                })
            );
          }
          if (item.seasons) {
            for (const season of item.seasons) {
              if (item.nextEpisode && season.number === item.nextEpisode.seasonNumber) continue;
              if (!season.airDate) continue;
              const sd = parseLocalDate(season.airDate);
              if (!sd || sd < today) continue;
              calEntries.push({
                item,
                date: season.airDate,
                label: `${season.title || `Season ${season.number}`} Premiere`,
                type: item.type,
              });
            }
          }
        }
      }

      // Process in chunks of 5 to limit concurrency
      for (let i = 0; i < seasonFetchTasks.length; i += 5) {
        const chunk = seasonFetchTasks.slice(i, i + 5);
        await Promise.all(chunk.map(t => t()));
      }
      setEntries(calEntries);
    } catch (err) {
      console.error('Calendar load error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [watchlist, watched]);

  return { entries, loading, error, loadCalendarData };
}
