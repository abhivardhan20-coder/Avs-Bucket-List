import React, { useMemo, useRef, useState, useDeferredValue, useTransition, useCallback, Suspense } from 'react';
import { useLibrary } from '../../contexts/AppContext';
import { Download, X, Loader, User, Film, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import TimeSpentCard from './TimeSpentCard';
import CategoryDistribution from './CategoryDistribution';
import Achievements from './Achievements';
import ContentCard from '../ContentCard';
import ContentModal from '../ContentModal';
import { MediaItem, MediaType } from '@/types';
import { fetchPersonCredits, hydrateSeries } from '@/services/tmdb';
import { fetchMediaItem } from '@/lib/api/mediaFetcher';
import { StatsExportData, exportStats } from '@/lib/statsExport';
import {
  calculateTimeStats,
  getGenreBreakdown,
  getCategoryDistribution,
  getTopPeople,
  getActivityTimeline,
  checkAchievements
} from './StatsHelpers';

// ✅ OPTIMIZATION: Lazy load heavy chart components to improve initial render
// These charts render expensive D3/Canvas visualizations, so deferring helps
const GenrePieChart = React.lazy(() => import('./GenrePieChart'));
const TopPeopleChart = React.lazy(() => import('./TopPeopleChart'));
const ActivityTimeline = React.lazy(() => import('./ActivityTimeline'));

// ✅ Lightweight loading skeleton for chart placeholders
const ChartSkeleton = () => (
  <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-12 flex items-center justify-center h-96 animate-pulse">
    <div className="text-center space-y-4">
      <Loader className="w-12 h-12 text-gray-600 animate-spin mx-auto" />
      <p className="text-xs font-black text-gray-700 uppercase tracking-widest">Rendering Chart...</p>
    </div>
  </div>
);

const INITIAL_VISIBLE_COUNT = 15;
const LOAD_MORE_BATCH = 15;

const StatsDashboard: React.FC = () => {
  const { watched, isInWatchlist, addToWatchlist, removeFromWatchlist, isWatched, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries } = useLibrary();
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Heavy computations wrapped in useTransition for buttery-smooth UI
  const [isPending, startTransition] = useTransition();

  // State Management
  const [selectedPerson, setSelectedPerson] = useState<{ name: string; role: 'actor' | 'director' } | null>(null);
  const [allPersonCredits, setAllPersonCredits] = useState<MediaItem[]>([]);
  const [visiblePersonCredits, setVisiblePersonCredits] = useState<MediaItem[]>([]);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [creditsError, setCreditsError] = useState(false);
  const [selectedContent, setSelectedContent] = useState<MediaItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  // React 19: Higher priority deferred value for smoother UI
  const deferredWatched = useDeferredValue(watched);

  // Memoize heavy calculations using the deferred value
  const timeStats = useMemo(() => calculateTimeStats(deferredWatched), [deferredWatched]);
  const genreData = useMemo(() => getGenreBreakdown(deferredWatched), [deferredWatched]);
  const categoryCounts = useMemo(() => getCategoryDistribution(deferredWatched), [deferredWatched]);
  const personaStats = useMemo(() => getTopPeople(deferredWatched), [deferredWatched]);
  const timelineData = useMemo(() => getActivityTimeline(deferredWatched), [deferredWatched]);
  const achievements = useMemo(() => checkAchievements(deferredWatched), [deferredWatched]);

  const showToast = useCallback((message: string, type: 'error' | 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleDownload = async () => {
    if (!downloading) {
      setDownloading(true);
      try {
        const exportData: StatsExportData = {
          title: "AV's Bucket List Stats",
          exportDate: new Date().toISOString(),
          summary: {
            totalTitles: deferredWatched.length,
            totalHours: timeStats.hours,
            totalMinutes: timeStats.totalMinutes % 60,
            movies: categoryCounts.movies,
            series: categoryCounts.series,
            anime: categoryCounts.anime,
          },
          genreBreakdown: genreData.map(g => ({ name: g.name, count: g.value })),
          topActors: personaStats.topActors.map(a => ({ name: a.name, count: a.count })),
          topDirectors: personaStats.topDirectors.map(d => ({ name: d.name, count: d.count })),
          activityTimeline: timelineData.map(t => ({ month: t.name, count: t.count })),
        };
        await exportStats(exportData, 'csv');
        showToast("Stats exported as CSV!", "success");
      } catch (e) {
        console.error("Failed to export stats", e);
        showToast("Failed to export stats.", "error");
      } finally {
        setDownloading(false);
      }
    }
  };

  const handlePersonClick = async (name: string, role: 'actor' | 'director') => {
    // Start transition for UI responsiveness
    startTransition(() => {
      setSelectedPerson({ name, role });
      setLoadingCredits(true);
      setCreditsError(false);
      setAllPersonCredits([]);
      setVisiblePersonCredits([]);
    });

    try {
      const credits = await fetchPersonCredits(name, role);
      if (credits === null) throw new Error("Fetch failed");

      startTransition(() => {
        setAllPersonCredits(credits);
        setVisiblePersonCredits(credits.slice(0, INITIAL_VISIBLE_COUNT));
        setLoadingCredits(false);
      });
    } catch (e) {
      console.error("Failed to fetch credits", e);
      setCreditsError(true);
      setLoadingCredits(false);
      showToast("Radar failed to lock onto filmography.", "error");
    }
  };

  const loadMoreCredits = useCallback(() => {
    if (loadingCredits || visiblePersonCredits.length >= allPersonCredits.length) return;
    
    startTransition(() => {
      const nextBatch = allPersonCredits.slice(
        visiblePersonCredits.length,
        visiblePersonCredits.length + LOAD_MORE_BATCH
      );
      setVisiblePersonCredits(prev => [...prev, ...nextBatch]);
    });
  }, [loadingCredits, visiblePersonCredits.length, allPersonCredits]);

  const handleToggleWatchlist = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = allPersonCredits.find(i => i.id === id);
    if (!item) return;
    if (isInWatchlist(id)) removeFromWatchlist(id);
    else addToWatchlist(item);
  }, [allPersonCredits, isInWatchlist, removeFromWatchlist, addToWatchlist]);

  const handleToggleWatched = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = allPersonCredits.find(i => i.id === id);
    if (!item) return;

    // ✅ OPTIMIZATION: Early return for unmark (synchronous)
    if (isWatched(id)) {
      if (item.type === MediaType.Movie) unmarkMovie(item);
      else unmarkSeries(item);
      return;
    }

    // ✅ OPTIMIZATION: Use async work outside, then startTransition for state updates
    setIsProcessing(true);
    const updateWatchedStatus = async () => {
      try {
        let fullItem = item;
        
        // ✅ OPTIMIZATION: Only fetch details if runtime is missing
        if (!item.runtime) {
          try {
            const details = await fetchMediaItem(
              item.id,
              item.type === MediaType.Movie ? 'movie' : 'tv',
              (item.type as any) === MediaType.Anime
            );
            if (details) fullItem = { ...item, ...details } as MediaItem;
          } catch (e) {
            console.warn("Failed to fetch media details, using cached data", e);
          }
        }

        // Hydrate series data if needed
        let finalItem = fullItem;
        if (fullItem.type !== MediaType.Movie) {
          finalItem = await hydrateSeries(fullItem);
        }

        startTransition(() => {
          if (finalItem.type === MediaType.Movie) {
            markMovieAsWatched(finalItem);
          } else {
            markSeriesAsWatched(finalItem);
          }
        });
      } catch (error) {
        console.error("Failed to update watched status:", error);
        showToast("Interstellar update failed.", "error");
      } finally {
        setIsProcessing(false);
      }
    };
    
    updateWatchedStatus();
  }, [allPersonCredits, isWatched, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries, showToast]);

  if (deferredWatched.length === 0) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-12 text-center pt-24 animate-in fade-in duration-1000 bg-[#0a0a0a]">
        <div className="p-12 bg-white/2 rounded-[4rem] border border-dashed border-white/5 max-w-2xl">
           <div className="p-8 bg-white/5 rounded-full mb-10 inline-block">
              <Film className="w-20 h-20 text-gray-800" />
           </div>
           <h2 className="text-5xl font-black text-white mb-6 uppercase tracking-tighter">DATA UNAVAILABLE</h2>
           <p className="text-gray-500 font-bold text-lg mb-12 uppercase tracking-widest leading-relaxed">
             Sync your orbital watch-log to generate deep-space analytics of your journey.
           </p>
           <button className="px-10 py-5 bg-white text-black font-black uppercase text-xs tracking-[0.4em] rounded-full hover:scale-110 transition-transform active:scale-95 shadow-[0_0_50px_-10px_rgba(255,255,255,0.4)]">
              INITIALIZE SYNC
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`pt-24 px-4 md:px-12 pb-20 max-w-[1400px] mx-auto animate-in fade-in duration-1000 relative ${isPending ? 'grayscale-[0.5] opacity-60' : ''}`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-12 left-1/2 transform -translate-x-1/2 px-10 py-5 rounded-3xl shadow-2xl z-[300] flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500 border-2 ${toast.type === 'error' ? 'bg-red-950 border-red-500 text-red-500' : 'bg-green-950 border-green-500 text-green-500'} backdrop-blur-3xl`}>
          {toast.type === 'error' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          <span className="font-black uppercase tracking-widest text-xs">{toast.message}</span>
        </div>
      )}

      {isPending && (
         <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 flex items-center gap-3 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,1)]" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Processing Quantum Data...</span>
         </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 mb-20">
        <div>
           <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-1 bg-red-600 rounded-full" />
              <p className="text-red-500 font-black tracking-[0.5em] text-[10px] mt-1 uppercase">Advanced User Analytics</p>
           </div>
           <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/20 tracking-tighter mb-4">
            MY STATS
          </h1>
          <p className="text-gray-500 font-bold max-w-xl text-lg uppercase tracking-widest">A visualized journey through your entertainment universe.</p>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-4 bg-white text-black px-10 py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-gray-200 transition-all self-start shadow-[0_30px_60px_-20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {downloading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {downloading ? 'EXPORTING...' : 'EXPORT STATS'}
        </button>
      </div>

      <div ref={dashboardRef} className="space-y-12 bg-[#0a0a0a] p-2 md:p-6 rounded-[3rem] stats-container transition-all">
        <TimeSpentCard stats={timeStats} />
        <CategoryDistribution counts={categoryCounts} />
        
        {/* ✅ OPTIMIZATION: Grid with lazy-loaded heavy charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Genre Pie Chart - lazy loaded with Suspense boundary */}
          <Suspense fallback={<ChartSkeleton />}>
            <GenrePieChart data={genreData} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <ActivityTimeline data={timelineData} />
          </Suspense>
        </div>

        {/* ✅ OPTIMIZATION: Lazy load people charts to defer expensive renders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Suspense fallback={<ChartSkeleton />}>
            <TopPeopleChart
              data={personaStats.topActors}
              title="Top Actors"
              color="#ef4444"
              onBarClick={(name) => handlePersonClick(name, 'actor')}
            />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <TopPeopleChart
              data={personaStats.topDirectors}
              title="Top Directors"
              color="#a855f7"
              onBarClick={(name) => handlePersonClick(name, 'director')}
            />
          </Suspense>
        </div>

        <Achievements items={achievements} />
        
        <div className="pt-20 text-center">
           <div className="inline-block px-10 py-4 bg-white/5 rounded-full border border-white/5 mb-6">
              <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.8em]">AV'S BUCKET LIST PREMIA</span>
           </div>
        </div>
      </div>

      {/* Person Filmography Overlay */}
      {selectedPerson && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setSelectedPerson(null)} />
          
          <div className="relative w-full max-w-7xl h-full max-h-[90vh] bg-[#0a0a0a] rounded-[4rem] border border-white/10 shadow-[0_0_120px_-30px_rgba(255,0,0,0.3)] overflow-hidden flex flex-col animate-in slide-in-from-bottom-20 duration-700">
            {isProcessing && (
              <div className="absolute inset-0 z-[300] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center gap-6">
                <div className="relative">
                   <Loader className="w-20 h-20 text-red-600 animate-spin" />
                   <div className="absolute inset-0 blur-3xl bg-red-600/20 animate-pulse" />
                </div>
                <p className="text-white font-black uppercase tracking-[0.5em] text-sm italic">SYNCHRONIZING LIBRARY...</p>
              </div>
            )}

            <div className="p-10 md:p-16 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/5 via-transparent to-transparent">
               <div className="flex items-center gap-10">
                  <div className={`p-8 rounded-[2.5rem] ${selectedPerson.role === 'actor' ? 'bg-red-600/10 text-red-600' : 'bg-purple-600/10 text-purple-600'} border border-white/5 shadow-2xl`}>
                    {selectedPerson.role === 'actor' ? <User className="w-12 h-12" /> : <Film className="w-12 h-12" />}
                  </div>
                  <div>
                    <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2 italic uppercase">{selectedPerson.name}</h3>
                    <p className="text-gray-600 font-black uppercase tracking-[0.6em] text-[10px]">
                      {selectedPerson.role === 'actor' ? 'STAR-STUDDED FILMOGRAPHY' : 'LEGENDARY DIRECTOR COLLECTION'}
                    </p>
                  </div>
               </div>
               <button
                 onClick={() => setSelectedPerson(null)}
                 className="p-6 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all border border-white/5 group hover:scale-110 active:scale-95"
               >
                 <X className="w-10 h-10 group-hover:rotate-90 transition-transform duration-500" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 md:p-16 no-scrollbar custom-scrollbar">
               {loadingCredits && visiblePersonCredits.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center gap-8">
                    <Loader className="w-16 h-16 text-red-600 animate-spin" />
                    <p className="text-gray-600 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Scanning Global Database...</p>
                 </div>
               ) : creditsError ? (
                 <div className="h-full flex flex-col items-center justify-center gap-10 text-center">
                    <div className="p-10 bg-red-950/20 border-2 border-red-500/10 rounded-full">
                       <AlertCircle className="w-20 h-20 text-red-600" />
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-3xl font-black text-white uppercase italic tracking-tighter">Signal Interference</h4>
                       <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Failed to establish a secure link with the filmography servers.</p>
                    </div>
                    <button
                      onClick={() => handlePersonClick(selectedPerson.name, selectedPerson.role)}
                      className="px-10 py-5 bg-red-600 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all hover:scale-110"
                    >
                      Attempt Reconnection
                    </button>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
                    {visiblePersonCredits.map((item) => (
                      <ContentCard
                        key={`person-credit-${item.id}`}
                        item={item}
                        onClick={setSelectedContent}
                        isInWatchlist={isInWatchlist(item.id)}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched(item.id)}
                        onToggleWatched={handleToggleWatched}
                      />
                    ))}
                    {visiblePersonCredits.length < allPersonCredits.length && (
                      <button 
                        onClick={loadMoreCredits}
                        className="aspect-[2/3] flex flex-col items-center justify-center bg-white/2 rounded-2xl border border-dashed border-white/10 hover:bg-white/5 hover:border-white/20 transition-all duration-500 group"
                      >
                         <div className="p-4 bg-white/5 rounded-full mb-4 group-hover:scale-125 transition-transform duration-500">
                            <RefreshCw className="w-8 h-8 text-gray-700" />
                         </div>
                         <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Load More Works</span>
                      </button>
                    )}
                 </div>
               )}
            </div>

            <div className="p-10 border-t border-white/5 bg-black/40 flex justify-between items-center h-24">
               <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">Tracking {visiblePersonCredits.length} of {allPersonCredits.length} recognized works</p>
               <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse transition-all" />
                  <div className="w-2 h-2 rounded-full bg-gray-900" />
                  <div className="w-2 h-2 rounded-full bg-gray-900" />
               </div>
            </div>
          </div>
        </div>
      )}

      {selectedContent && (
        <ContentModal
          item={selectedContent}
          isOpen={!!selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  );
};

export default React.memo(StatsDashboard);