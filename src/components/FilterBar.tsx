
import React, { useState, useRef, useEffect } from 'react';
import { Filter, Calendar, Film, Tv, Zap, ChevronDown, Check } from 'lucide-react';
import { MediaType } from '../types';
import HorizontalScrollContainer from './HorizontalScrollContainer';

const GENRES = [
  'All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War'
];

const currentYear = new Date().getFullYear();
const YEARS = ['All', ...Array.from({ length: currentYear - 1950 + 2 }, (_, i) => (currentYear + 1 - i).toString())];

const TYPES = [
  { label: 'All', value: 'All', icon: Filter },
  { label: 'Movies', value: MediaType.Movie, icon: Film },
  { label: 'Series', value: MediaType.Series, icon: Tv },
  { label: 'Anime', value: MediaType.Anime, icon: Zap },
];

interface FilterBarProps {
  selectedType: 'All' | MediaType;
  setSelectedType: (type: 'All' | MediaType) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedGenre: string[];
  setSelectedGenre: (genre: string[]) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedType, setSelectedType,
  selectedYear, setSelectedYear,
  selectedGenre, setSelectedGenre
}) => {
  const [openDropdown, setOpenDropdown] = useState<'type' | 'year' | null>(null);
  const [yearInput, setYearInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleGenreClick = (genre: string) => {
    if (genre === 'All') {
      setSelectedGenre(['All']);
      return;
    }

    if (selectedGenre.includes('All')) {
      setSelectedGenre([genre]);
    } else {
      if (selectedGenre.includes(genre)) {
        const next = selectedGenre.filter(g => g !== genre);
        setSelectedGenre(next.length === 0 ? ['All'] : next);
      } else {
        setSelectedGenre([...selectedGenre, genre]);
      }
    }
  };

  const handleToggleYearDropdown = () => {
    const nextState = openDropdown === 'year' ? null : 'year';
    if (nextState === 'year') {
      setYearInput(selectedYear === 'All' ? '' : selectedYear);
    }
    setOpenDropdown(nextState);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-4 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-wrap items-center gap-3 relative z-30" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all min-w-[140px] justify-between ${openDropdown === 'type' || selectedType !== 'All'
                ? 'bg-white text-black border-white'
                : 'bg-[#1f1f1f] text-gray-300 border-gray-800 hover:bg-[#2a2a2a] hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2">
              {(() => {
                const t = TYPES.find(t => t.value === selectedType);
                const Icon = t?.icon || Filter;
                return <Icon className="w-4 h-4" />;
              })()}
              <span>{TYPES.find(t => t.value === selectedType)?.label || 'Type'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === 'type' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'type' && (
            <div className="absolute top-full left-0 mt-2 w-full min-w-[160px] bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
              {TYPES.map(t => (
                <button
                  key={t.label}
                  onClick={() => { setSelectedType(t.value as 'All' | MediaType); setOpenDropdown(null); }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors ${selectedType === t.value
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <t.icon className={`w-4 h-4 ${selectedType === t.value ? 'text-white' : 'text-gray-500'}`} />
                  {t.label}
                  {selectedType === t.value && <Check className="w-3.5 h-3.5 ml-auto text-red-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={handleToggleYearDropdown}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all min-w-[120px] justify-between ${openDropdown === 'year' || selectedYear !== 'All'
                ? 'bg-white text-black border-white'
                : 'bg-[#1f1f1f] text-gray-300 border-gray-800 hover:bg-[#2a2a2a] hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{selectedYear === 'All' ? 'Year' : selectedYear}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openDropdown === 'year' ? 'rotate-180' : ''}`} />
          </button>

          {openDropdown === 'year' && (
            <div className="absolute top-full left-0 mt-2 w-40 max-h-60 overflow-hidden bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col z-50">
              <div className="p-3 border-b border-gray-800 bg-[#1f1f1f]">
                <input
                  type="text"
                  value={yearInput}
                  placeholder="Type year..."
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 4) {
                      setYearInput(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (yearInput.length === 4) {
                        setSelectedYear(yearInput);
                        setOpenDropdown(null);
                      } else if (yearInput === '') {
                        setSelectedYear('All');
                        setOpenDropdown(null);
                      }
                    }
                  }}
                  className="w-full bg-[#141414] text-white text-xs px-2 py-2 rounded-lg border border-gray-700 focus:border-red-500 outline-none font-bold text-center placeholder-gray-600"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto flex-1 no-scrollbar">
                {YEARS.map(year => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setOpenDropdown(null); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors border-l-2 ${selectedYear === year
                        ? 'border-red-500 bg-white/5 text-white'
                        : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full overflow-hidden relative">
        <HorizontalScrollContainer itemGap={8} className="w-full">
          <span className="text-[10px] font-black text-gray-600 uppercase mr-2 flex-shrink-0 flex items-center gap-1 self-center">
            <Filter className="w-3 h-3" /> Genre
          </span>
          {GENRES.map(genre => {
            const isSelected = selectedGenre.includes(genre);
            return (
              <button
                key={genre}
                onClick={() => handleGenreClick(genre)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isSelected
                    ? 'bg-white text-black border-white'
                    : 'bg-[#1f1f1f] text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white'
                  }`}
              >
                {genre}
              </button>
            );
          })}
        </HorizontalScrollContainer>
      </div>
    </div>
  );
};