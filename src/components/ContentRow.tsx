'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { FixedSizeList } from 'react-window';
import ContentCard from './ContentCard';
import SkeletonCard from './SkeletonCard';
import { MediaItem } from '../types';
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollArrows } from '@/hooks/useScrollArrows';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000); // Default fallback width

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
        let uniqueNewItems: MediaItem[] = [];
        
        setItems(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          uniqueNewItems = newItems.filter(i => !existingIds.has(i.id));
          return [...prev, ...uniqueNewItems];
        });
        
        // Execute the side effect safely outside the setState callback
        if (onDataFetched && uniqueNewItems.length > 0) {
          onDataFetched(uniqueNewItems);
        }
      }
    } catch (err) {
      console.error(`Error fetching row data for ${title}`, err);
      setError(true);
    } finally {
      setLoading(false);
      loadingRef.current = false;
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
    if (!loading && hasMore && visibleItems.length < 5 && items.length > 0 && !error && page < 3) {
      const timer = setTimeout(() => {
        setPage(prev => prev + 1);
      }, 400); 
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visibleItems.length, loading, hasMore, items.length, error, page]);

  const handleItemsRendered = ({ visibleStopIndex }: { visibleStopIndex: number }) => {
    if (visibleStopIndex >= visibleItems.length - 2) {
       if (!loadingRef.current && hasMoreRef.current && !errorRef.current) {
         loadingRef.current = true; // Prevent re-entry before the useEffect fires loadData
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

  const totalItems = visibleItems.length + (showInitialSkeletons ? 8 : (loading ? 5 : (error ? 1 : 0)));

  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeftArrow, showRightArrow, scrollByAmount } = useScrollArrows(scrollRef, totalItems);

  const isMobile = width < 768;
  const cardWidth = isMobile ? 160 : 200;
  const gap = isMobile ? 8 : 12;
  const itemSize = cardWidth + gap;

  return (
    <div className="mb-8 px-4 md:px-12 animate-in slide-in-from-bottom-5 duration-700" ref={containerRef}>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      </div>
      
      {width > 0 && (
        <div className="relative group/horizontal-scroll w-full">
          {/* Left Arrow Overlay */}
          <button
            onClick={(e) => { e.stopPropagation(); scrollByAmount('left'); }}
            className={`absolute left-0 top-0 bottom-0 z-50 w-12 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-300 ${showLeftArrow ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}
            aria-label="Scroll Left"
            disabled={!showLeftArrow}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          {/* Right Arrow Overlay */}
          <button
            onClick={(e) => { e.stopPropagation(); scrollByAmount('right'); }}
            className={`absolute right-0 top-0 bottom-0 z-50 w-12 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-300 ${showRightArrow ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}
            aria-label="Scroll Right"
            disabled={!showRightArrow}
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Edge Gradients */}
          <div className={`absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#141414] to-transparent z-20 pointer-events-none transition-opacity duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#141414] to-transparent z-20 pointer-events-none transition-opacity duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`} />

          <FixedSizeList
            layout="horizontal"
            height={380}
            width={width}
            itemCount={totalItems}
            itemSize={itemSize}
            overscanCount={5}
            itemData={visibleItems}
            onItemsRendered={handleItemsRendered}
            className="no-scrollbar"
            outerRef={scrollRef}
          >
            {({ index, style, data }: { index: number; style: React.CSSProperties; data: MediaItem[] }) => {
              // Render actual data item
              if (index < data.length) {
                const item = data[index];
                return (
                  <div style={{ ...style, paddingRight: gap }}>
                    <ContentCard 
                      item={item}
                      onClick={onCardClick}
                      isInWatchlist={isInWatchlist(item.id)}
                      onToggleWatchlist={onToggleWatchlist}
                      isWatched={isWatched(item.id)}
                      onToggleWatched={onToggleWatched}
                    />
                  </div>
                );
              }

              // Render Error state at the end
              if (error && index === data.length) {
                return (
                  <div style={{ ...style, paddingRight: gap }} className="flex items-center justify-center h-full">
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
                );
              }

              // Render Skeleton loaders
              return (
                <div style={{ ...style, paddingRight: gap }}>
                  <SkeletonCard />
                </div>
              );
            }}
          </FixedSizeList>
        </div>
      )}
    </div>
  );
};

export default ContentRow;
