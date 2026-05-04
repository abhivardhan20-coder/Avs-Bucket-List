
import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="relative w-[160px] md:w-[200px] aspect-[2/3] bg-white/5 rounded-2xl overflow-hidden border border-white/10 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end gap-2">
        <div className="h-4 bg-white/10 rounded-md w-3/4" />
        <div className="flex gap-2">
          <div className="h-3 bg-white/5 rounded-md w-10" />
          <div className="h-3 bg-white/5 rounded-md w-16" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;