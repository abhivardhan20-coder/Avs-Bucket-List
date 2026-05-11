import React, { useState } from 'react';
import { Clock, Film, Tv, PenTool } from 'lucide-react';
import { FilterBar } from '@/components/FilterBar';
import HorizontalScrollContainer from '@/components/HorizontalScrollContainer';
import ContentCard from '@/components/ContentCard';
import { MediaItem, MediaType } from '@/types';
import { VirtualList } from '@/lib/virtualization';
import WatchBreakdownModal from '@/components/stats/WatchBreakdownModal';

interface WatchedProps {
    watchedGroups: {
        movies: MediaItem[];
        series: MediaItem[];
        anime: MediaItem[];
    };
    dashboardStats: {
        hours: number;
        minutes: number;
        movieCount: number;
        seriesCount: number;
        animatedCount: number;
        totalTitles: number;
        hoursMovies: number;
        minutesMovies: number;
        hoursSeries: number;
        minutesSeries: number;
        hoursAnime: number;
        minutesAnime: number;
    };
    filterType: 'All' | MediaType;
    setFilterType: (type: 'All' | MediaType) => void;
    filterYear: string;
    setFilterYear: (year: string) => void;
    filterGenre: string[];
    setFilterGenre: (genres: string[]) => void;
    expandedSections: { movies: boolean; series: boolean; anime: boolean };
    toggleSection: (section: 'movies' | 'series' | 'anime') => void;
    setSelectedContent: (item: MediaItem) => void;
    isInWatchlist: (id: string) => boolean;
    toggleWatchlist: (e: React.MouseEvent, id: string) => void;
    isWatched: (id: string) => boolean;
    toggleWatched: (e: React.MouseEvent, id: string) => void;
    openStatsModal: (type: 'series' | 'anime' | 'movies') => void;
    isDbLoaded: boolean;
}


