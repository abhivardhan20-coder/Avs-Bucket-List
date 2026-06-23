'use client';

import React from 'react';
import { Calendar, User } from 'lucide-react';
import { MediaItem } from '../../types';

interface ContentSidePanelProps {
  item: MediaItem;
  upcomingRes: { labelText: string } | null;
  handlePersonClick: (name: string, role: 'actor' | 'director') => void;
}

const ContentSidePanel: React.FC<ContentSidePanelProps> = ({ item, upcomingRes, handlePersonClick }) => {
  return (
    <div className="lg:col-span-4 space-y-12">
      {item.nextEpisode && (
        <div className="bg-red-600/10 border border-red-600/30 p-8 rounded-3xl shadow-2xl">
          <span className="text-red-500 font-black text-[10px] uppercase tracking-widest block mb-4 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Next Release
          </span>
          <p className="text-white font-black text-2xl mb-2">{item.nextEpisode.name || `Episode ${item.nextEpisode.episodeNumber}`}</p>
          <p className="text-gray-400 font-bold text-sm">Season {item.nextEpisode.seasonNumber} • {item.nextEpisode.airDate}</p>
          {upcomingRes && <p className="text-red-600 font-black text-3xl mt-6 animate-pulse">{upcomingRes.labelText}</p>}
        </div>
      )}

      <div className="space-y-10">
        <div>
          <span className="text-gray-500 font-black text-[10px] uppercase tracking-widest block mb-6">Starring</span>
          <div className="flex flex-wrap gap-2">
            {item.cast?.slice(0, 10).map(actor => (
              <button key={actor} onClick={() => handlePersonClick(actor, 'actor')} className="px-4 py-2 bg-white/5 hover:bg-red-600/20 text-gray-300 hover:text-red-500 rounded-xl text-xs font-bold transition-all border border-white/5">{actor}</button>
            ))}
          </div>
        </div>
        {item.director && (
          <div>
            <span className="text-gray-500 font-black text-[10px] uppercase tracking-widest block mb-6">Director</span>
            <button onClick={() => handlePersonClick(item.director!, 'director')} className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all w-full text-left group">
              <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><User className="w-6 h-6" /></div>
              <div><p className="text-white font-black text-sm">{item.director}</p><p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Director</p></div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentSidePanel;
