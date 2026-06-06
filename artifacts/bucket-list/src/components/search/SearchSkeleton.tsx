import React from 'react';

const SearchSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {[1, 2].map((section) => (
        <div key={section} className="space-y-4">
          <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((card) => (
              <div key={card} className="flex-shrink-0 w-[140px] md:w-[180px] space-y-3">
                <div className="h-[210px] md:h-[270px] bg-white/5 rounded-lg animate-pulse" />
                <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchSkeleton;