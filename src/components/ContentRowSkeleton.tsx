import React from 'react';
import HorizontalScrollContainer from './HorizontalScrollContainer';

export const ContentRowSkeleton = () => (
    <div className="space-y-4">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/10 animate-pulse" />
            <div className="h-6 w-48 rounded bg-white/10 animate-pulse" />
        </div>
        <HorizontalScrollContainer>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-none w-[160px] md:w-[220px] h-[240px] md:h-[330px] rounded-xl bg-white/5 animate-pulse" />
            ))}
        </HorizontalScrollContainer>
    </div>
);
