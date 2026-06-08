import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollArrows } from '@/hooks/useScrollArrows';
import { FixedSizeList } from 'react-window';
import { MediaItem } from '../types';
import ContentCard from './ContentCard';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  items: MediaItem[];
  onCardClick: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
  isWatchedView?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  count,
  isOpen,
  onToggle,
  items,
  onCardClick,
  isInWatchlist,
  onToggleWatchlist,
  isWatched,
  onToggleWatched,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeftArrow, showRightArrow, scrollByAmount } = useScrollArrows(scrollRef, items.length);

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      const newWidth = containerRef.current.clientWidth;
      setContainerWidth(prev => {
        if (prev === null || Math.abs(prev - newWidth) > 2) {
          return newWidth;
        }
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      updateWidth();
      resizeObserver.current = new ResizeObserver(updateWidth);
      resizeObserver.current.observe(containerRef.current);
      
      return () => {
        resizeObserver.current?.disconnect();
      };
    }
    return undefined;
  }, [isOpen, updateWidth]);

  if (items.length === 0) return null;

  // Constants for virtualization
  const LIST_HEIGHT = 320;

  return (
    <div className="mb-8 bg-[#1a1a1a]/40 rounded-3xl overflow-hidden border border-white/5 shadow-2xl backdrop-blur-sm transition-all duration-500 hover:border-white/10">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-white/5 transition-all duration-300 group cursor-pointer"
      >
        <div className="flex items-center gap-6">
          <div className="relative">
             <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight group-hover:text-red-500 transition-colors">{title}</h3>
             <div className="absolute -bottom-2 left-0 w-8 h-1 bg-red-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
          </div>
          <span className="bg-white/10 text-gray-300 px-4 py-1 rounded-full text-xs font-black tracking-widest border border-white/5 group-hover:bg-red-600 group-hover:text-white transition-all duration-500">
            {count} TITLES
          </span>
        </div>
        <div className={`p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-all duration-500 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
           <ChevronDown className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
        </div>
      </button>

      {isOpen && (
        <div ref={containerRef} className="p-6 md:p-8 pt-0 bg-transparent animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="h-[320px] w-full mt-2">
            {containerWidth !== null && (() => {
              const isMobile = containerWidth < 768;
              const cardWidth = isMobile ? 160 : 200;
              const gap = isMobile ? 8 : 12;
              const itemSize = cardWidth + gap;
              
              return (
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
                    itemCount={items.length}
                    itemSize={itemSize}
                    height={LIST_HEIGHT}
                    width={containerWidth}
                    className="no-scrollbar"
                    overscanCount={4}
                    itemKey={(index: number) => items[index]?.id || index}
                    outerRef={scrollRef}
                  >
                    {({ index, style }: { index: number; style: React.CSSProperties }) => {
                      const item = items[index];
                      if (!item) return null;

                      return (
                        <div style={style} className={`${isMobile ? 'pr-2' : 'pr-3'} pb-2`}>
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
                    }}
                  </FixedSizeList>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CollapsibleSection);