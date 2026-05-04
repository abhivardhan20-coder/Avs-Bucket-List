
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertTriangle, RefreshCw, Film, Tv, Zap, ImageOff } from 'lucide-react';
import { MediaItem, MediaType, Episode } from '../../types';
import { useLibrary } from '../../contexts/AppContext';
import { fetchItemsByIds, fetchSeasonDetails } from '../../services/tmdb';
import { parseLocalDate } from '../../lib/dateUtils';

interface UpcomingCalendarProps {
  onItemClick: (item: MediaItem) => void;
}

/**
 * A single calendar entry representing one date-specific event
 * tied to a media item in the user's library.
 */
interface CalendarEntry {
  item: MediaItem;
  date: string;           // YYYY-MM-DD
  label: string;          // e.g. "S3 E5 – Episode Title" or "Movie Release"
  type: MediaType;
  episodeInfo?: { season: number; episode: number; name: string };
}

/** Helper: YYYY-MM-DD key from a Date using local time */
const getDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const DOT_COLORS: Record<MediaType, { normal: string; selected: string; glow: string }> = {
  [MediaType.Movie]:  { normal: 'bg-red-500',    selected: 'bg-red-400',    glow: 'shadow-red-500/60' },
  [MediaType.Series]: { normal: 'bg-blue-500',   selected: 'bg-blue-400',   glow: 'shadow-blue-500/60' },
  [MediaType.Anime]:  { normal: 'bg-violet-500', selected: 'bg-violet-400', glow: 'shadow-violet-500/60' },
  [MediaType.Other]:  { normal: 'bg-gray-500',   selected: 'bg-gray-400',   glow: '' },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  [MediaType.Movie]:  <Film className="w-3 h-3" />,
  [MediaType.Series]: <Tv className="w-3 h-3" />,
  [MediaType.Anime]:  <Zap className="w-3 h-3" />,
};

