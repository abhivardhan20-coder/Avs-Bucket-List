import React from 'react';

export const ContentCardSkeleton: React.FC = () => (
  <div className="flex-none w-[160px] md:w-[200px] aspect-[2/3] rounded-2xl bg-white/5 animate-pulse border border-white/10" />
);

export const ContentRowSkeleton: React.FC = () => (
  <div className="space-y-4 py-4">
    <div className="flex items-center justify-between px-4 md:px-12">
      <div className="h-6 w-32 bg-white/10 rounded-md animate-pulse" />
      <div className="h-4 w-16 bg-white/5 rounded-md animate-pulse" />
    </div>
    <div className="flex gap-4 overflow-hidden px-4 md:px-12">
      {[1, 2, 3, 4, 5, 6].map(i => <ContentCardSkeleton key={i} />)}
    </div>
  </div>
);

export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse border border-white/10" />
    ))}
  </div>
);
