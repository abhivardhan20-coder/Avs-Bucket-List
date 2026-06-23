'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { MediaItem, MediaType } from '../../types';
import OptimizedImage from '../OptimizedImage';

interface SearchPopularProps {
  loadingSuggestions: boolean;
  popularSuggestions: MediaItem[];
  handleResultClickInternal: (item: MediaItem) => void;
}

export const SearchPopular: React.FC<SearchPopularProps> = ({
  loadingSuggestions, popularSuggestions, handleResultClickInternal
}) => {
  if (!loadingSuggestions && popularSuggestions.length === 0) return null;

  return (
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
              role="button"
              tabIndex={0}
              onClick={() => handleResultClickInternal(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleResultClickInternal(item);
                }
              }}
              className="group cursor-pointer relative outline-none rounded-xl focus:ring-2 focus:ring-red-500"
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-gray-800 shadow-lg border border-white/5 group-hover:border-white/20 transition-all">
                <OptimizedImage 
                  src={item.posterUrl || ''} 
                  alt={item.title} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                />

                <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-full border border-white/10 text-[10px] font-bold text-white">
                  {index + 1}
                </div>

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
  );
};
