
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollArrows } from '@/hooks/useScrollArrows';

interface HorizontalScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  itemGap?: number;
}

const HorizontalScrollContainer: React.FC<HorizontalScrollContainerProps> = ({
  children,
  className = "",
  onScroll: externalOnScroll,
  itemGap
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeftArrow, showRightArrow, scrollByAmount, updateArrows } = useScrollArrows(scrollRef, children);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    updateArrows();
    if (externalOnScroll) externalOnScroll(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      scrollByAmount('left');
    } else if (e.key === 'ArrowRight') {
      scrollByAmount('right');
    }
  };

  return (
    <div className={`relative group/horizontal-scroll ${className}`}>
      {/* Left Arrow Overlay */}
      <button
        onClick={(e) => { e.stopPropagation(); scrollByAmount('left'); }}
        className={`absolute left-0 top-0 bottom-0 z-50 w-12 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-300 ${showLeftArrow ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}
        aria-label="Scroll Left"
        disabled={!showLeftArrow}
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      {/* Right Arrow Overlay */}
      <button
        onClick={(e) => { e.stopPropagation(); scrollByAmount('right'); }}
        className={`absolute right-0 top-0 bottom-0 z-50 w-12 bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-300 ${showRightArrow ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}
        aria-label="Scroll Right"
        disabled={!showRightArrow}
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Edge Gradients */}
      <div className={`absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#141414] to-transparent z-20 pointer-events-none transition-opacity duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#141414] to-transparent z-20 pointer-events-none transition-opacity duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`} />

      {/* Scrollable Area */}
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Scrollable list"
        className={`flex overflow-x-auto no-scrollbar scroll-smooth outline-none snap-x snap-mandatory touch-pan-x py-6 gap-2 md:gap-3`}
        style={itemGap ? { gap: `${itemGap}px` } : undefined}
      >
        {children}
      </div>
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
    </div>
  );
};

export default HorizontalScrollContainer;