const TYPE_BADGE_COLOR: Record<string, string> = {
  [MediaType.Movie]:  'bg-red-500/10 text-red-400 border-red-500/20',
  [MediaType.Series]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [MediaType.Anime]:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

// ── Inline detail row for the selected-day panel ──────────────────────
const CalendarEntryRow: React.FC<{
  entry: CalendarEntry;
  onClick: () => void;
}> = ({ entry, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const colors = TYPE_BADGE_COLOR[entry.type] || '';

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-2.5 hover:bg-white/[0.04] cursor-pointer group transition-all rounded-xl border border-transparent hover:border-white/5"
    >
      {/* Poster thumbnail */}
      <div className="relative w-9 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a] border border-white/5">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-3 h-3 text-gray-600" />
          </div>
        ) : (
          <img
            src={entry.item.posterUrl || undefined}
            alt={entry.item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h5 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors leading-tight">
          {entry.item.title}
        </h5>
        <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
          {entry.label}
        </p>
      </div>

      {/* Type badge */}
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest flex-shrink-0 ${colors}`}>
        {TYPE_ICON[entry.type]}
      </div>
    </div>
  );
};


const UpcomingCalendar: React.FC<UpcomingCalendarProps> = ({ onItemClick }) => {
  const { watchlist, watched, isInWatchlist, addToWatchlist, removeFromWatchlist, isWatched, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries } = useLibrary();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Keep the hydrated items for watchlist/watched toggle actions
  const [itemMap, setItemMap] = useState<Map<string, MediaItem>>(new Map());

  /**
   * Load calendar data exclusively from the user's watchlist + watched items.
   * For series/anime, fetches the current airing season's episode list so that
   * weekly episodes each get their own calendar dot.
   */
  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // 1. Collect unique IDs from watchlist + watched
      const uniqueIds = new Set<string>();
      watchlist.forEach(item => uniqueIds.add(item.id));
      watched.forEach(item => uniqueIds.add(item.id));

      const ids = Array.from(uniqueIds);
      if (ids.length === 0) {
        setEntries([]);
        setItemMap(new Map());
        return;
      }

      // 2. Fetch full details for all items
      const freshItems = await fetchItemsByIds(ids);
      const map = new Map<string, MediaItem>();
      freshItems.forEach(item => map.set(item.id, item));
      setItemMap(map);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const calEntries: CalendarEntry[] = [];

      // 3. Process each item
      const seasonFetchPromises: Promise<void>[] = [];

      for (const item of freshItems) {
        if (item.type === MediaType.Movie) {
          // Movies: add release date if future
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
          // Series / Anime — we need individual episode air dates
          // If there's a nextEpisode, fetch that season to get all episode dates
          if (item.nextEpisode) {
            const seasonNum = item.nextEpisode.seasonNumber;
            seasonFetchPromises.push(
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
                  // Fallback: just use nextEpisode date
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
          // Also check for future season premieres (seasons whose airDate is future but don't have nextEpisode pointing to them)
          if (item.seasons) {
            for (const season of item.seasons) {
              // Skip the season we're already fetching episodes for
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

      // Wait for all season episode fetches to complete
      await Promise.all(seasonFetchPromises);

      setEntries(calEntries);
    } catch (err) {
      console.error('Calendar load error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [watchlist, watched]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // --- Watchlist / Watched handlers ---
  const handleToggleWatchlist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = itemMap.get(id);
    if (!item) return;
    if (isInWatchlist(id)) removeFromWatchlist(id);
    else addToWatchlist(item);
  };

  const handleToggleWatched = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = itemMap.get(id);
    if (!item) return;
    if (isWatched(id)) {
      if (item.type === MediaType.Movie) await unmarkMovie(item);
      else await unmarkSeries(item);
    } else {
      if (item.type === MediaType.Movie) await markMovieAsWatched(item);
      else await markSeriesAsWatched(item);
    }
  };

  // --- Group entries by date ---
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date)!.push(entry);
    }
    return map;
  }, [entries]);

  // --- Calendar grid logic ---
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const todayKey = getDateKey(new Date());
  const selectedKey = getDateKey(selectedDate);

  // Build day cells
  const days = useMemo(() => {
    const cells: React.ReactNode[] = [];

    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="w-full aspect-square max-w-[40px]" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDayDate = new Date(year, month, d);
      const dateKey = getDateKey(currentDayDate);
      const dayEntries = entriesByDate.get(dateKey) || [];
      const isToday = dateKey === todayKey;
      const isSelected = dateKey === selectedKey;

      // Collect unique media types for dot indicators
      const mediaTypes = Array.from(new Set(dayEntries.map(e => e.type)));

      cells.push(
        <button
          key={d}
          onClick={() => setSelectedDate(currentDayDate)}
          className={`relative w-full aspect-square max-w-[40px] rounded-full flex flex-col items-center justify-center text-xs transition-all duration-200
            ${isSelected ? 'bg-white text-black font-bold scale-110 shadow-[0_0_20px_rgba(255,255,255,0.15)] z-10' : 'text-gray-400 hover:bg-white/10 hover:text-white'}
            ${isToday && !isSelected ? 'ring-1 ring-red-500 text-red-400 font-bold' : ''}
          `}
        >
          <span className="leading-none">{d}</span>
          {mediaTypes.length > 0 && (
            <div className="flex gap-[3px] mt-0.5">
              {mediaTypes.map(type => {
                const colors = DOT_COLORS[type] || DOT_COLORS[MediaType.Other];
                return (
                  <div
                    key={type}
                    className={`w-[5px] h-[5px] rounded-full ${isSelected ? colors.selected : colors.normal} ${isSelected ? `shadow-md ${colors.glow}` : ''} transition-all duration-200`}
                  />
                );
              })}
            </div>
          )}
        </button>
      );
    }

    return cells;
  }, [year, month, daysInMonth, firstDay, entriesByDate, todayKey, selectedKey]);

  const selectedEntries = entriesByDate.get(selectedKey) || [];

  // Group selected entries by type for the detail panel
  const groupedSelected = useMemo(() => {
    const groups: { type: MediaType; label: string; entries: CalendarEntry[] }[] = [
      { type: MediaType.Movie, label: 'Movies', entries: [] },
      { type: MediaType.Series, label: 'TV Series', entries: [] },
      { type: MediaType.Anime, label: 'Anime', entries: [] },
    ];
    selectedEntries.forEach(entry => {
      const group = groups.find(g => g.type === entry.type);
      if (group) group.entries.push(entry);
    });
    return groups.filter(g => g.entries.length > 0);
  }, [selectedEntries]);

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300 px-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-white text-sm uppercase tracking-widest">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {[
          { label: 'Movies', color: 'bg-red-500' },
          { label: 'Series', color: 'bg-blue-500' },
          { label: 'Anime', color: 'bg-violet-500' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${l.color}`} />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 mb-2 text-center border-b border-white/5 pb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-[10px] text-gray-600 font-black">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 place-items-center mb-4">
        {days}
      </div>

      {/* Selected Date Detail Panel */}
      <div className="flex-1 border-t border-white/10 pt-4 -mx-4 px-4 bg-gradient-to-b from-white/[0.03] to-transparent">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <CalendarIcon className="w-3 h-3" />
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h4>
          {!loading && (
            <span className="text-[10px] text-gray-600 font-bold">
              {selectedEntries.length} {selectedEntries.length === 1 ? 'Release' : 'Releases'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="w-5 h-5 text-gray-600 animate-spin" />
            <p className="text-[10px] text-gray-600 font-bold">Loading calendar...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-red-900/20 p-3 rounded-full mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-xs font-bold text-white mb-1">Calendar Error</p>
            <p className="text-[10px] text-gray-500 max-w-[200px] mb-3">Failed to load calendar data</p>
            <button
              onClick={loadCalendarData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 opacity-50">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-xs text-gray-500 font-medium">No upcoming items in your library.</p>
            <p className="text-[10px] text-gray-600 mt-1">Add shows or movies to your Watchlist to track them here.</p>
          </div>
        ) : selectedEntries.length === 0 ? (
          <div className="text-center py-8 opacity-50">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-xs text-gray-500 font-medium">No releases on this day.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[350px] overflow-y-auto no-scrollbar pb-4">
            {groupedSelected.map(group => (
              <div key={group.type}>
                {/* Type Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[group.type]?.normal || 'bg-gray-500'}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                    {TYPE_ICON[group.type]}
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[9px] font-bold text-gray-600">{group.entries.length}</span>
                </div>
                {/* Entry rows */}
                <div className="space-y-1">
                  {group.entries.map((entry, i) => (
                    <CalendarEntryRow
                      key={`${entry.item.id}-${entry.date}-${i}`}
                      entry={entry}
                      onClick={() => onItemClick(entry.item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingCalendar;