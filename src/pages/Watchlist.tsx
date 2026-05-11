import React from 'react';
import { Plus } from 'lucide-react';
import { FilterBar } from '@/components/FilterBar';
import HorizontalScrollContainer from '@/components/HorizontalScrollContainer';
import ContentCard from '@/components/ContentCard';
import { MediaItem, MediaType } from '@/types';
import { VirtualList } from '@/lib/virtualization';

interface WatchlistProps {
    watchlistGroups: {
        movies: MediaItem[];
        series: MediaItem[];
        anime: MediaItem[];
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
    toggleWatchlist: (e: React.MouseEvent, id: string) => void;
    isWatched: (id: string) => boolean;
    toggleWatched: (e: React.MouseEvent, id: string) => void;
    onBrowseContent: () => void;
}

const isReleased = (item: MediaItem) => {
    if (!item.releaseDate) return false;
    const release = new Date(item.releaseDate);
    const now = new Date();
    release.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return !isNaN(release.getTime()) && release <= now;
};


export const Watchlist: React.FC<WatchlistProps> = React.memo(({
    watchlistGroups,
    filterType,
    setFilterType,
    filterYear,
    setFilterYear,
    filterGenre,
    setFilterGenre,
    setSelectedContent,
    toggleWatchlist,
    isWatched,
    toggleWatched,
    onBrowseContent
}) => {
    // Memoize split logic for performance
    const sections = React.useMemo(() => {
        const released = [
            ...watchlistGroups.movies.filter(isReleased),
            ...watchlistGroups.series.filter(isReleased),
            ...watchlistGroups.anime.filter(isReleased)
        ];
        const unreleased = [
            ...watchlistGroups.movies.filter(i => !isReleased(i)),
            ...watchlistGroups.series.filter(i => !isReleased(i)),
            ...watchlistGroups.anime.filter(i => !isReleased(i))
        ];

        return {
            released,
            unreleased,
            isEmpty: released.length + unreleased.length === 0
        };
    }, [watchlistGroups]);

    return (
        <div className="pt-32 px-4 md:px-12 min-h-screen max-w-[1600px] mx-auto animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-1 bg-red-600 rounded-full" />
                      <p className="text-red-500 font-black tracking-[0.5em] text-[10px] uppercase mt-1">Personal Collection</p>
                   </div>
                   <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic">MY LIST</h2>
                   <p className="text-gray-500 font-bold text-lg mt-2 uppercase tracking-widest">Future entertainment, reserved.</p>
                </div>
            </div>

            <div className="mb-12 sticky top-24 z-40">
                <FilterBar
                    selectedType={filterType} setSelectedType={setFilterType}
                    selectedYear={filterYear} setSelectedYear={setFilterYear}
                    selectedGenre={filterGenre} setSelectedGenre={setFilterGenre}
                />
            </div>

            {sections.isEmpty ? (
                <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[4rem] bg-white/2 animate-in fade-in duration-700">
                    <div className="inline-block p-10 bg-white/5 rounded-full mb-10 shadow-2xl">
                        <Plus className="w-16 h-16 text-gray-700" />
                    </div>
                    <p className="text-gray-500 text-xl font-bold uppercase tracking-widest mb-12">
                        {(filterType !== 'All' || filterYear !== 'All' || !filterGenre.includes('All'))
                            ? "No matches found in your radar range."
                            : "Your bucket list is currently clear."}
                    </p>
                    <button 
                        onClick={onBrowseContent} 
                        className="px-12 py-5 bg-white text-black font-black uppercase text-xs tracking-[0.4em] rounded-full hover:scale-110 transition-all active:scale-95 shadow-[0_0_50px_-10px_rgba(255,255,255,0.4)]"
                    >
                        EXPLORE UNIVERSE
                    </button>
                </div>
            ) : (
                <div className="space-y-24 animate-in slide-in-from-bottom-5 duration-500 pb-32">
                    {/* RELEASED SECTION */}
                    {sections.released.length > 0 && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-6 px-4">
                                <div className="h-10 w-2 bg-red-600 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)]" />
                                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">ALREADY RELEASED</h3>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-red-600/20 to-transparent" />
                            </div>

                            <HorizontalScrollContainer>
                                {sections.released.map((item) => (
                                    <div key={item.id} className="snap-start">
                                        <ContentCard
                                            item={item}
                                            onClick={() => setSelectedContent(item)}
                                            isInWatchlist={true}
                                            onToggleWatchlist={(e) => toggleWatchlist(e, item.id)}
                                            isWatched={isWatched(item.id)}
                                            onToggleWatched={(e) => toggleWatched(e, item.id)}
                                        />
                                    </div>
                                ))}
                                <div className="w-12 flex-shrink-0"></div>
                            </HorizontalScrollContainer>
                        </div>
                    )}

                    {/* UNRELEASED SECTION */}
                    {sections.unreleased.length > 0 && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-6 px-4">
                                <div className="h-10 w-2 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)]" />
                                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">ORBITAL INCOMING</h3>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-600/20 to-transparent" />
                            </div>

                            <HorizontalScrollContainer>
                                {sections.unreleased.map((item) => (
                                    <div key={item.id} className="snap-start">
                                        <ContentCard
                                            item={item}
                                            onClick={() => setSelectedContent(item)}
                                            isInWatchlist={true}
                                            onToggleWatchlist={(e) => toggleWatchlist(e, item.id)}
                                            isWatched={isWatched(item.id)}
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