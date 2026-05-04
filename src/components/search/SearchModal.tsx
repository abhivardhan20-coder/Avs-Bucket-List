
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, TrendingUp, CheckCircle, AlertCircle, Filter, Calendar, Film, Tv, Zap, ChevronDown, Check } from 'lucide-react';
import { MediaItem, MediaType } from '../../types';
import {
  searchMovies,
  searchSeries,
  searchAnime,
  unifiedSearch,
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  getPopularSuggestions
} from '../../lib/search';
import { useDebounce } from '../../hooks/useDebounce';
import SearchBar from './SearchBar';
import SearchResultSection from './SearchResultSection';
import SearchHistory from './SearchHistory';
import SearchSkeleton from './SearchSkeleton';
import SearchNoResults from './SearchNoResults';
import HorizontalScrollContainer from '../HorizontalScrollContainer';
import { useLibraryActions } from '../../contexts/AppContext';
import { hydrateSeries } from '../../services/tmdb';

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

  // Results & Pagination States
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [anime, setAnime] = useState<MediaItem[]>([]);

  const [pages, setPages] = useState({ movies: 1, series: 1, anime: 1 });
  const [hasMore, setHasMore] = useState({ movies: true, series: true, anime: true });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState({ movies: false, series: false, anime: false });

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

  // UI Feedback
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- HANDLERS ---
  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleClearFilters = () => {
    setSelectedType('All');
    setSelectedYear('All');
    setSelectedGenre('All');
    setYearInput('');
  };

  const hasFilters = selectedType !== 'All' || selectedYear !== 'All' || selectedGenre !== 'All';

  // --- EFFECT: Visibility & Body Lock ---
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto-focus input
      setTimeout(() => inputRef.current?.focus(), 50);

      // Load History
      const history = getRecentSearches();
      setRecentSearches(history);

      // Load Trending Suggestions
      setLoadingSuggestions(true);
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

    } else {
      document.body.style.overflow = '';
      resetSearchStates();
    }
    return () => { document.body.style.overflow = ''; };
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

  const resetSearchStates = () => {
    setQuery('');
    setMovies([]);
    setSeries([]);
    setAnime([]);
    setPages({ movies: 1, series: 1, anime: 1 });
    setHasMore({ movies: true, series: true, anime: true });
    setSelectedType('All');
    setSelectedYear('All');
    setSelectedGenre('All');
    setYearInput('');
    setOpenDropdown(null);
    setLoading(false);
  };

  // --- EFFECT: Initial Search Logic ---
  useEffect(() => {
    let isMounted = true;

    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setMovies([]);
        setSeries([]);
        setAnime([]);
        return;
      }

      // Offline Check
      if (!navigator.onLine) {
        if (isMounted) showToast("You are offline. Please check your internet connection.", "error");
        return;
      }

      setLoading(true);
      setPages({ movies: 1, series: 1, anime: 1 });
      setHasMore({ movies: true, series: true, anime: true });

      try {
        // Create a timeout promise that rejects after 10 seconds
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 20000)
        );

        const searchPromise = unifiedSearch(debouncedQuery);

        // Race the search against the timeout
        const results = await Promise.race([searchPromise, timeoutPromise]);

        if (isMounted) {
          setMovies(results.movies || []);
          setSeries(results.series || []);
          setAnime(results.anime || []);
          setHasMore({
            movies: (results.movies || []).length >= 10,
            series: (results.series || []).length >= 10,
            anime: (results.anime || []).length >= 20
          });
        }
      } catch (err) {
        console.error("Search execution error:", err);
        if (isMounted) {
          const errMsg = err instanceof Error ? err.message : "Connection failed";
          // If it's a proxy error, give more specific advice
          if (errMsg.includes("502") || errMsg.includes("500") || errMsg.includes("Connection failed")) {
             showToast("Backend connection issue. Make sure the server is running.", "error");
          } else {
             showToast(`Search failed: ${errMsg}`, "error");
          }
          setMovies([]);
          setSeries([]);
          setAnime([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    performSearch();

    return () => { isMounted = false; };
  }, [debouncedQuery]);

  // --- INFINITE SCROLL HANDLERS ---

  const loadMore = async (type: MediaType) => {
    if (loading || !debouncedQuery.trim()) return;

    // Offline Check
    if (!navigator.onLine) {
      showToast("You are offline. Please check your internet connection.", "error");
      return;
    }

    const key = type === MediaType.Movie ? 'movies' : type === MediaType.Series ? 'series' : 'anime';
    if (!hasMore[key] || loadingMore[key]) return;

    setLoadingMore(prev => ({ ...prev, [key]: true }));
    const nextPage = pages[key] + 1;

    try {
      let nextResults: MediaItem[] = [];
      if (type === MediaType.Movie) nextResults = await searchMovies(debouncedQuery, nextPage);
      else if (type === MediaType.Series) nextResults = await searchSeries(debouncedQuery, nextPage);
      else if (type === MediaType.Anime) nextResults = await searchAnime(debouncedQuery, nextPage);

      if (nextResults.length === 0) {
        setHasMore(prev => ({ ...prev, [key]: false }));
      } else {
        if (type === MediaType.Movie) setMovies(prev => [...prev, ...nextResults]);
        else if (type === MediaType.Series) setSeries(prev => [...prev, ...nextResults]);
        else if (type === MediaType.Anime) setAnime(prev => [...prev, ...nextResults]);

        setPages(prev => ({ ...prev, [key]: nextPage }));
      }
    } catch (err) {
      console.error(`Failed to load more ${key}`, err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      showToast(`Unable to load more results: ${msg}`, "error");
    } finally {
      setLoadingMore(prev => ({ ...prev, [key]: false }));
    }
  };

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

  // --- KEYBOARD NAV ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasResults = processedMovies.length > 0 || processedSeries.length > 0 || processedAnime.length > 0;
  const isIdle = !query.trim();

  // Render directly without portal to avoid Target container not a DOM element error
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
    >
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-[200] flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 border ${toast.type === 'error' ? 'bg-red-900/90 border-red-700' : 'bg-green-900/90 border-green-700'} text-white`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Blurred Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-all"
        onClick={handleClose}
      />

      {/* Main Container */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-5xl mx-auto h-full flex flex-col p-4 md:p-8"
      >
        {/* Header Section */}
        <div className="flex-shrink-0 w-full mb-6 pt-4 md:pt-8 animate-in slide-in-from-top-4 duration-500">
          <div className="flex justify-end mb-4 md:hidden">
            <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white">
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

          {/* Filters - Only show when there is a query */}
          {query.trim() && (
            <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">

              {/* Filters Row: Type & Year Dropdowns */}
              <div className="flex flex-wrap items-center gap-3 relative z-30" ref={dropdownRef}>

                {/* Type Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all min-w-[140px] justify-between ${openDropdown === 'type' || selectedType !== 'All'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#1f1f1f] text-gray-300 border-gray-800 hover:bg-[#2a2a2a] hover:text-white'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {(() => {
                        const t = TYPES.find(t => t.value === selectedType);
                        const Icon = t?.icon || Filter;
                        return <Icon className="w-4 h-4" />;
                      })()}
                      <span>{TYPES.find(t => t.value === selectedType)?.label || 'Type'}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === 'type' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'type' && (
                    <div className="absolute top-full left-0 mt-2 w-full min-w-[160px] bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      {TYPES.map(t => (
                        <button
                          key={t.label}
                          onClick={() => { setSelectedType(t.value as any); setOpenDropdown(null); }}
                          className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors ${selectedType === t.value
                            ? 'bg-white/10 text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                          <t.icon className={`w-4 h-4 ${selectedType === t.value ? 'text-white' : 'text-gray-500'}`} />
                          {t.label}
                          {selectedType === t.value && <Check className="w-3.5 h-3.5 ml-auto text-red-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      const next = openDropdown === 'year' ? null : 'year';
                      if (next === 'year') {
                        setYearInput(selectedYear === 'All' ? '' : selectedYear);
                      }
                      setOpenDropdown(next);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all min-w-[120px] justify-between ${openDropdown === 'year' || selectedYear !== 'All'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#1f1f1f] text-gray-300 border-gray-800 hover:bg-[#2a2a2a] hover:text-white'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{selectedYear === 'All' ? 'Year' : selectedYear}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === 'year' ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === 'year' && (
                    <div className="absolute top-full left-0 mt-2 w-40 max-h-60 overflow-hidden bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col z-50">
                      <div className="p-3 border-b border-gray-800 bg-[#1f1f1f]">
                        <input
                          type="text"
                          value={yearInput}
                          placeholder="Type year..."
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*$/.test(val) && val.length <= 4) {
                              setYearInput(val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (yearInput.length === 4) {
                                setSelectedYear(yearInput);
                                setOpenDropdown(null);
                              } else if (yearInput === '') {
                                setSelectedYear('All');
                                setOpenDropdown(null);
                              }
                            }
                          }}
                          className="w-full bg-[#141414] text-white text-xs px-2 py-2 rounded-lg border border-gray-700 focus:border-red-500 outline-none font-bold text-center placeholder-gray-600"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 no-scrollbar">
                        {YEARS.map(year => (
                          <button
                            key={year}
                            onClick={() => { setSelectedYear(year); setOpenDropdown(null); }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors border-l-2 ${selectedYear === year
                              ? 'border-red-500 bg-white/5 text-white'
                              : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                              }`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Genre - Scrollable */}
              <div className="w-full overflow-hidden relative group flex items-center">
                <HorizontalScrollContainer className="w-full" itemGap={8}>
                  <span className="text-[10px] font-black text-gray-600 uppercase mr-2 flex-shrink-0 flex items-center gap-1 self-center">
                    <Filter className="w-3 h-3" /> Genre
                  </span>
                  {GENRES.map(genre => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedGenre === genre
                        ? 'bg-white text-black border-white'
                        : 'bg-[#1f1f1f] text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white'
                        }`}
                    >
                      {genre}
                    </button>
                  ))}
                </HorizontalScrollContainer>
              </div>
            </div>
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

              {/* Popular Suggestions */}
              {(loadingSuggestions || popularSuggestions.length > 0) && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-red-500" /> Trending Now
                    </h4>
                  </div>

                  {loadingSuggestions ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-2 animate-pulse">
                          <div className="aspect-[2/3] bg-gray-800 rounded-xl" />
                          <div className="h-3 bg-gray-800 rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {popularSuggestions.map((item, index) => (
                        <div
                          key={`popular-${item.id}`}
                          onClick={() => handleResultClickInternal(item)}
                          className="group cursor-pointer relative"
                        >
                          <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-gray-800 shadow-lg border border-white/5 group-hover:border-white/20 transition-all">
                            <img src={item.posterUrl || undefined} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />

                            {/* Rank Badge */}
                            <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-full border border-white/10 text-[10px] font-bold text-white">
                              {index + 1}
                            </div>

                            {/* Type Badge */}
                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-red-600/90 backdrop-blur-sm rounded text-[8px] font-black uppercase text-white shadow-sm">
                              {item.type === MediaType.Movie ? 'MOV' : item.type === MediaType.Anime ? 'ANI' : 'TV'}
                            </div>
                          </div>
                          <p className="text-xs font-medium text-gray-400 group-hover:text-white truncate transition-colors pl-1">{item.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
      </div>
    </div>
  );
};

export default SearchModal;