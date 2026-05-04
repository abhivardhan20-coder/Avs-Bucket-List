/**
 * Virtualization Utilities for Large Datasets
 * ============================================
 * Performance optimization for rendering large lists of items.
 * 
 * This module provides React components and hooks for efficient rendering
 * of large datasets using virtualization (windowing) techniques.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface VirtualizationConfig {
  itemHeight: number;
  bufferSize?: number;
  containerHeight: number;
  totalItems: number;
}

/**
 * Hook for managing virtualized list rendering
 * 
 * ✅ OPTIMIZATION: Only renders items in the visible viewport + buffer
 * This dramatically improves performance for lists with 100+ items
 */
export const useVirtualization = (config: VirtualizationConfig) => {
  const { itemHeight, bufferSize = 5, containerHeight, totalItems } = config;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
  const endIndex = Math.min(
    totalItems,
    startIndex + visibleItemsCount + bufferSize * 2
  );

  const visibleItems = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);
  const offsetY = startIndex * itemHeight;
  const totalHeight = totalItems * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    containerRef,
    handleScroll,
    visibleItems,
    offsetY,
    totalHeight,
    startIndex,
  };
};

/**
 * Virtual List Component
 * 
 * ✅ OPTIMIZATION: Renders only visible items in the viewport
 * Perfect for large datasets without sacrificing user experience
 * 
 * @example
 * ```tsx
 * <VirtualList
 *   items={myLargeArray}
 *   itemHeight={64}
 *   containerHeight={500}
 *   renderItem={(item, index) => <div>{item.name}</div>}
 * />
 * ```
 */
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  bufferSize?: number;
  className?: string;
}

export const VirtualList = React.forwardRef<HTMLDivElement, VirtualListProps<any>>(
  ({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    bufferSize = 5,
    className = '',
  }, ref) => {
    const {
      containerRef,
      handleScroll,
      visibleItems,
      offsetY,
      totalHeight,
    } = useVirtualization({
      itemHeight,
      bufferSize,
      containerHeight,
      totalItems: items.length,
    });

    // Use provided ref if available
    const actualRef = (ref as any) || containerRef;

    return (
      <div
        ref={actualRef}
        onScroll={handleScroll}
        className={`overflow-y-auto ${className}`}
        style={{ height: containerHeight }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((index) => (
              <div
                key={index}
                style={{ height: itemHeight, position: 'relative' }}
              >
                {renderItem(items[index], index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

VirtualList.displayName = 'VirtualList';

/**
 * Grid Virtualization Hook
 * 
 * ✅ OPTIMIZATION: 2D virtualization for grid layouts
 * Ideal for image galleries or card-based layouts
 */
export const useVirtualGrid = (config: VirtualizationConfig & { columnCount: number }) => {
  const { columnCount, ...rest } = config;
  const virtualization = useVirtualization(rest);
  
  const itemsPerRow = columnCount;
  const visibleRows = Array.from(
    { length: Math.ceil(virtualization.visibleItems.length / itemsPerRow) },
    (_, i) => i
  );

  return {
    ...virtualization,
    visibleRows,
    itemsPerRow,
  };
};

/**
 * Performance optimization wrapper for large lists
 * 
 * ✅ OPTIMIZATION: Memoizes render function to prevent unnecessary re-renders
 */
export const createVirtualizedRenderer = <T,>(
  renderItem: (item: T, index: number) => React.ReactNode
) => {
  return React.memo(({ item, index }: { item: T; index: number }) => (
    <>{renderItem(item, index)}</>
  ));
};

/**
 * Pagination-based alternative to virtualization
 * 
 * ✅ OPTIMIZATION: Load data in chunks for better initial load time
 * Use when:
 * - Data is fetched from API (not already in memory)
 * - User expects pagination
 * - Full dataset is very large (1000+ items)
 */
export const usePaginatedList = <T,>(
  items: T[],
  itemsPerPage: number = 20
) => {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  }, [currentPage]);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage: currentPage < totalPages - 1,
    hasPreviousPage: currentPage > 0,
  };
};
