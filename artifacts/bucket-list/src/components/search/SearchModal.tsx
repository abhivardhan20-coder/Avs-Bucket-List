
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Filter, Film, Tv, Zap } from 'lucide-react';
import { MediaItem, MediaType } from '../../types';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  getPopularSuggestions
} from '../../lib/search';
import { useSearchEngine } from '../../hooks/useSearchEngine';
import { SearchModalFilters } from './SearchModalFilters';
import { SearchPopular } from './SearchPopular';
import SearchBar from './SearchBar';
import SearchResultSection from './SearchResultSection';
import SearchHistory from './SearchHistory';
import SearchSkeleton from './SearchSkeleton';
import SearchNoResults from './SearchNoResults';
import { useLibraryActions } from '../../contexts/AppContext';
import { hydrateSeries } from '../../services/tmdb';
import Modal from '../ui/Modal';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick: (item: MediaItem) => void;
}

const GENRES = [
  'All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War'
];

// Generate years from next year down to 1950
const currentYear = new Date().getFullYear();
const YEARS = ['All', ...Array.from({ length: currentYear - 1950 + 2 }, (_, i) => (currentYear + 1 - i).toString())];

const TYPES = [
  { label: 'All', value: 'All', icon: Filter },
  { label: 'Movies', value: MediaType.Movie, icon: Film },
  { label: 'Series', value: MediaType.Series, icon: Tv },
  { label: 'Anime', value: MediaType.Anime, icon: Zap },
];

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onResultClick }) => {
  // Context
  const { isInWatchlist, addToWatchlist, removeFromWatchlist, isWatched, markMovieAsWatched, unmarkMovie, markSeriesAsWatched, unmarkSeries } = useLibraryActions();

  // State
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  // UI Feedback
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const {
    movies, series, anime, loading, loadingMore,
    resetSearchStates, performSearch, loadMore
  } = useSearchEngine(debouncedQuery, (msg, type) => showToast(msg, type));

  // Filter State
  const [selectedType, setSelectedType] = useState<'All' | MediaType>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [yearInput, setYearInput] = useState('');

  // UI State
  const [openDropdown, setOpenDropdown] = useState<'type' | 'year' | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSuggestions, setPopularSuggestions] = useState<MediaItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openDropdown === 'year') {
      const timer = setTimeout(() => {
        yearInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [openDropdown]);

  // --- HANDLERS ---

  const handleClearFilters = () => {
    setSelectedType('All');
    setSelectedYear('All');
    setSelectedGenre('All');
    setYearInput('');
  };

  const hasFilters = selectedType !== 'All' || selectedYear !== 'All' || selectedGenre !== 'All';

  // Synchronously update search/history state when isOpen changes (handled in render phase to avoid cascading effects)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      setLoadingSuggestions(true);
    } else {
      resetSearchStates();
    }
  }

  // --- EFFECT: Visibility & Async Loading ---
  useEffect(() => {
    if (isOpen) {
      // Auto-focus input
      setTimeout(() => inputRef.current?.focus(), 50);

      // Load Trending Suggestions
      getPopularSuggestions()
        .then(data => {
            // DE-DUPLICATE trending suggestions just in case
            const uniqueMap = new Map<string, MediaItem>();
            data.forEach(item => {
                if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
            });
            setPopularSuggestions(Array.from(uniqueMap.values()));
        })
        .catch(err => console.error("Failed suggestions", err))
        .finally(() => setLoadingSuggestions(false));
    }
  }, [isOpen]);


  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  useEffect(() => {
    let isMounted = true;
    performSearch(isMounted);
    return () => { isMounted = false; };
  }, [debouncedQuery, performSearch]);

  const handleClose = () => {
    onClose();
  };

  const handleResultClickInternal = (item: MediaItem) => {
    if (query.trim()) addRecentSearch(query.trim());
    onResultClick(item);
  };

  const handleHistorySelect = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const handleHistoryRemove = (term: string) => {
    const newHistory = removeRecentSearch(term);
    setRecentSearches(newHistory);
  };

  const handleHistoryClear = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Action Handlers
  const handleToggleWatchlist = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (isInWatchlist(item.id)) {
      const res = await removeFromWatchlist(item.id);
      showToast(res.message, res.success ? 'success' : 'error');
    } else {
      const res = await addToWatchlist(item);
      showToast(res.message, res.success ? 'success' : 'error');
    }
  };

  const handleToggleWatched = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (isWatched(item.id)) {
      if (item.type === MediaType.Movie) {
        const res = await unmarkMovie(item);
        showToast(res.message, res.success ? 'success' : 'error');
      } else {
        const res = await unmarkSeries(item);
        showToast(res.message, res.success ? 'success' : 'error');
      }
    } else {
      if (item.type === MediaType.Movie) {
        const res = await markMovieAsWatched(item);
        showToast(res.message, res.success ? 'success' : 'error');
      } else {
        try {
          if (!item.seasons) {
            const fullItem = await hydrateSeries(item);
            const res = await markSeriesAsWatched(fullItem);
            showToast(res.message, res.success ? 'success' : 'error');
          } else {
            const res = await markSeriesAsWatched(item);
            showToast(res.message, res.success ? 'success' : 'error');
          }
        } catch (error) {
          console.error("Failed to mark series watched", error);
          const msg = error instanceof Error ? error.message : "Unknown error";
          showToast(`Failed to mark series: ${msg}`, "error");
        }
      }
    }
  };

  // --- FILTER & SORT LOGIC ---
  const processItems = useCallback((items: MediaItem[]) => {
    let result = [...items];

    // Filter by Type
    if (selectedType !== 'All') {
      result = result.filter(i => i.type === selectedType);
    }

    // Filter by Year
    if (selectedYear !== 'All') {
      result = result.filter(i => i.year.toString() === selectedYear);
    }

    // Filter by Genre
    if (selectedGenre !== 'All') {
      result = result.filter(i => i.genres?.includes(selectedGenre));
    }

    return result;
  }, [selectedType, selectedYear, selectedGenre]);

  const processedMovies = useMemo(() => processItems(movies), [movies, processItems]);
  const processedSeries = useMemo(() => processItems(series), [series, processItems]);
  const processedAnime = useMemo(() => processItems(anime), [anime, processItems]);

  const hasResults = processedMovies.length > 0 || processedSeries.length > 0 || processedAnime.length > 0;
  const isIdle = !query.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel="Search content"
      overlayClassName="bg-black/60 backdrop-blur-xl"
      className="w-full max-w-5xl mx-auto h-full flex flex-col p-4 md:p-8 relative z-10"
      zIndex={100}
    >
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-[200] flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 border ${toast.type === 'error' ? 'bg-red-900/90 border-red-700' : 'bg-green-900/90 border-green-700'} text-white`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex-shrink-0 w-full mb-6 pt-4 md:pt-8 animate-in slide-in-from-top-4 duration-500">
        <div className="flex justify-end mb-4 md:hidden">
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white" aria-label="Close search">
            <X className="w-5 h-5" />
          </button>
        </div>

        <SearchBar
          ref={inputRef}
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
          isLoading={loading}
        />

        {query.trim() && (
          <SearchModalFilters
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
            yearInput={yearInput}
            setYearInput={setYearInput}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            dropdownRef={dropdownRef}
            yearInputRef={yearInputRef}
            TYPES={TYPES}
            YEARS={YEARS}
            GENRES={GENRES}
          />
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar pb-20">

        {/* IDLE STATE: History & Popular */}
        {isIdle && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            {/* History */}
            <SearchHistory
              history={recentSearches}
              onSelect={handleHistorySelect}
              onRemove={handleHistoryRemove}
              onClear={handleHistoryClear}
            />

            <SearchPopular
              loadingSuggestions={loadingSuggestions}
              popularSuggestions={popularSuggestions}
              handleResultClickInternal={handleResultClickInternal}
            />
          </div>
        )}

        {/* LOADING STATE */}
        {loading && !hasResults && !isIdle && (
          <SearchSkeleton />
        )}

        {/* RESULTS STATE */}
        {!isIdle && !loading && (
          hasResults ? (
            <div className="space-y-2">
              {/* Only show sections if they match the selected Type */}
              {(selectedType === 'All' || selectedType === MediaType.Movie) && processedMovies.length > 0 && (
                <SearchResultSection
                  title="Movies"
                  items={processedMovies}
                  colorClass="border-red-600"
                  onResultClick={handleResultClickInternal}
                  isInWatchlist={isInWatchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  isWatched={isWatched}
                  onToggleWatched={handleToggleWatched}
                  onLoadMore={() => loadMore(MediaType.Movie)}
                  isLoadingMore={loadingMore.movies}
                />
              )}
              {(selectedType === 'All' || selectedType === MediaType.Series) && processedSeries.length > 0 && (
                <SearchResultSection
                  title="TV Series"
                  items={processedSeries}
                  colorClass="border-blue-600"
                  onResultClick={handleResultClickInternal}
                  isInWatchlist={isInWatchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  isWatched={isWatched}
                  onToggleWatched={handleToggleWatched}
                  onLoadMore={() => loadMore(MediaType.Series)}
                  isLoadingMore={loadingMore.series}
                />
              )}
              {(selectedType === 'All' || selectedType === MediaType.Anime) && processedAnime.length > 0 && (
                <SearchResultSection
                  title="Anime"
                  items={processedAnime}
                  colorClass="border-purple-600"
                  onResultClick={handleResultClickInternal}
                  isInWatchlist={isInWatchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  isWatched={isWatched}
                  onToggleWatched={handleToggleWatched}
                  onLoadMore={() => loadMore(MediaType.Anime)}
                  isLoadingMore={loadingMore.anime}
                />
              )}
            </div>
          ) : (
            <SearchNoResults
              query={query}
              hasFilters={hasFilters}
              onClearFilters={handleClearFilters}
            />
          )
        )}
      </div>
    </Modal>
  );
};

export default SearchModal;