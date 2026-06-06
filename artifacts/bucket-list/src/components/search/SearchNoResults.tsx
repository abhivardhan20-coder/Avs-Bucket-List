
import React from 'react';
import { Search, FilterX } from 'lucide-react';

interface SearchNoResultsProps {
  query: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

const GENRE_SUGGESTIONS = ['Action', 'Comedy', 'Horror', 'Sci-Fi', 'Anime'];

const SearchNoResults: React.FC<SearchNoResultsProps> = ({ query, hasFilters, onClearFilters }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-300">
      <div className="bg-white/5 p-6 rounded-full mb-6 border border-white/10 relative">
        <Search className="w-12 h-12 text-gray-500" />
        {hasFilters && (
          <div className="absolute -bottom-2 -right-2 bg-red-600 p-1.5 rounded-full border-2 border-[#141414]">
            <FilterX className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <h3 className="text-2xl font-bold text-white mb-2">
        {hasFilters ? "No matches with filters" : `No results found for "${query}"`}
      </h3>

      <p className="text-gray-400 max-w-md mb-6">
        {hasFilters
          ? "We found results for your search, but your active filters are hiding them."
          : "We couldn't find any matches. Try checking for typos or using a more general keyword."}
      </p>

      {hasFilters && onClearFilters ? (
        <button
          onClick={onClearFilters}
          className="px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-2 shadow-lg"
        >
          <FilterX className="w-4 h-4" />
          Clear Filters
        </button>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-gray-500 font-medium mb-3 uppercase tracking-wider">Or explore popular genres</p>
          <div className="flex flex-wrap justify-center gap-2">
            {GENRE_SUGGESTIONS.map(g => (
              <span key={g} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchNoResults;