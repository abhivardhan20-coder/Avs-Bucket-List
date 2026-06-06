/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react';
import { ImageOff, Film, Tv, Zap } from 'lucide-react';
import { MediaItem, MediaType } from '../../types';
import OptimizedImage from '../OptimizedImage';

export interface CalendarEntry {
  item: MediaItem;
  date: string;
  label: string;
  type: MediaType;
  episodeInfo?: { season: number; episode: number; name: string };
}

export const DOT_COLORS: Record<MediaType, { normal: string; selected: string; glow: string }> = {
  [MediaType.Movie]:  { normal: 'bg-red-500',    selected: 'bg-red-400',    glow: 'shadow-red-500/60' },
  [MediaType.Series]: { normal: 'bg-blue-500',   selected: 'bg-blue-400',   glow: 'shadow-blue-500/60' },
  [MediaType.Anime]:  { normal: 'bg-violet-500', selected: 'bg-violet-400', glow: 'shadow-violet-500/60' },
  [MediaType.Other]:  { normal: 'bg-gray-500',   selected: 'bg-gray-400',   glow: '' },
};

export const TYPE_ICON: Record<string, React.ReactNode> = {
  [MediaType.Movie]:  <Film className="w-3 h-3" />,
  [MediaType.Series]: <Tv className="w-3 h-3" />,
  [MediaType.Anime]:  <Zap className="w-3 h-3" />,
};

export const TYPE_BADGE_COLOR: Record<string, string> = {
  [MediaType.Movie]:  'bg-red-500/10 text-red-400 border-red-500/20',
  [MediaType.Series]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [MediaType.Anime]:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

export const CalendarEntryRow: React.FC<{
  entry: CalendarEntry;
  onClick: () => void;
}> = ({ entry, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const colors = TYPE_BADGE_COLOR[entry.type] || '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex items-center gap-3 p-2.5 hover:bg-white/[0.04] cursor-pointer group transition-all rounded-xl border border-transparent hover:border-white/5 outline-none focus:bg-white/[0.04] focus:border-white/10"
    >
      <div className="relative w-9 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a] border border-white/5">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-3 h-3 text-gray-600" />
          </div>
        ) : (
          <OptimizedImage
            src={entry.item.posterUrl || ''}
            alt={entry.item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h5 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors leading-tight">
          {entry.item.title}
        </h5>
        <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
          {entry.label}
        </p>
      </div>

      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest flex-shrink-0 ${colors}`}>
        {TYPE_ICON[entry.type]}
      </div>
    </div>
  );
};

