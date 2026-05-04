import React from 'react';
import { Clock, X, Trash2 } from 'lucide-react';

interface SearchHistoryProps {
  history: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onSelect, onRemove, onClear }) => {
  if (history.length === 0) return null;

  return (
    <div className="mb-8 animate-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-3 h-3" /> Recent Searches
        </h4>
        <button 
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Clear History
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {history.map((term) => (
          <div 
            key={term}
            onClick={() => onSelect(term)}
            className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full text-sm text-gray-200 cursor-pointer transition-all duration-300"
          >
            <span>{term}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(term); }}
              className="p-0.5 rounded-full hover:bg-white/20 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;