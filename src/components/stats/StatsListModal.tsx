import React, { useState } from 'react';
import { X, Film, Tv, ChevronDown, ChevronUp } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import { MediaItem } from '@/types';
import ContentCard from '../ContentCard';

export interface StatsGroup {
  title: string;
  items: MediaItem[];
  subCount?: number;
  subLabel?: string;
}

interface StatsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  totalCount: number;
  countLabel: string;
  groups: StatsGroup[];
  onCardClick: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
}

const StatsGroupSection: React.FC<{
  group: StatsGroup;
  onCardClick: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  onToggleWatchlist: (e: React.MouseEvent, id: string) => void;
  isWatched: (id: string) => boolean;
  onToggleWatched: (e: React.MouseEvent, id: string) => void;
}> = ({ group, ...props }) => {
  const [isOpen, setIsOpen] = useState(true);
  if (group.items.length === 0) return null;

  return (
    <div className="mb-6 bg-[#1f1f1f]/30 border border-gray-800 rounded-xl overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 hover:bg-white/5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${group.title.toLowerCase().includes('movie') ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
            {group.title.toLowerCase().includes('movie') ? <Film className="w-5 h-5 text-red-500" /> : <Tv className="w-5 h-5 text-blue-500" />}
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white leading-tight">{group.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-black text-red-500/80 uppercase tracking-widest">{group.items.length} {group.title.toLowerCase().includes('movie') || group.title.toLowerCase().includes('title') ? 'Titles' : 'Series'}</span>
              {group.subCount !== undefined && (
                <>
                  <span className="text-[10px] text-gray-600">•</span>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{group.subCount} {group.subLabel || 'Units'}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-800 bg-[#141414]/50">
          <div className="h-[280px]">
            <List
              height={280}
              itemCount={group.items.length}
              itemSize={200}
              layout="horizontal"
              width={1000} // This will be constrained by the container width
              className="no-scrollbar"
            >
              {({ index, style }: { index: number; style: React.CSSProperties }) => {
                const item = group.items[index];
                return (
                  <div style={style} className="pr-4">
                    <ContentCard
                      item={item}
                      onClick={props.onCardClick}
                      isInWatchlist={props.isInWatchlist(item.id)}
                      onToggleWatchlist={props.onToggleWatchlist}
                      isWatched={props.isWatched(item.id)}
                      onToggleWatched={props.onToggleWatched}
                    />
                  </div>
                );
              }}
            </List>
          </div>
        </div>
      )}
    </div>
  );
};

const StatsListModal: React.FC<StatsListModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={props.onClose} />
      <div className="relative bg-[#1a1a1a] w-full max-w-6xl h-[85vh] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-shrink-0 p-8 border-b border-gray-800 bg-[#141414] flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-white mb-2">{props.title}</h2>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold text-red-500">{props.totalCount}</span>
              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-2">{props.countLabel}</span>
            </div>
          </div>
          <button onClick={props.onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-[#141414]">
          {props.groups.map(group => (
            <StatsGroupSection key={group.title} group={group} {...props} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsListModal;