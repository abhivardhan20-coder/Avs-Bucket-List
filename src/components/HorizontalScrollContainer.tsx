
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const updateArrows = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 20);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
    }
  }, []);

  useEffect(() => {
    updateArrows();

    // Mutation observer to catch dynamically loaded content
    const observer = new MutationObserver(updateArrows);
    if (scrollRef.current) {
      observer.observe(scrollRef.current, { childList: true, subtree: true });
    }

    // Resize observer for container dimension changes (handles window resize too)
    let resizeObserver: ResizeObserver | null = null;
    if (scrollRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateArrows();
      });
      resizeObserver.observe(scrollRef.current);
    }

    return () => {
      observer.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateArrows]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    updateArrows();
    if (externalOnScroll) externalOnScroll(e);
  };


  const scrollByAmount = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
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
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className={`flex overflow-x-auto no-scrollbar scroll-smooth outline-none snap-x snap-mandatory touch-pan-x py-6`}
        style={itemGap ? { gap: `${itemGap}px` } : { gap: '1rem' }}
      >
        {children}
      </div>
    </div>
  );
};

export default HorizontalScrollContainer;