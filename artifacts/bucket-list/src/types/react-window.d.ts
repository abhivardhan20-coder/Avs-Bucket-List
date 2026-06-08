declare module 'react-window' {
  import * as React from 'react';

  export interface ListChildComponentProps<T = any> {
    index: number;
    style: React.CSSProperties;
    data: T;
    isScrolling?: boolean;
  }

  export interface FixedSizeListProps<T = any> {
    children: React.ComponentType<ListChildComponentProps<T>>;
    className?: string;
    height: number;
    itemCount: number;
    itemSize: number;
    layout?: 'horizontal' | 'vertical';
    width: number | string;
    itemData?: T;
    itemKey?: (index: number, data: T) => React.Key;
    overscanCount?: number;
    style?: React.CSSProperties;
    useIsScrolling?: boolean;
    onScroll?: (props: { scrollDirection: 'forward' | 'backward'; scrollOffset: number; scrollUpdateWasRequested: boolean }) => void;
    onItemsRendered?: (props: { overscanStartIndex: number; overscanStopIndex: number; visibleStartIndex: number; visibleStopIndex: number }) => void;
    innerElementType?: React.ElementType;
    outerElementType?: React.ElementType;
    outerRef?: React.Ref<any>;
    ref?: React.Ref<FixedSizeList<T>>;
  }

  export class FixedSizeList<T = any> extends React.PureComponent<FixedSizeListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
  }

  export interface VariableSizeListProps<T = any> extends Omit<FixedSizeListProps<T>, 'itemSize'> {
    estimatedItemSize?: number;
    itemSize: (index: number) => number;
  }

  export class VariableSizeList<T = any> extends React.PureComponent<VariableSizeListProps<T>> {
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
  }
}