export const Watched: React.FC<WatchedProps> = React.memo(({
    watchedGroups,
    dashboardStats,
    filterType,
    setFilterType,
    filterYear,
    setFilterYear,
    filterGenre,
    setFilterGenre,
    expandedSections,
    toggleSection,
    setSelectedContent,
    isInWatchlist,
    toggleWatchlist,
    toggleWatched,
    openStatsModal,
    isDbLoaded
}) => {
    const [showTimePopup, setShowTimePopup] = useState(false);

    const watchedItems = React.useMemo(() => [
        ...watchedGroups.movies,
        ...watchedGroups.series,
        ...watchedGroups.anime
    ], [watchedGroups]);

    return (
        <div className="pt-32 px-4 md:px-12 min-h-screen max-w-[1600px] mx-auto animate-in fade-in duration-300">
            <div className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-1 bg-green-600 rounded-full" />
                       <p className="text-green-500 font-black tracking-[0.5em] text-[10px] uppercase mt-1">Archived Chronicles</p>
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-none">WATCHED</h2>
                    <p className="text-gray-500 font-bold text-lg mt-4 uppercase tracking-[0.2em]">The complete record of your digital odyssey.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {/* Total watch time card */}
                <div
                    className="bg-[#0f0f0f] border-2 border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-white/20 transition-all duration-500 cursor-pointer shadow-2xl"
                    onClick={() => setShowTimePopup(true)}
                >
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Total Watch Time</h3>
                        <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
                           <Clock className="w-5 h-5 text-gray-500 group-hover:text-white" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-4">
                        <span className="text-6xl font-black text-white tracking-tighter">{dashboardStats.hours}</span>
                        <span className="text-xs font-black text-gray-600 uppercase tracking-widest">HRS</span>
                        <span className="text-4xl font-black text-white tracking-tighter ml-4">{dashboardStats.minutes}</span>
                        <span className="text-xs font-black text-gray-600 uppercase tracking-widest">MIN</span>
                    </div>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">{dashboardStats.totalTitles} COMPLETED TITLES</p>
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/2 blur-[80px] rounded-full group-hover:bg-white/5 transition-all" />
                </div>

                {/* Categorical Breakdown Modal */}
                <WatchBreakdownModal
                    isOpen={showTimePopup}
                    onClose={() => setShowTimePopup(false)}
                    stats={{
                        hours: dashboardStats.hours,
                        minutes: dashboardStats.minutes,
                        hoursMovies: dashboardStats.hoursMovies,
                        minutesMovies: dashboardStats.minutesMovies,
                        hoursSeries: dashboardStats.hoursSeries,
                        minutesSeries: dashboardStats.minutesSeries,
                        hoursAnime: dashboardStats.hoursAnime,
                        minutesAnime: dashboardStats.minutesAnime,
                    }}
                />

                <div
                    className="bg-[#0f0f0f] border-2 border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-red-600/30 hover:bg-red-900/5 transition-all duration-500 cursor-pointer shadow-2xl"
                    onClick={() => openStatsModal('movies')}
                >
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] group-hover:text-red-400">Movies Watched</h3>
                        <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 group-hover:bg-red-600/20 transition-all">
                           <Film className="w-5 h-5 text-gray-500 group-hover:text-red-500" />
                        </div>
                    </div>
                    <div className="text-6xl font-black text-white mb-4 tracking-tighter">{dashboardStats.movieCount}</div>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] group-hover:text-red-300">FEATURE FILMS</p>
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-600 blur-[80px] rounded-full opacity-0 group-hover:opacity-10 transition-all" />
                </div>

                <div
                    className="bg-[#0f0f0f] border-2 border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-blue-600/30 hover:bg-blue-900/5 transition-all duration-500 cursor-pointer shadow-2xl"
                    onClick={() => openStatsModal('series')}
                >
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] group-hover:text-blue-400">Series Watched</h3>
                        <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 group-hover:bg-blue-600/20 transition-all">
                           <Tv className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
                        </div>
                    </div>
                    <div className="text-6xl font-black text-white mb-4 tracking-tighter">{dashboardStats.seriesCount}</div>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] group-hover:text-blue-300">SERIALIZED DRAMA</p>
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-600 blur-[80px] rounded-full opacity-0 group-hover:opacity-10 transition-all" />
                </div>

                <div
                    className="bg-[#0f0f0f] border-2 border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-purple-600/30 hover:bg-purple-900/5 transition-all duration-500 cursor-pointer shadow-2xl"
                    onClick={() => openStatsModal('anime')}
                >
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] group-hover:text-purple-400">Animes Watched</h3>
                        <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 group-hover:bg-purple-600/20 transition-all">
                           <PenTool className="w-5 h-5 text-gray-500 group-hover:text-purple-500" />
                        </div>
                    </div>
                    <div className="text-6xl font-black text-white mb-4 tracking-tighter">{dashboardStats.animatedCount}</div>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] group-hover:text-purple-300">ANIMATED MASTERPIECES</p>
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-600 blur-[80px] rounded-full opacity-0 group-hover:opacity-10 transition-all" />
                </div>
            </div>

            <div className="mb-12 sticky top-24 z-40 bg-[#0a0a0a]/80 backdrop-blur-3xl py-4 -mx-4 px-4 rounded-b-3xl">
                <FilterBar
                    selectedType={filterType} setSelectedType={setFilterType}
                    selectedYear={filterYear} setSelectedYear={setFilterYear}
                    selectedGenre={filterGenre} setSelectedGenre={setFilterGenre}
                />
            </div>

            {!isDbLoaded ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6">
                    <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em]">Retrieving Archives</p>
                </div>
            ) : watchedGroups.movies.length === 0 && watchedGroups.series.length === 0 && watchedGroups.anime.length === 0 ? (
                <div className="text-center py-40 bg-white/2 rounded-[4rem] border border-dashed border-white/5 animate-in fade-in duration-300">
                    <p className="text-gray-500 font-black uppercase tracking-widest italic">
                        {(filterType !== 'All' || filterYear !== 'All' || !filterGenre.includes('All'))
                            ? "No historical records for these coordinates."
                            : "Your library archive is currently empty."}
                    </p>
                </div>
            ) : (
                <div className="space-y-24 animate-in slide-in-from-bottom-5 duration-500 pb-32">
                    {/* MOVIES SECTION */}
                    {watchedGroups.movies.length > 0 && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-6 px-4">
                                <div className="h-10 w-2 bg-red-600 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)]" />
                                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">FEATURE FILMS</h3>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-red-600/20 to-transparent" />
                            </div>

                            <HorizontalScrollContainer>
                                {watchedGroups.movies.map((item) => (
                                    <div key={item.id} className="snap-start">
                                        <ContentCard
                                            item={item}
                                            onClick={() => setSelectedContent(item)}
                                            isWatched={true}
                                            isInWatchlist={isInWatchlist(item.id)}
                                            onToggleWatchlist={(e) => toggleWatchlist(e, item.id)}
                                            onToggleWatched={(e) => toggleWatched(e, item.id)}
                                        />
                                    </div>
                                ))}
                                <div className="w-12 flex-shrink-0"></div>
                            </HorizontalScrollContainer>
                        </div>
                    )}

                    {/* SERIES SECTION */}
                    {watchedGroups.series.length > 0 && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-6 px-4">
                                <div className="h-10 w-2 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)]" />
                                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">SERIALIZED DRAMA</h3>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-600/20 to-transparent" />
                            </div>

                            <HorizontalScrollContainer>
                                {watchedGroups.series.map((item) => (
                                    <div key={item.id} className="snap-start">
                                        <ContentCard
                                            item={item}
                                            onClick={() => setSelectedContent(item)}
                                            isWatched={true}
                                            isInWatchlist={isInWatchlist(item.id)}
                                            onToggleWatchlist={(e) => toggleWatchlist(e, item.id)}
                                            onToggleWatched={(e) => toggleWatched(e, item.id)}
                                        />
                                    </div>
                                ))}
                                <div className="w-12 flex-shrink-0"></div>
                            </HorizontalScrollContainer>
                        </div>
                    )}

                    {/* ANIME SECTION */}
                    {watchedGroups.anime.length > 0 && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-6 px-4">
                                <div className="h-10 w-2 bg-purple-600 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.6)]" />
                                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">ANIMATED MASTERPIECES</h3>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-purple-600/20 to-transparent" />
                            </div>

                            <HorizontalScrollContainer>
                                {watchedGroups.anime.map((item) => (
                                    <div key={item.id} className="snap-start">
                                        <ContentCard
                                            item={item}
                                            onClick={() => setSelectedContent(item)}
                                            isWatched={true}
                                            isInWatchlist={isInWatchlist(item.id)}
                                            onToggleWatchlist={(e) => toggleWatchlist(e, item.id)}
                                            onToggleWatched={(e) => toggleWatched(e, item.id)}
                                        />
                                    </div>
                                ))}
                                <div className="w-12 flex-shrink-0"></div>
                            </HorizontalScrollContainer>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});