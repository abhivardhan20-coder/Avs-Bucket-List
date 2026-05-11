
import React, { useState, useMemo } from 'react';
import { Loader, Calendar, BellOff, ChevronRight, Clock, Zap, Megaphone, List, ImageOff } from 'lucide-react';
import { MediaItem } from '../types';
import { NotificationItem } from '../hooks/useNotifications';
import UpcomingCalendar from './upcoming/UpcomingCalendar';
import OptimizedImage from './OptimizedImage';

interface NotificationPopoverProps {
  items: NotificationItem[];
  loading: boolean;
  onItemClick: (item: MediaItem) => void;
  onClose: () => void;
}

interface GroupedNotifications {
  today: NotificationItem[];
  upcoming: NotificationItem[];
  future: NotificationItem[];
}

// Subcomponent to handle individual image state
const NotificationRow: React.FC<{
  item: NotificationItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 p-3.5 hover:bg-white/[0.04] cursor-pointer group transition-all rounded-[1.5rem] border border-transparent hover:border-white/5"
    >
      <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#121212] shadow-xl border border-white/10">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center bg-[#252525]">
            <ImageOff className="w-4 h-4 text-gray-600" />
          </div>
        ) : (
          <OptimizedImage
            src={item.posterUrl || ''}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-0.5">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">
            {item.resolution.type === 'episode' ? item.title : (item.resolution.type === 'season' ? 'Season' : 'Movie')}
          </span>
          {item.resolution.daysRemaining === 0 && (
            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse">TODAY</span>
          )}
        </div>
        <h5 className="text-sm font-bold text-white truncate group-hover:text-red-500 transition-colors leading-tight mb-0.5">
          {item.resolution.type === 'episode' ? item.resolution.parentTitle : item.title}
        </h5>
        <p className="text-[10px] text-gray-400 font-medium truncate">
          {item.resolution.labelText}
        </p>
      </div>
      <ChevronRight className={`w-4 h-4 text-gray-700 transition-transform ${hovered ? 'translate-x-1 text-red-500' : ''}`} />
    </div>
  );
};

const NotificationPopover: React.FC<NotificationPopoverProps> = ({ items, loading, onItemClick, onClose }) => {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const grouped = useMemo((): GroupedNotifications => {
    const groups: GroupedNotifications = { today: [], upcoming: [], future: [] };
    items.forEach(item => {
      const dr = item.resolution.daysRemaining;

      if (dr === null) {
        groups.future.push(item);
      } else if (dr === 0) {
        groups.today.push(item);
      } else if (dr <= 7) {
        groups.upcoming.push(item);
      } else {
        groups.future.push(item);
      }
    });
    return groups;
  }, [items]);

  const renderSection = (title: string, icon: React.ReactNode, list: NotificationItem[]) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-6">
          <div className="text-red-600">{icon}</div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">{title}</h4>
        </div>
        <div className="space-y-1.5 px-3">
          {list.map((item) => (
            <NotificationRow
              key={`note-${item.id}`}
              item={item}
              onClick={() => { onItemClick(item); onClose(); }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute right-0 top-14 w-80 md:w-[380px] bg-[#0c0c0c] border border-white/10 rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in slide-in-from-top-3 z-[60] ring-1 ring-white/10">
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-600 rounded-xl shadow-[0_8px_20px_rgba(220,38,38,0.4)]">
            <Megaphone className="w-4 h-4 text-white fill-current" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Upcoming</h3>
            <p className="text-[9px] text-gray-500 font-bold tracking-widest mt-0.5 uppercase">
              {view === 'list' ? 'From your list' : 'Calendar View'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!loading && items.length > 0 && view === 'list' && (
            <div className="bg-red-900/30 px-2 py-0.5 rounded text-[10px] font-bold text-red-500 border border-red-900/50">
              {items.length} NEW
            </div>
          )}
          <button
            onClick={() => setView(view === 'list' ? 'calendar' : 'list')}
            className={`p-2 rounded-full transition-colors border ${view === 'calendar' ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'}`}
            title={view === 'list' ? "Switch to Calendar" : "Switch to List"}
          >
            {view === 'list' ? <Calendar className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto py-6 no-scrollbar bg-black/20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader className="w-6 h-6 text-red-600 animate-spin" />
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] animate-pulse">Syncing Dates...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-10">
            <div className="bg-white/[0.03] p-6 rounded-full mb-6 border border-white/5">
              <BellOff className="w-8 h-8 text-gray-700" />
            </div>
            <h4 className="text-gray-300 font-bold text-sm mb-2">No Upcoming Releases</h4>
            <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
              Add upcoming movies or series to your Watchlist to get notified when they release.
            </p>
          </div>
        ) : (
          view === 'list' ? (
            <div className="space-y-2 animate-in fade-in">
              {renderSection("Happening Today", <Zap className="w-3.5 h-3.5 fill-current animate-bounce" />, grouped.today)}
              {renderSection("This Week", <Clock className="w-3.5 h-3.5" />, grouped.upcoming)}
              {renderSection("Future Releases", <Calendar className="w-3.5 h-3.5" />, grouped.future)}
            </div>
          ) : (
            <UpcomingCalendar
              onItemClick={(item) => { onItemClick(item); onClose(); }}
            />
          )
        )}
      </div>

      <div className="p-3 bg-black/60 backdrop-blur-md border-t border-white/5 text-center">
        <p className="text-[9px] text-gray-600 font-bold">Auto-updates based on your list</p>
      </div>
    </div>
  );
};

export default NotificationPopover;