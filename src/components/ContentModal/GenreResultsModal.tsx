import React from 'react';
import { X, Tags, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { MediaItem, MediaType } from '../../types';
import ContentCard from '../ContentCard';
import HorizontalScrollContainer from '../HorizontalScrollContainer';

interface GenreResultsModalProps {
  selectedGenre: string | null;
  onClose: () => void;
  loadingGenre: boolean;
  genreError: boolean;
  genreResults: MediaItem[];
  itemType: MediaType;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onNavigate: (item: MediaItem) => void;
  onRetry: (genre: string) => void;
  isInWatchlist: (id: string) => boolean;
  addToWatchlist: (item: MediaItem) => Promise<any>;
  removeFromWatchlist: (id: string) => Promise<any>;
  isWatched: (id: string) => boolean;
  markMovieAsWatched: (item: MediaItem) => Promise<any>;
  unmarkMovie: (item: MediaItem) => Promise<any>;
  markSeriesAsWatched: (item: MediaItem) => Promise<any>;
  unmarkSeries: (item: MediaItem) => Promise<any>;
  hydrateSeries: (item: MediaItem) => Promise<MediaItem>;
  fetchMediaItem: (id: string, type: string, isAnime: boolean) => Promise<any>;
}

const GenreResultsModal: React.FC<GenreResultsModalProps> = ({
  selectedGenre,
  onClose,
  loadingGenre,
  genreError,
  genreResults,
  itemType,
  onScroll,
  onNavigate,
  onRetry,
  isInWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isWatched,
  markMovieAsWatched,
  unmarkMovie,
  markSeriesAsWatched,
  unmarkSeries,
  hydrateSeries,
  fetchMediaItem
}) => {
  if (!selectedGenre) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center px-4 pb-12 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-[#141414] rounded-t-[40px] border-t border-x border-gray-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-10 border border-white/5"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-10 md:p-12">
          <div className="flex items-center gap-6 mb-10">
            <div className="p-5 rounded-3xl bg-green-600/10 text-green-500 border border-white/5">
              <Tags className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">{selectedGenre}</h3>
              <p className="text-gray-500 font-black uppercase tracking-[0.25em] text-xs mt-1">
                More {itemType === MediaType.Movie ? 'Movies' : itemType === MediaType.Anime ? 'Anime' : 'Series'}
              </p>
            </div>
          </div>

          <div className="relative min-h-[320px]">
            {loadingGenre && genreResults.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <Loader className="w-12 h-12 text-green-500 animate-spin" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm animate-pulse">Finding matching titles...</p>
              </div>
            ) : genreError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4">
                <AlertCircle className="w-10 h-10 text-red-500 opacity-50" />
                <p className="font-bold text-red-400">Failed to load content</p>
                <button
                  onClick={() => onRetry(selectedGenre)}
                  className="flex items-center gap-2 mt-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-xs font-bold rounded-full transition-colors border border-red-600/20"
                >
                  <RefreshCw className="w-3 h-3" />
                  Try Again
                </button>
              </div>
            ) : genreResults.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4">
                <AlertCircle className="w-10 h-10 opacity-20" />
                <p className="font-bold">No results found for this genre.</p>
              </div>
            ) : (
              <HorizontalScrollContainer className="pb-6 pt-2" onScroll={onScroll}>
                {genreResults.map((genreItem) => (
                  <div key={genreItem.id} className="snap-start flex-shrink-0 w-[180px] md:w-[200px]">
                    <ContentCard
                      item={genreItem}
                      onClick={onNavigate}
                      isInWatchlist={isInWatchlist(genreItem.id)}
                      onToggleWatchlist={async (e) => {
                        e.stopPropagation();
                        if (isInWatchlist(genreItem.id)) await removeFromWatchlist(genreItem.id);
                        else await addToWatchlist(genreItem);
                      }}
                      isWatched={isWatched(genreItem.id)}
                      onToggleWatched={async (e) => {
                        e.stopPropagation();
                        if (isWatched(genreItem.id)) {
                          if (genreItem.type === MediaType.Movie) await unmarkMovie(genreItem);
                          else await unmarkSeries(genreItem);
                        } else {
                          if (genreItem.type === MediaType.Movie) {
                            let fullItem = genreItem;
                            if (!genreItem.runtime) {
                              try {
                                const details = await fetchMediaItem(
                                  genreItem.id, 
                                  genreItem.type === MediaType.Movie ? 'movie' : 'tv', 
                                  genreItem.type as any === MediaType.Anime
                                );
                                if (details) fullItem = { ...genreItem, ...details } as MediaItem;
                              } catch (err) {
                                console.error("Failed to hydrate movie", err);
                              }
                            }
                            await markMovieAsWatched(fullItem);
                          } else {
                            const hyd = await hydrateSeries(genreItem);
                            await markSeriesAsWatched(hyd);
                          }
                        }
                      }}
                    />
                  </div>
                ))}
                {loadingGenre && (
                  <div className="snap-start flex-shrink-0 w-[180px] md:w-[200px] flex items-center justify-center bg-white/5 rounded-xl border border-dashed border-white/10 animate-pulse">
                    <Loader className="w-8 h-8 text-green-500 animate-spin" />
                  </div>
                )}
              </HorizontalScrollContainer>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">
              {genreResults.length > 0 ? `${genreResults.length} titles loaded` : 'No matches'}
            </p>
            <p className="text-[10px] text-gray-400 font-bold">Scroll horizontally to explore</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenreResultsModal;
