'use client';

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean; // true only for above-the-fold hero
  sizes?: string;
  width?: number;
  height?: number;
  onError?: () => void;
}

// ✅ PERFORMANCE OPTIMIZED: Responsive image sizes with lazy loading and fetchPriority
const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, alt, className = "", priority = false, sizes, width, height, onError: onErrorProp
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  // Reset loaded/error state when src actually changes (during render)
  if (src !== prevSrc) {
    setPrevSrc(src);
    setLoaded(false);
    setError(false);
  }

  // Bulletproof fallback: If the ISP completely blocks TMDB domains,
  // route the image through the highly reliable wsrv.nl global proxy.
  let optimizedSrc = src;
  if (src && (src.includes('tmdb.org') || src.includes('themoviedb.org'))) {
    optimizedSrc = `https://wsrv.nl/?url=${encodeURIComponent(src)}`;
  }

  const hasValidSrc = optimizedSrc && optimizedSrc.length > 0;

  return (
    <div className={`relative overflow-hidden flex items-center justify-center bg-[#1a1a1a] ${className}`}>
      {!hasValidSrc || error ? (
        <div className="flex flex-col items-center justify-center w-full h-full p-4 text-center select-none bg-gradient-to-br from-[#1c1c1e] to-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
          <ImageOff className="w-8 h-8 mb-3 text-gray-500 animate-pulse" />
          <span className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-wide break-words w-full px-2 line-clamp-2 leading-normal">
            {alt || 'No Title'}
          </span>
          <span className="text-[8px] text-red-400 break-all w-full mt-2 font-mono opacity-50">
            {optimizedSrc || 'NO_SRC'}
          </span>
        </div>
      ) : (
        <>
          {!loaded && !error && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#2c2c2e] via-[#1c1c1e] to-[#0a0a0a] animate-pulse rounded-2xl border border-white/5" />
          )}
          <img
            src={optimizedSrc || undefined}
            alt={alt}
            width={width}
            height={height}
            // ✅ Lazy loading for off-screen images, eager for above-the-fold
            loading={priority ? 'eager' : 'lazy'}
            // ✅ High fetch priority for above-fold images only
            fetchPriority={priority ? 'high' : 'auto'}
            // ✅ Async decoding to avoid blocking main thread
            decoding="async"
            sizes={sizes ?? (priority ? '100vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px')}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setError(true);
              onErrorProp?.();
            }}
            className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ imageRendering: '-webkit-optimize-contrast' as any }}
          />
        </>
      )}
    </div>
  );
};

export default OptimizedImage;
