import React, { useEffect, useMemo, useCallback } from 'react';
import Hero from '@/components/Hero';
import ContentCard from '@/components/ContentCard';
import ContentRow from '@/components/ContentRow';
import HorizontalScrollContainer from '@/components/HorizontalScrollContainer';
import { AppErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';
import AiringScheduleRow from '@/components/home/AiringScheduleRow';
import NewSeasonsRow from '@/components/home/NewSeasonsRow';
import UpNextRow from '@/components/home/UpNextRow';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { MediaItem, WatchedItem } from '@/types';
import {
    fetchTrendingMovies,
    fetchTrendingSeries,
    fetchTrendingAnime,
    fetchTopRatedMovies,
    fetchTopRatedSeries,
    fetchTopRatedAnime,
    fetchRecommendationPool
} from '@/services/tmdb';
import { buildUserTaste, scoreItem } from '@/lib/recommendationEngine';
import { Sparkles } from 'lucide-react';


interface HomeProps {
    heroItems: MediaItem[];
    continueWatchingItems: MediaItem[];
    watched: WatchedItem[];
    watchlist?: any[];
    loadingHero: boolean;
    heroError?: boolean;
    loadHero: () => void;
    setSelectedContent: (item: MediaItem, episodeId?: string) => void;
    isInWatchlist: (id: string) => boolean;
    toggleWatchlist: (e: React.MouseEvent, id: string) => void;
    isWatched: (id: string) => boolean;
    toggleWatched: (e: React.MouseEvent, id: string) => void;
    updateCache: (items: MediaItem[]) => void;
    excludedIds: Set<string>;
    userEmail?: string;
}

export const Home: React.FC<HomeProps> = ({
    heroItems,
    continueWatchingItems,
    watched,
    watchlist = [],
    loadingHero,
    heroError,
    loadHero,
    setSelectedContent,
    isInWatchlist,
    toggleWatchlist,
    isWatched,
    toggleWatched,
    updateCache,
    excludedIds,
    userEmail
}) => {
    const filteredHeroItems = useMemo(() => {
        const filtered = heroItems.filter(item => !isWatched(item.id));
        // Fallback: If EVERYTHING is watched, show the original trending list anyway
        if (heroItems.length > 0 && filtered.length === 0) return heroItems;
        return filtered;
    }, [heroItems, isWatched]);

    // ✅ Wrap fetchRecommendations in useCallback to prevent unnecessary re-renders
    const fetchRecommendations = useCallback(async () => {
        if (!userEmail) return [];
        // Profile taste and fetch source pool in parallel
        const [pool, taste] = await Promise.all([
            fetchRecommendationPool(),
            buildUserTaste(userEmail)
        ]);

        return pool
            .map(item => ({ item, score: scoreItem(item, taste, excludedIds) }))
            .filter(res => res.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(res => res.item);
    }, [userEmail, excludedIds]);

    return (
        <>
            {(loadingHero && filteredHeroItems.length === 0) ? (
                <SkeletonHero />
            ) : (heroError && filteredHeroItems.length === 0) ? (
                <div className="h-[60vh] md:h-[80vh] flex flex-col items-center justify-center text-white bg-[#0a0a0a] relative overflow-hidden border-b border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent z-10" />
                    <div className="relative z-20 flex flex-col items-center gap-6 p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="bg-red-600/10 p-8 rounded-full border border-red-600/20 shadow-2xl shadow-red-900/10">
                            <AlertTriangle className="w-16 h-16 text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black tracking-tight drop-shadow-xl">Could not load featured content</h2>
                            <p className="text-gray-400 max-w-sm text-sm font-medium leading-relaxed">TMDB services are currently experiencing issues or your connection is unstable.</p>
                        </div>
                        <button
                            onClick={loadHero}
                            className="flex items-center gap-3 px-10 py-3.5 bg-white text-black rounded-full font-black hover:bg-gray-200 transition-all active:scale-95 shadow-xl group"
                        >
                            <RefreshCw className={`w-5 h-5 transition-transform duration-500 group-hover:rotate-180 ${loadingHero ? 'animate-spin' : ''}`} />
                            {loadingHero ? 'Retrying...' : 'Try Again'}
                        </button>
                    </div>
                </div>
            ) : filteredHeroItems.length > 0 ? (
                <Hero
                    items={filteredHeroItems.slice(0, 5)}
                    onMoreInfo={setSelectedContent}
                    isInWatchlist={isInWatchlist}
                    onToggleWatchlist={toggleWatchlist}
                    isWatched={isWatched}
                    onToggleWatched={toggleWatched}
                />
            ) : null}

            <div className="relative z-10 -mt-16 md:-mt-24 space-y-12 pb-12">
                <div className="px-4 md:px-12">
                    <div className="flex items-center gap-2 mb-4 text-gray-300">
                        <h2 className="text-xl md:text-2xl font-bold text-white">Currently Airing Episodes</h2>
                    </div>
                    <ErrorBoundary variant="row">
                        <AiringScheduleRow 
                            setSelectedContent={setSelectedContent}
                            isInWatchlist={isInWatchlist}
                            toggleWatchlist={toggleWatchlist}
                            isWatched={isWatched}
                            toggleWatched={toggleWatched}
                        />
                    </ErrorBoundary>
                </div>

                <div className="px-4 md:px-12">
                    <div className="flex items-center gap-2 mb-4 text-gray-300">
                        <h2 className="text-xl md:text-2xl font-bold text-white">New Seasons</h2>
                    </div>
                    <ErrorBoundary variant="row" resetKeys={[watched.length]}>
                        <NewSeasonsRow 
                            watched={watched}
                            watchlist={watchlist}
                            setSelectedContent={setSelectedContent}
                            isInWatchlist={isInWatchlist}
                            toggleWatchlist={toggleWatchlist}
                            isWatched={isWatched}
                            toggleWatched={toggleWatched}
                        />
                    </ErrorBoundary>
                </div>

                <UpNextRow 
                    onCardClick={setSelectedContent}
                    isInWatchlist={isInWatchlist}
                    onToggleWatchlist={toggleWatchlist}
                    isWatched={isWatched}
                    onToggleWatched={toggleWatched}
                />

                {continueWatchingItems.length > 0 && (
                    <div className="px-4 md:px-12">
                        <div className="flex items-center gap-2 mb-4 text-gray-300">
                            <Clock className="w-5 h-5" />
                            <h2 className="text-xl md:text-2xl font-bold text-white">Continue Watching</h2>
                        </div>
                        <HorizontalScrollContainer>
                            {continueWatchingItems.map(item => (
                                <div key={`cw-key-${item.id}`} className="snap-start">
                                    <ContentCard
                                        item={item}
                                        onClick={setSelectedContent}
                                        isInWatchlist={isInWatchlist(item.id)}
                                        onToggleWatchlist={toggleWatchlist}
                                        isWatched={isWatched(item.id)}
                                        onToggleWatched={toggleWatched}
                                        progress={item.progress}
                                    />
                                </div>
                            ))}
                            <div className="w-12 flex-shrink-0"></div>
                        </HorizontalScrollContainer>
                    </div>
                )}

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="For You"
                        icon={<Sparkles className="w-5 h-5 text-yellow-500" />}
                        fetchStrategy={fetchRecommendations}
                        onCardClick={setSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={toggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={toggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Trending Movies"
                        fetchStrategy={fetchTrendingMovies}
                        onCardClick={setSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={toggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={toggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Trending Series"
                        fetchStrategy={fetchTrendingSeries}
                        onCardClick={setSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={toggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={toggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Trending Anime"
                        fetchStrategy={fetchTrendingAnime}
                        onCardClick={setSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={toggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={toggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Top Movies"
                        fetchStrategy={fetchTopRatedMovies}
                        onCardClick={setSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={toggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={toggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Top Series"
                        fetchStrategy={fetchTopRatedSeries}
                        onCardClick={setSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={toggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={toggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Top Animes"
                        fetchStrategy={fetchTopRatedAnime}
                        onCardClick={setSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={toggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={toggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>
            </div>
        </>
    );
};

const SkeletonHero = () => (
    <div className="relative h-[80vh] md:h-[90vh] w-full bg-[#141414] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent z-10" />
        <div className="absolute bottom-32 left-12 space-y-6 w-full max-w-2xl z-20 p-4">
            <div className="bg-white/5 h-6 w-24 rounded-md animate-pulse" />
            <div className="bg-white/5 h-16 w-3/4 rounded-xl animate-pulse" />
            <div className="space-y-2">
                <div className="bg-white/5 h-4 w-1/2 rounded animate-pulse" />
                <div className="bg-white/5 h-4 w-2/3 rounded animate-pulse" />
            </div>
            <div className="flex gap-4">
                <div className="bg-white h-12 w-40 rounded animate-pulse" />
                <div className="bg-white/10 h-12 w-40 rounded animate-pulse" />
            </div>
        </div>
    </div>
);