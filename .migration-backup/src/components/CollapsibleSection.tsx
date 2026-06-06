import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
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
  }, [isOpen, updateWidth]);

  if (items.length === 0) return null;

  // Constants for virtualization
  const ITEM_SIZE = 216; 
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
            {containerWidth !== null && (
              <List
                layout="horizontal"
                itemCount={items.length}
                itemSize={ITEM_SIZE}
                height={LIST_HEIGHT}
                width={containerWidth}
                className="no-scrollbar"
                overscanCount={4}
                itemKey={(index) => items[index]?.id || index}
              >
                {({ index, style }: { index: number; style: React.CSSProperties }) => {
                  const item = items[index];
                  if (!item) return null;

                  return (
                    <div style={style} className="pr-4 pb-2">
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
              </List>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CollapsibleSection);