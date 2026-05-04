import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLibrary } from '../../contexts/AppContext';
import { MediaItem, MediaType } from '../../types';
import { Calendar, Film, Tv, Zap, Clock, Loader, RefreshCw, AlertTriangle } from 'lucide-react';
import UpcomingCard from './UpcomingCard';
import HorizontalScrollContainer from '../HorizontalScrollContainer';
import {
  fetchUpcomingMovies,
  fetchAiringSeries,
  fetchItemsByIds,
  fetchUpcomingAnime
} from '../../services/tmdb';

type TabType = 'schedule' | 'movies' | 'series' | 'anime';
type DateFilter = 'all' | 'week' | 'month';

const UpcomingDashboard: React.FC<{ onResultClick: (item: MediaItem) => void }> = ({ onResultClick }) => {
  const { watchlist, watched, isInWatchlist, addToWatchlist, removeFromWatchlist, isWatched, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries } = useLibrary();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Data State
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [anime, setAnime] = useState<MediaItem[]>([]);
  const [scheduleItems, setScheduleItems] = useState<MediaItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Special logic for "My Schedule" (Watchlist + Watched Series/Anime)
  const loadSchedule = useCallback(async () => {
    const uniqueIds = new Set<string>();
    watchlist.forEach(item => {
      if (item.type === MediaType.Series || item.type === MediaType.Anime) uniqueIds.add(item.id);
    });
    watched.forEach(item => {
      if (item.type === MediaType.Series || item.type === MediaType.Anime) uniqueIds.add(item.id);
    });

    const ids = Array.from(uniqueIds);
    if (ids.length === 0) {
      setScheduleItems([]);
      return;
    }

    try {
      const freshItems = await fetchItemsByIds(ids);
      const withUpcoming = freshItems.filter(item =>
        item.nextEpisode && new Date(item.nextEpisode.airDate).getTime() >= new Date().setHours(0, 0, 0, 0)
      );

      withUpcoming.sort((a, b) => {
        const dateA = a.nextEpisode?.airDate ? new Date(a.nextEpisode.airDate).getTime() : 0;
        const dateB = b.nextEpisode?.airDate ? new Date(b.nextEpisode.airDate).getTime() : 0;
        return dateA - dateB;
      });

      setScheduleItems(withUpcoming);
    } catch (e) {
      console.error("Error updating schedule", e);
      throw e;
    }
  }, [watchlist, watched]);

  // Load Data based on Tab
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (activeTab === 'movies' && movies.length === 0) {
        const res = await fetchUpcomingMovies();
        setMovies(res);
      } else if (activeTab === 'series' && series.length === 0) {
        const res = await fetchAiringSeries();
        setSeries(res);
      } else if (activeTab === 'anime' && anime.length === 0) {
        const res = await fetchUpcomingAnime();
        setAnime(res);
      } else if (activeTab === 'schedule') {
        await loadSchedule();
      }
    } catch (e) {
      console.error("Failed to load upcoming data", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeTab, movies.length, series.length, anime.length, loadSchedule]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefreshSchedule = async () => {
    setRefreshing(true);
    setError(false);
    try {
      await loadSchedule();
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  };

  const getFilteredData = (data: MediaItem[]) => {
    if (dateFilter === 'all') return data;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const limit = new Date(now);
    if (dateFilter === 'week') limit.setDate(now.getDate() + 7);
    if (dateFilter === 'month') limit.setDate(now.getDate() + 30);

    return data.filter(item => {
      const dateStr = item.nextEpisode?.airDate || item.releaseDate;
      if (!dateStr) return false;
      const [y, m, d] = dateStr.split('-').map(Number);
      const itemDate = new Date(y, m - 1, d);
      return itemDate >= now && itemDate <= limit;
    });
  };

  const currentData = useMemo(() => {
    switch (activeTab) {
      case 'schedule': return getFilteredData(scheduleItems);
      case 'movies': return getFilteredData(movies);
      case 'series': return getFilteredData(series);
      case 'anime': return getFilteredData(anime);
    }
  }, [activeTab, scheduleItems, movies, series, anime, dateFilter, getFilteredData]);

  const handleToggleWatchlist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = currentData.find(i => i.id === id);
    if (!item) return;
    if (isInWatchlist(id)) removeFromWatchlist(id);
    else addToWatchlist(item);
  };

  const handleToggleWatched = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = currentData.find(i => i.id === id);
    if (!item) return;
    
    if (isWatched(id)) {
      if (item.type === MediaType.Movie) {
        await unmarkMovie(item);
      } else {
        await unmarkSeries(item);
      }
    } else {
      if (item.type === MediaType.Movie) {
        await markMovieAsWatched(item);
      } else {
        await markSeriesAsWatched(item);
      }
    }
  };

  // Grouped items for Schedule rendering
  const groupedSchedule = useMemo(() => {
    if (activeTab !== 'schedule') return [];
    
    const groups: Record<string, MediaItem[]> = {};
    currentData.forEach(item => {
      const d = item.nextEpisode?.daysUntil ?? 999;
      let label = "Later";
      if (d === 0) label = "Airing Today";
      else if (d === 1) label = "Tomorrow";
      else if (d < 7) label = "This Week";
      else if (d < 30) label = "This Month";

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    const order = ["Airing Today", "Tomorrow", "This Week", "This Month", "Later"];
    return order.map(label => ({ label, items: groups[label] || [] })).filter(g => g.items.length > 0);
  }, [activeTab, currentData]);

  return (
    <div className="pt-24 px-4 md:px-12 pb-20 min-h-screen max-w-7xl mx-auto">
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="p-4 bg-red-600/10 rounded-3xl border border-red-500/20">
                <Calendar className="w-10 h-10 text-red-600" />
             </div>
             <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-widest uppercase">UPCOMING</h1>
                <p className="text-gray-500 font-bold tracking-[0.3em] uppercase text-[10px]">Entertainment Radar</p>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {activeTab === 'schedule' && (
             <button
               onClick={handleRefreshSchedule}
               disabled={refreshing}
               className="p-4 bg-white/5 border border-white/5 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
               title="Refresh Schedule"
             >
               <RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} />
             </button>
           )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12 sticky top-20 z-40 bg-[#141414]/90 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <HorizontalScrollContainer className="w-full lg:max-w-2xl pb-2 lg:pb-0">
          {[
            { id: 'schedule', label: 'My Schedule', icon: Clock },
            { id: 'movies', label: 'Movies', icon: Film },
            { id: 'series', label: 'TV Series', icon: Tv },
            { id: 'anime', label: 'Anime', icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-shrink-0 flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-500 ${activeTab === tab.id
                ? 'bg-red-600 text-white scale-105 shadow-[0_0_40px_-5px_rgba(220,38,38,0.5)]'
                : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </HorizontalScrollContainer>

        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
          {[
            { id: 'all', label: 'ALL TIME' },
            { id: 'week', label: 'THIS WEEK' },
            { id: 'month', label: 'THIS MONTH' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id as DateFilter)}
              className={`px-5 py-2 rounded-xl text-[9px] font-black tracking-widest transition-all duration-300 ${dateFilter === f.id ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500 bg-red-900/5 rounded-[3rem] border border-red-500/10 p-12">
           <AlertTriangle className="w-20 h-20 text-red-600 mb-8 animate-bounce" />
           <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">Radar Offline</h3>
           <p className="text-gray-500 font-bold max-w-sm mb-10">We're having trouble connecting to the broadcast satellite.</p>
           <button
             onClick={loadData}
             className="flex items-center gap-3 px-10 py-5 bg-red-600 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all hover:scale-110 active:scale-95 shadow-2xl"
           >
             <RefreshCw className="w-5 h-5" />
             Reload Signal
           </button>
        </div>
      ) : loading && currentData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 gap-8">
          <div className="relative">
             <Loader className="w-16 h-16 animate-spin text-red-600" />
             <div className="absolute inset-0 blur-2xl bg-red-600/30 animate-pulse" />
          </div>
          <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-xs">Syncing Upcoming Data</p>
        </div>
      ) : (
        <div className="space-y-16 animate-in slide-in-from-bottom-5 duration-700">
          {currentData.length === 0 ? (
            <div className="text-center py-40 bg-white/2 rounded-[3.5rem] border border-dashed border-white/5 flex flex-col items-center">
              <div className="p-10 bg-white/5 rounded-full mb-8">
                <Calendar className="w-16 h-16 text-gray-700" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Nothing on the Horizon</h3>
              <p className="text-gray-600 font-bold max-w-md uppercase text-[10px] tracking-widest">
                {activeTab === 'schedule'
                  ? "Follow more series to track their upcoming release dates here."
                  : "No releases found for the selected timeframe."}
              </p>
            </div>
          ) : activeTab === 'schedule' ? (
            groupedSchedule.map(group => (
              <div key={group.label} className="space-y-8 animate-in fade-in duration-1000">
                <div className="flex items-center gap-6 px-4">
                  <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse" />
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase italic">{group.label}</h3>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  <span className="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase">{group.items.length} TITLES</span>
                </div>
                <div className="flex flex-wrap gap-8 justify-center md:justify-start">
                  {group.items.map(item => (
                    <UpcomingCard
                      key={`schedule-${item.id}`}
                      item={item}
                      onClick={onResultClick}
                      isInWatchlist={isInWatchlist(item.id)}
                      onToggleWatchlist={handleToggleWatchlist}
                      isWatched={isWatched(item.id)}
                      onToggleWatched={handleToggleWatched}
                      isMySchedule={true}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-wrap gap-8 justify-center md:justify-start">
              {currentData.map(item => (
                <UpcomingCard
                  key={`upcoming-${item.id}`}
                  item={item}
                  onClick={onResultClick}
                  isInWatchlist={isInWatchlist(item.id)}
                  onToggleWatchlist={handleToggleWatchlist}
                  isWatched={isWatched(item.id)}
                  onToggleWatched={handleToggleWatched}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(UpcomingDashboard);