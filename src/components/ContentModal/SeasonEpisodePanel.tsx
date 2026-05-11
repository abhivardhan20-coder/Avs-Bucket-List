import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bookmark, Check, WifiOff, Loader, RefreshCw, Tv, Zap, Clock, Plus } from 'lucide-react';
import { MediaItem, Season, Episode } from '../../types';
import { useLibraryActions } from '../../contexts/LibraryProvider';
import { parseLocalDate } from '../../lib/dateUtils';
import OptimizedImage from '../OptimizedImage';

interface SeasonEpisodePanelProps {
  item: MediaItem;
  loadingDetails: boolean;
  expandedSeason: string | null;
  setExpandedSeason: (seasonId: string | null) => void;
  retryingSeasonId: string | null;
  handleRetrySeason: (season: Season) => void;
  userNextUp: { seasonId: string; episodeId: string } | null;
}

const EPISODE_PAGE_SIZE = 20;

const SeasonEpisodePanel: React.FC<SeasonEpisodePanelProps> = ({
  item,
  loadingDetails,
  expandedSeason,
  setExpandedSeason,
  retryingSeasonId,
  handleRetrySeason,
  userNextUp
}) => {
  const { 
    isEpisodeWatched, isEpisodeInWatchlist, isSeasonInWatchlist,
    toggleEpisodeInWatchlist, toggleSeasonInWatchlist,
    markEpisodeAsWatched, unmarkEpisode, markSeasonAsWatched, unmarkSeason
  } = useLibraryActions();

  const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({});

  const now = new Date();

  const handleEpisodeToggleWatched = async (e: React.MouseEvent, ep: Episode, season: Season) => {
    e.stopPropagation();
    await (isEpisodeWatched(item.id, ep.id)
      ? unmarkEpisode(item, season, ep)
      : markEpisodeAsWatched(item, season, ep));
  };

  const handleSeasonToggleWatched = async (e: React.MouseEvent, season: Season) => {
    e.stopPropagation();
    const airedEps = season.episodes?.filter(ep => !ep.airDate || new Date(ep.airDate) <= now) || [];

    if (airedEps.length === 0) return;

    const allAiredWatched = airedEps.length > 0 && airedEps.every(ep => isEpisodeWatched(item.id, ep.id));
    await (allAiredWatched ? unmarkSeason(item, season) : markSeasonAsWatched(item, season));
  };

  const showMoreEpisodes = (seasonId: string) => {
    setVisibleLimits(prev => ({
      ...prev,
      [seasonId]: (prev[seasonId] || EPISODE_PAGE_SIZE) + EPISODE_PAGE_SIZE
    }));
  };

  return (
    <div className="pt-2 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
        <h3 className="text-2xl font-black text-white tracking-tight">Episodes & Seasons</h3>
        <div className="text-sm text-gray-500 font-bold uppercase tracking-widest">{item.status}</div>
      </div>
      <div className="space-y-4 mb-12">
        {loadingDetails ? (
          <div className="space-y-6">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />)}</div>
        ) : (
          item.seasons?.map(season => {
            const seasonEpCount = season.episodeCount || season.episodes?.length || 0;
            const seasonWatchedCount = season.episodes?.filter(ep => isEpisodeWatched(item.id, ep.id)).length || 0;
            const airedEps = season.episodes?.filter(ep => !ep.airDate || new Date(ep.airDate) <= now) || [];
            const airedCount = airedEps.length;
            const isSeasonFull = airedCount > 0 && airedEps.every(ep => isEpisodeWatched(item.id, ep.id));
            const isSInWatchlist = isSeasonInWatchlist(item.id, season.id);
            
            const isAiringSeason = item.nextEpisode && season.number === item.nextEpisode.seasonNumber;
            const loadError = (season as any).loadError;

            const currentLimit = visibleLimits[season.id] || EPISODE_PAGE_SIZE;
            const visibleEpisodes = season.episodes?.slice(0, currentLimit) || [];

            return (
              <div key={season.id} id={`season-${season.number}`} className={`border rounded-xl overflow-hidden bg-white/5 transition-all duration-300 ${isAiringSeason ? 'border-red-600/40 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'border-gray-800'}`}>
                <div className={`flex items-center justify-between p-5 hover:bg-white/5 transition-all group ${isAiringSeason ? 'bg-red-600/5' : ''}`}>
                  <button onClick={() => setExpandedSeason(expandedSeason === season.id ? null : season.id)} className="flex-1 flex items-center gap-6 text-left">
                    <div className="font-black text-lg flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className={loadError ? "text-red-400" : "text-white"}>
                          {season.title || `Season ${season.number}`}
                        </span>
                        {isAiringSeason && (
                          <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-lg shadow-red-950/40 animate-pulse">
                            Now Airing
                          </span>
                        )}
                        {loadError && <span className="ml-3 text-[10px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded border border-red-600/30 uppercase tracking-wide">Error</span>}
                      </div>
                      {!loadError && (
                        <span className={`text-xs mt-1 tracking-wider uppercase font-bold ${isSeasonFull ? 'text-green-500' : 'text-gray-500'}`}>
                          {seasonWatchedCount}/{seasonEpCount} Watched 
                          {season.episodes && season.episodes.length > 0 && airedCount < seasonEpCount && (
                            <span className="ml-2 text-yellow-500/70">({seasonEpCount - airedCount} unreleased)</span>
                          )}
                          {(!season.episodes || season.episodes.length === 0) && (
                            <span className="ml-2 text-gray-600 animate-pulse">(Loading episodes...)</span>
                          )}
                        </span>
                      )}
                      {loadError && <span className="text-xs mt-1 text-red-500/60 font-medium">Failed to load episode data</span>}
                    </div>
                    {expandedSeason === season.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
                  </button>
                  {!loadError && (
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); toggleSeasonInWatchlist(item, season); }} className={`p-2 rounded-full border-2 transition-all ${isSInWatchlist ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-700 text-gray-400 hover:border-white'}`}><Bookmark className={`w-4 h-4 ${isSInWatchlist ? 'fill-current' : ''}`} /></button>
                      <button onClick={(e) => handleSeasonToggleWatched(e, season)} disabled={airedCount === 0} className={`p-2 rounded-full border-2 transition-all ${isSeasonFull ? 'bg-green-600 border-green-600 text-white' : 'border-gray-700 text-gray-400 hover:border-white disabled:opacity-30'}`}><Check className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                {expandedSeason === season.id && (
                  <div className="p-5 bg-black/40 border-t border-gray-800 space-y-6 animate-in slide-in-from-top-4 duration-500">
                    {loadError ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                        <WifiOff className="w-8 h-8 text-red-500 opacity-50" />
                        <p className="text-gray-400 text-sm">We couldn't retrieve the episodes for this season.</p>
                        <p className="text-xs text-gray-600 mb-2">Please check your internet connection or try again later.</p>
                        {retryingSeasonId === season.id ? (
                          <div className="flex items-center gap-2 text-xs text-red-400 font-bold">
                            <Loader className="w-3 h-3 animate-spin" />
                            Retrying...
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRetrySeason(season)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-xs font-bold rounded-full transition-colors border border-red-600/20 hover:border-red-600/40"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Try Again
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-6">
                          {visibleEpisodes.map(ep => {
                            const isEpWatched = isEpisodeWatched(item.id, ep.id);
                            const isEpInWL = isEpisodeInWatchlist(item.id, ep.id);
                            const epAired = !ep.airDate || new Date(ep.airDate) <= now;
                            const isNextUp = userNextUp?.episodeId === ep.id;

                            return (
                              <div 
                                key={ep.id} 
                                id={`ep-${ep.id}`}
                                className={`flex flex-col md:flex-row gap-6 p-4 rounded-xl transition-all relative overflow-hidden ${
                                  isNextUp 
                                    ? 'bg-red-600/10 border border-red-600/40 shadow-[0_0_25px_rgba(220,38,38,0.15)] ring-1 ring-red-500/20' 
                                    : epAired ? 'hover:bg-white/5' : 'opacity-30 grayscale cursor-not-allowed'
                                }`}
                              >
                                {isNextUp && <div id={`ep-next-up-${item.id}`} className="absolute inset-0 pointer-events-none" />}
                                {isNextUp && (
                                  <div className="absolute top-0 right-0 bg-red-600 px-3 py-1 rounded-bl-xl z-10 shadow-lg shadow-red-950/40">
                                    <div className="flex items-center gap-1.5">
                                      <Zap className="w-3 h-3 text-white fill-current animate-pulse" />
                                      <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">Next Up</span>
                                    </div>
                                  </div>
                                )}
                                <div className={`w-full md:w-44 aspect-video bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 relative shadow-2xl ${isNextUp ? 'ring-2 ring-red-600/30 ring-offset-2 ring-offset-[#141414]' : ''}`}>
                                  {ep.stillUrl ? (
                                    <OptimizedImage 
                                      src={ep.stillUrl} 
                                      className="w-full h-full object-cover" 
                                      alt={ep.title}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                      <Tv className="w-8 h-8" />
                                    </div>
                                  )}
                                  {isEpWatched && (<div className="absolute inset-0 bg-green-600/40 backdrop-blur-[1px] flex items-center justify-center"><div className="bg-white rounded-full p-2"><Check className="text-green-600 w-5 h-5 stroke-[4px]" /></div></div>)}
                                  {!epAired && ep.airDate && parseLocalDate(ep.airDate) && (<div className="absolute inset-0 bg-black/60 flex items-center justify-center text-center p-3"><span className="text-[10px] font-black text-white uppercase tracking-tighter">Releases {parseLocalDate(ep.airDate)!.toLocaleDateString()}</span></div>)}
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                      <h4 className="font-black text-lg text-white leading-none">{ep.number}. {ep.title}</h4>
                                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-bold">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ep.runtime}m</span>
                                        {ep.airDate && parseLocalDate(ep.airDate) && <span>• {parseLocalDate(ep.airDate)!.getFullYear()}</span>}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={(e) => { e.stopPropagation(); toggleEpisodeInWatchlist(item, season, ep); }} className={`p-2 rounded-full border-2 transition-all ${isEpInWL ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-700 text-gray-500 hover:border-white hover:text-white'}`}><Bookmark className={`w-3.5 h-3.5 ${isEpInWL ? 'fill-current' : ''}`} /></button>
                                      <button onClick={(e) => handleEpisodeToggleWatched(e, ep, season)} disabled={!epAired} className={`p-2 rounded-full border-2 transition-all ${isEpWatched ? 'bg-green-600 border-green-600 text-white' : 'border-gray-700 text-gray-500 hover:border-white hover:text-white disabled:opacity-0'}`}><Check className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed font-medium">{ep.overview || 'No description available for this episode.'}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {season.episodes && season.episodes.length > currentLimit && (
                          <div className="flex justify-center pt-4">
                            <button
                              onClick={() => showMoreEpisodes(season.id)}
                              className="group flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/5 hover:border-white/20 font-black uppercase tracking-widest text-[10px]"
                            >
                              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                              Show More Episodes ({season.episodes.length - currentLimit} remaining)
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SeasonEpisodePanel;
