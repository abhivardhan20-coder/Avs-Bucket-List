import { useState, useEffect, useCallback } from 'react';

export function useScrollArrows(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  dependency?: any
) {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const updateArrows = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 20);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
    }
  }, [scrollRef]);

  useEffect(() => {
    updateArrows();

    let timeout: ReturnType<typeof setTimeout>;
    const debouncedUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(updateArrows, 50);
    };

    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', debouncedUpdate);

    // Mutation observer for child updates
    const observer = new MutationObserver(debouncedUpdate);
    observer.observe(el, { childList: true, subtree: true });

    // Resize observer
    const resizeObserver = new ResizeObserver(debouncedUpdate);
    resizeObserver.observe(el);

    return () => {
      clearTimeout(timeout);
      el.removeEventListener('scroll', debouncedUpdate);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [scrollRef, updateArrows, dependency]);

  const scrollByAmount = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [scrollRef]);

  return {
    showLeftArrow,
    showRightArrow,
    scrollByAmount,
    updateArrows
  };
}
