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

/** Horizontal scroll section for a category */
const CategoryRow: React.FC<{
    title: string;
    items: MediaItem[];
    color: string;
    glowColor: string;
    isExpanded: boolean;
    onToggle: () => void;
    setSelectedContent: (item: MediaItem) => void;
    isInWatchlist: (id: string) => boolean;
    toggleWatchlist: (e: React.MouseEvent, id: string) => void;
    toggleWatched: (e: React.MouseEvent, id: string) => void;
}> = ({ title, items, color, glowColor, isExpanded, onToggle, setSelectedContent, isInWatchlist, toggleWatchlist, toggleWatched }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = React.useState(0);

    React.useEffect(() => {
        if (!isExpanded || !containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            if (entries[0]) setContainerWidth(entries[0].contentRect.width);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isExpanded]);

    if (items.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-6 px-4">
                <div className={`h-10 w-2 ${color} rounded-full`} style={{ boxShadow: `0 0 20px ${glowColor}` }} />
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{title}</h3>
                <span className="text-gray-600 font-bold">({items.length})</span>
                <button onClick={onToggle} className="ml-auto px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-black uppercase transition-all">
                    {isExpanded ? 'COLLAPSE' : 'EXPAND'}
                </button>
            </div>
            {isExpanded && (
                <div ref={containerRef} className="min-h-[300px] md:min-h-[380px] w-full overflow-hidden">
                    <List
                        height={380}
                        itemCount={items.length}
                        itemSize={window.innerWidth < 768 ? 176 : 216} // card width + gap
                        layout="horizontal"
                        width={containerWidth || (window.innerWidth - 32)}
                        className="no-scrollbar"
                    >
                        {({ index, style }) => (
                            <div style={{ ...style, paddingRight: '16px' }} className="snap-start">
                                <ContentCard
                                    item={items[index]}
                                    onClick={() => setSelectedContent(items[index])}
                                    isWatched={true}
                                    isInWatchlist={isInWatchlist(items[index].id)}
                                    onToggleWatchlist={(e) => toggleWatchlist(e, items[index].id)}
                                    onToggleWatched={(e) => toggleWatched(e, items[index].id)}
                                />
                            </div>
                        )}
                    </List>
                </div>
            )}
        </div>
    );
};

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
                <div className="animate-in slide-in-from-bottom-5 duration-500 pb-32">
                    <VirtualList
                        items={watchedItems}
                        itemHeight={320}
                        containerHeight={Math.max(400, window.innerHeight - 140)}
                        renderItem={(item) => (
                            <div key={item.id} className="px-4">
                                <ContentCard
                                    item={item}
                                    onClick={() => setSelectedContent(item)}
                                    isWatched={true}
                                    isInWatchlist={isInWatchlist(item.id)}
                                    onToggleWatchlist={(e) => toggleWatchlist(e, item.id)}
                                    onToggleWatched={(e) => toggleWatched(e, item.id)}
                                />
                            </div>
                        )}
                    />
                </div>
            )}
        </div>
    );
});