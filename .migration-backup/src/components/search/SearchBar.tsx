import React, { forwardRef } from 'react';
import { Search, X, Loader } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  isLoading: boolean;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(({ value, onChange, onClear, isLoading }, ref) => {
  return (
    <div className="relative group">
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-purple-600 rounded-full opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
      
      <div className="relative flex items-center bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 rounded-full shadow-2xl transition-all duration-300 focus-within:border-white/30 focus-within:bg-[#202020]">
        <div className="pl-6 text-gray-400">
          <Search className="w-6 h-6" />
        </div>
        
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search movies, TV shows & anime..."
          className="w-full bg-transparent text-lg md:text-xl font-medium text-white placeholder-gray-500 px-4 py-4 md:py-5 outline-none"
          autoComplete="off"
        />

        <div className="pr-4 flex items-center gap-2">
          {isLoading && (
            <Loader className="w-5 h-5 text-gray-500 animate-spin" />
          )}
          
          {value && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-gray-500 border border-white/5 ml-2">
            <span>ESC</span>
          </div>
        </div>
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;