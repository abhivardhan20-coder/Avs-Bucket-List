import React from 'react';
import { X, User, Film, Loader, AlertCircle } from 'lucide-react';
import { MediaItem, MediaType } from '../../types';
import ContentCard from '../ContentCard';
import HorizontalScrollContainer from '../HorizontalScrollContainer';

interface PersonCreditsModalProps {
  selectedPerson: { name: string; role: 'actor' | 'director' } | null;
  onClose: () => void;
  loadingCredits: boolean;
  creditsError: boolean;
  visiblePersonCredits: MediaItem[];
  allPersonCredits: MediaItem[];
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onNavigate: (item: MediaItem) => void;
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

const PersonCreditsModal: React.FC<PersonCreditsModalProps> = ({
  selectedPerson,
  onClose,
  loadingCredits,
  creditsError,
  visiblePersonCredits,
  allPersonCredits,
  onScroll,
  onNavigate,
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
  if (!selectedPerson) return null;

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
            <div className={`p-5 rounded-3xl ${selectedPerson.role === 'actor' ? 'bg-blue-600/10 text-blue-500' : 'bg-purple-600/10 text-purple-500'} border border-white/5`}>
              {selectedPerson.role === 'actor' ? <User className="w-10 h-10" /> : <Film className="w-10 h-10" />}
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">{selectedPerson.name}</h3>
              <p className="text-gray-500 font-black uppercase tracking-[0.25em] text-xs mt-1">
                {selectedPerson.role === 'actor' ? 'Starring Roles' : 'Directed Works'}
              </p>
            </div>
          </div>

          <div className="relative min-h-[320px]">
            {loadingCredits && visiblePersonCredits.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <Loader className="w-12 h-12 text-red-600 animate-spin" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm animate-pulse">Searching filmography...</p>
              </div>
            ) : creditsError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4">
                <AlertCircle className="w-10 h-10 text-red-500 opacity-50" />
                <p className="font-bold text-red-400">Failed to load details</p>
                <button
                  onClick={() => onClose()} // Or retry logic
                  className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : visiblePersonCredits.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4">
                <AlertCircle className="w-10 h-10 opacity-20" />
                <p className="font-bold">No results found.</p>
              </div>
            ) : (
              <HorizontalScrollContainer onScroll={onScroll} className="pb-6 pt-2">
                {visiblePersonCredits.map((creditItem) => (
                  <div key={creditItem.id} className="snap-start flex-shrink-0 w-[180px] md:w-[200px]">
                    <ContentCard
                      item={creditItem}
                      onClick={onNavigate}
                      isInWatchlist={isInWatchlist(creditItem.id)}
                      onToggleWatchlist={async (e) => {
                        e.stopPropagation();
                        if (isInWatchlist(creditItem.id)) await removeFromWatchlist(creditItem.id);
                        else await addToWatchlist(creditItem);
                      }}
                      isWatched={isWatched(creditItem.id)}
                      onToggleWatched={async (e) => {
                        e.stopPropagation();
                        if (isWatched(creditItem.id)) {
                          if (creditItem.type === MediaType.Movie) await unmarkMovie(creditItem);
                          else await unmarkSeries(creditItem);
                        } else {
                          if (creditItem.type === MediaType.Movie) {
                            let fullItem = creditItem;
                            if (!creditItem.runtime) {
                              try {
                                const details = await fetchMediaItem(
                                  creditItem.id, 
                                  creditItem.type === MediaType.Movie ? 'movie' : 'tv', 
                                  creditItem.type as any === MediaType.Anime
                                );
                                if (details) fullItem = { ...creditItem, ...details } as MediaItem;
                              } catch (err) {
                                console.error("Failed to hydrate movie", err);
                              }
                            }
                            await markMovieAsWatched(fullItem);
                          } else {
                            const hyd = await hydrateSeries(creditItem);
                            await markSeriesAsWatched(hyd);
                          }
                        }
                      }}
                    />
                  </div>
                ))}

                {visiblePersonCredits.length < allPersonCredits.length && (
                  <div className="snap-start flex-shrink-0 w-[180px] md:w-[200px] flex items-center justify-center bg-white/5 rounded-xl border border-dashed border-white/10 animate-pulse">
                    <Loader className="w-8 h-8 text-gray-600 animate-spin" />
                  </div>
                )}
              </HorizontalScrollContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonCreditsModal;
