import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { ChevronRight, Loader2 } from 'lucide-react';
import { MediaItem } from '../../types';
import ContentCard from '../ContentCard';

interface SearchResultSectionProps {
  title: string;
  items: MediaItem[];
  colorClass: string;
  onResultClick: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, item: MediaItem) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, item: MediaItem) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const SearchResultSection: React.FC<SearchResultSectionProps> = ({
  title,
  items,
  colorClass,
  onResultClick,
  isInWatchlist,
  onToggleWatchlist,
  isWatched,
  onToggleWatched,
  onLoadMore,
  isLoadingMore
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(window.innerWidth > 1200 ? 1000 : window.innerWidth - 64);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  const ITEM_WIDTH = 200;
  const GAP = 16;
  
  // Add 1 to itemCount if we have a load more callback
  const itemCount = onLoadMore ? items.length + 1 : items.length;

  return (
    <div className="mb-10 animate-slide-up" ref={containerRef}>
      <h3 className={`text-xl font-bold text-white mb-4 pl-4 border-l-4 ${colorClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {title}
          <span className="text-gray-500 text-sm font-normal">({items.length})</span>
        </div>
        {onLoadMore && items.length >= 10 && !isLoadingMore && (
           <button 
             onClick={onLoadMore}
             className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-1"
           >
             View More <ChevronRight className="w-3 h-3" />
           </button>
        )}
      </h3>

      <div className="h-[320px]">
        <List
          height={320}
          itemCount={itemCount}
          itemSize={ITEM_WIDTH + GAP}
          layout="horizontal"
          width={containerWidth || 1000}
          className="no-scrollbar"
        >
          {({ index, style }: { index: number; style: React.CSSProperties }) => {
            if (index === items.length) {
              // Load More Sentinel Card
              return (
                <div style={style} className="pr-4 flex items-center justify-center h-full">
                  <button
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                    className="w-[180px] aspect-[2/3] bg-white/5 rounded-xl border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-3 group disabled:opacity-50"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ChevronRight className="w-6 h-6 text-gray-400" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Load More</span>
                      </>
                    )}
                  </button>
                </div>
              );
            }

            const item = items[index];
            return (
              <div style={style} className="pr-4">
                <ContentCard
                  item={item}
                  onClick={onResultClick}
                  isInWatchlist={isInWatchlist(item.id)}
                  onToggleWatchlist={(e) => onToggleWatchlist(e, item)}
                  isWatched={isWatched(item.id)}
                  onToggleWatched={(e) => onToggleWatched(e, item)}
                />
              </div>
            );
          }}
        </List>
      </div>
    </div>
  );
};

export default React.memo(SearchResultSection);