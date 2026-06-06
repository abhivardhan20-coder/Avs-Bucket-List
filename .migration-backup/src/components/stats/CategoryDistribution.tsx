
import React from 'react';
import { Film, Tv, Zap } from 'lucide-react';

interface CategoryDistributionProps {
  counts: {
    movies: number;
    series: number;
    anime: number;
  };
}

const CategoryDistribution: React.FC<CategoryDistributionProps> = ({ counts }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-lg flex items-center gap-4 group hover:border-red-900/50 transition-colors">
        <div className="p-4 bg-red-900/20 rounded-full text-red-500 group-hover:scale-110 transition-transform">
          <Film className="w-8 h-8" />
        </div>
        <div>
          <div className="text-3xl font-bold text-white">{counts.movies}</div>
          <div className="text-sm text-gray-400 font-medium">Movies Watched</div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-lg flex items-center gap-4 group hover:border-blue-900/50 transition-colors">
        <div className="p-4 bg-blue-900/20 rounded-full text-blue-500 group-hover:scale-110 transition-transform">
          <Tv className="w-8 h-8" />
        </div>
        <div>
          <div className="text-3xl font-bold text-white">{counts.series}</div>
          <div className="text-sm text-gray-400 font-medium">Series Watched</div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-lg flex items-center gap-4 group hover:border-purple-900/50 transition-colors">
        <div className="p-4 bg-purple-900/20 rounded-full text-purple-500 group-hover:scale-110 transition-transform">
          <Zap className="w-8 h-8" />
        </div>
        <div>
          <div className="text-3xl font-bold text-white">{counts.anime}</div>
          <div className="text-sm text-gray-400 font-medium">Anime Watched</div>
        </div>
      </div>
    </div>
  );
};

export default CategoryDistribution;