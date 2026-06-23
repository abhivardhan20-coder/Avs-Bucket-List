'use client';

import React, { useMemo, useCallback } from 'react';
import Hero from '@/components/Hero';
import ContentCard from '@/components/ContentCard';
import ContentRow from '@/components/ContentRow';
import HorizontalScrollContainer from '@/components/HorizontalScrollContainer';
import { AppErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';
import AiringScheduleRow from '@/components/home/AiringScheduleRow';
import NewSeasonsRow from '@/components/home/NewSeasonsRow';
import UpNextRow from '@/components/home/UpNextRow';
import AIRecommendationsRow from '@/components/home/AIRecommendationsRow';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { MediaItem } from '@/types';
import {
    fetchTrendingMovies,
    fetchTrendingSeries,
    fetchTrendingAnime,
    fetchTopRatedMovies,
    fetchTopRatedSeries,
    fetchTopRatedAnime,
    fetchRecommendationPool
} from '@/services/tmdb';
import { recommendationEngine } from '@/lib/recommendationEngine';
import { Sparkles } from 'lucide-react';
import { useAuth, useWatchlist, useWatched } from '@/contexts/AppContext';
import { useUI } from '@/contexts/UIContext';
import { useTrending } from '@/hooks/useContentQueries';
import { MediaType } from '@/types';
import { useMediaToggles } from '@/hooks/useMediaToggles';

export default function Home() {
    const { user } = useAuth();
    const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
    const { watched, continueWatching, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries, isWatched } = useWatched();
    const { handleSetSelectedContent, setAppError } = useUI();

    const { handleToggleWatchlist, handleToggleWatched } = useMediaToggles();

    const { 
        data: heroItemsData, 
        isLoading: loadingHero, 
        isFetching: isFetchingHero,
        isError: heroError, 
        refetch: loadHero 
    } = useTrending(MediaType.Movie);
    const heroItems = useMemo(() => heroItemsData ?? [], [heroItemsData]);

    const isHeroLoading = loadingHero || (isFetchingHero && heroItems.length === 0);

    const continueWatchingItems = useMemo(() => {
        return continueWatching.map(item => ({
            ...item,
            progress: item.totalEpisodes > 0 ? (item.watchedEpisodes / item.totalEpisodes) * 100 : 0,
            posterUrl: item.posterUrl,
            backdropUrl: (item as unknown as { backdrop?: string }).backdrop || '',
            overview: (item as unknown as { overview?: string }).overview || ''
        })) as MediaItem[];
    }, [continueWatching]);

    const excludedIds = useMemo(() => {
        return new Set([
            ...watchlist.map(w => w.id),
            ...watched.map(w => w.id)
        ]);
    }, [watchlist, watched]);

    const updateCache = useCallback(() => {}, []);

    const filteredHeroItems = useMemo(() => {
        const filtered = heroItems.filter(item => !isWatched(item.id));
        if (heroItems.length > 0 && filtered.length === 0) return heroItems;
        return filtered;
    }, [heroItems, isWatched]);

    const fetchRecommendations = useCallback(async () => {
        if (!user?.email) return [];
        const pool = await fetchRecommendationPool();
        return recommendationEngine.getRecommendations(watched, watchlist, pool);
    }, [user?.email, watchlist, watched]);

    return (
        <>
            {(isHeroLoading && filteredHeroItems.length === 0) ? (
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
                            onClick={() => loadHero()}
                            className="flex items-center gap-3 px-10 py-3.5 bg-white text-black rounded-full font-black hover:bg-gray-200 transition-all active:scale-95 shadow-xl group"
                        >
                            <RefreshCw className={`w-5 h-5 transition-transform duration-500 group-hover:rotate-180 ${isHeroLoading ? 'animate-spin' : ''}`} />
                            {isHeroLoading ? 'Retrying...' : 'Try Again'}
                        </button>
                    </div>
                </div>
            ) : filteredHeroItems.length > 0 ? (
                <Hero
                    items={filteredHeroItems.slice(0, 5)}
                    onMoreInfo={handleSetSelectedContent}
                    isInWatchlist={isInWatchlist}
                    onToggleWatchlist={handleToggleWatchlist}
                    isWatched={isWatched}
                    onToggleWatched={handleToggleWatched}
                />
            ) : null}

            <div className="relative z-10 -mt-16 md:-mt-24 space-y-12 pb-12">
                <div className="px-4 md:px-12">
                    <div className="flex items-center gap-2 mb-4 text-gray-300">
                        <h2 className="text-xl md:text-2xl font-bold text-white">Currently Airing Episodes</h2>
                    </div>
                    <ErrorBoundary variant="row">
                        <AiringScheduleRow 
                            setSelectedContent={handleSetSelectedContent}
                            isInWatchlist={isInWatchlist}
                            toggleWatchlist={handleToggleWatchlist}
                            isWatched={isWatched}
                            toggleWatched={handleToggleWatched}
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
                            setSelectedContent={handleSetSelectedContent}
                            isInWatchlist={isInWatchlist}
                            toggleWatchlist={handleToggleWatchlist}
                            isWatched={isWatched}
                            toggleWatched={handleToggleWatched}
                        />
                    </ErrorBoundary>
                </div>

                <UpNextRow 
                    onCardClick={handleSetSelectedContent}
                    isInWatchlist={isInWatchlist}
                    onToggleWatchlist={handleToggleWatchlist}
                    isWatched={isWatched}
                    onToggleWatched={handleToggleWatched}
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
                                        onClick={handleSetSelectedContent}
                                        isInWatchlist={isInWatchlist(item.id)}
                                        onToggleWatchlist={handleToggleWatchlist}
                                        isWatched={isWatched(item.id)}
                                        onToggleWatched={handleToggleWatched}
                                        progress={item.progress}
                                    />
                                </div>
                            ))}
                            <div className="w-12 flex-shrink-0"></div>
                        </HorizontalScrollContainer>
                    </div>
                )}

                <ErrorBoundary variant="row">
                    <AIRecommendationsRow
                        watched={watched}
                        watchlist={watchlist}
                        onCardClick={handleSetSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={handleToggleWatched}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="For You"
                        icon={<Sparkles className="w-5 h-5 text-yellow-500" />}
                        fetchStrategy={fetchRecommendations}
                        onCardClick={handleSetSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={handleToggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Trending Movies"
                        fetchStrategy={fetchTrendingMovies}
                        onCardClick={handleSetSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={handleToggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Trending Series"
                        fetchStrategy={fetchTrendingSeries}
                        onCardClick={handleSetSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={handleToggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Trending Anime"
                        fetchStrategy={fetchTrendingAnime}
                        onCardClick={handleSetSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={handleToggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Top Movies"
                        fetchStrategy={fetchTopRatedMovies}
                        onCardClick={handleSetSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={handleToggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Top Series"
                        fetchStrategy={fetchTopRatedSeries}
                        onCardClick={handleSetSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={handleToggleWatched}
                        onDataFetched={updateCache}
                        excludedIds={excludedIds}
                    />
                </ErrorBoundary>

                <ErrorBoundary variant="row">
                    <ContentRow
                        title="Top Animes"
                        fetchStrategy={fetchTopRatedAnime}
                        onCardClick={handleSetSelectedContent}
                        isInWatchlist={isInWatchlist}
                        onToggleWatchlist={handleToggleWatchlist}
                        isWatched={isWatched}
                        onToggleWatched={handleToggleWatched}
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
