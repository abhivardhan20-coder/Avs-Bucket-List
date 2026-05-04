
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ContentCard from './ContentCard';
import SkeletonCard from './SkeletonCard';
import HorizontalScrollContainer from './HorizontalScrollContainer';
import { MediaItem } from '../types';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ContentRowProps {
  title: string;
  fetchStrategy: (page: number) => Promise<MediaItem[]>;
  onCardClick: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
  onDataFetched?: (items: MediaItem[]) => void;
  excludedIds: Set<string>;
  icon?: React.ReactNode;
}

const ContentRow: React.FC<ContentRowProps> = ({ 
  title, 
  fetchStrategy, 
  onCardClick,
  isInWatchlist,
  onToggleWatchlist,
  isWatched,
  onToggleWatched,
  onDataFetched,
  excludedIds,
  icon
}) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);

  const visibleItems = useMemo(() => {
    return items.filter(item => !excludedIds.has(item.id));
  }, [items, excludedIds]);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const errorRef = useRef(false);
  const hasInitiallyLoaded = useRef(false);

  // Sync refs with state for use in callbacks
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { errorRef.current = error; }, [error]);

  const loadData = useCallback(async (pageNum: number) => {
    // Prevent concurrent loads
    if (loadingRef.current) return;
    if (!hasMoreRef.current && !errorRef.current) return;
    
    loadingRef.current = true;  // Set synchronously to prevent races
    setLoading(true);
    setError(false);
    try {
      const newItems = await fetchStrategy(pageNum);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const uniqueNewItems = newItems.filter(i => !existingIds.has(i.id));
          
          if (onDataFetched) {
             onDataFetched(uniqueNewItems);
          }
          
          return [...prev, ...uniqueNewItems];
        });
      }
    } catch (err) {
      console.error(`Error fetching row data for ${title}`, err);
      setError(true);
    } finally {
      setLoading(false);
      hasInitiallyLoaded.current = true;
    }
  }, [fetchStrategy, onDataFetched, title]);

  useEffect(() => {
    if (hasInitiallyLoaded.current) return;
    loadData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page > 1) {
      loadData(page);
    }
  }, [page, loadData]);

  useEffect(() => {
    // Auto-fill row with a safety guard to prevent infinite update depth
    // MAX 3 pages to prevent runaway pagination (rate limit protection)
    if (!loading && hasMore && visibleItems.length < 5 && items.length > 0 && !error && page < 3) {
      const timer = setTimeout(() => {
        setPage(prev => prev + 1);
      }, 400); // 400ms debounce to allow React to breathe and avoid burst requests
      return () => clearTimeout(timer);
    }
  }, [visibleItems.length, loading, hasMore, items.length, error, page]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    if (scrollLeft + clientWidth >= scrollWidth - 600) {
       if (!loading && hasMore && !error) {
         setPage(prev => prev + 1);
       }
    }
  };

  // 1. Initial Load Error (No items yet)
  if (error && items.length === 0) {
    return (
      <div className="mb-8 px-4 md:px-12 animate-in fade-in">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{title}</h2>
        <div className="bg-[#1a1a1a] border border-red-900/20 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
          <AlertCircle className="w-8 h-8 text-red-500 opacity-80" />
          <div className="space-y-1">
            <p className="text-gray-300 font-bold">Couldn't load titles</p>
            <p className="text-xs text-gray-500">There was an issue fetching content for this section.</p>
          </div>
          <button 
            onClick={() => loadData(page)} 
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-all border border-white/5 hover:border-white/20 active:scale-95"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  // 2. Empty State (Success but no items) - Hide row
  if (!loading && visibleItems.length === 0 && !hasMore && !error) {
    return null;
  }

  // 3. Initial loading state - reserve space with skeletons
  const showInitialSkeletons = !hasInitiallyLoaded.current || (loading && items.length === 0);

  return (
    <div className="mb-8 px-4 md:px-12 animate-in slide-in-from-bottom-5 duration-700">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      </div>
      <HorizontalScrollContainer onScroll={handleScroll} className="min-h-[300px] md:min-h-[380px]">
        {visibleItems.map(item => (
          <div key={`${title}-${item.id}`} className="snap-start">
            <ContentCard 
              item={item}
              onClick={onCardClick}
              isInWatchlist={isInWatchlist(item.id)}
              onToggleWatchlist={onToggleWatchlist}
              isWatched={isWatched(item.id)}
              onToggleWatched={onToggleWatched}
            />
          </div>
        ))}
        
        {(loading || showInitialSkeletons) && Array.from({ length: showInitialSkeletons ? 8 : 5 }).map((_, i) => (
          <div key={`skel-${i}`} className="snap-start">
            <SkeletonCard />
          </div>
        ))}

        {/* 3. Pagination Error (Items exist, failed to load next page) */}
        {error && items.length > 0 && (
          <div className="snap-start flex items-center justify-center min-w-[200px] h-[240px] md:h-[300px]">
             <button 
                onClick={() => loadData(page)}
                disabled={loading}
                className="group flex flex-col items-center gap-3 text-red-500 hover:text-red-400 transition-colors p-4 rounded-xl hover:bg-white/5"
             >
                <div className="p-3 bg-red-500/10 rounded-full group-hover:bg-red-500/20 transition-colors">
                  <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                </div>
                <div className="text-center">
                  <span className="block text-sm font-bold">Failed to load more</span>
                  <span className="block text-xs opacity-60 mt-1">Tap to retry</span>
                </div>
             </button>
          </div>
        )}
        
        <div className="w-12 flex-shrink-0"></div>
      </HorizontalScrollContainer>
    </div>
  );
};

export default ContentRow;