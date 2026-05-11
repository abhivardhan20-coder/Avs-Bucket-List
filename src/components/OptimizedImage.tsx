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
}

// ✅ PERFORMANCE OPTIMIZED: Responsive image sizes with lazy loading and fetchPriority
const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, alt, className = "", priority = false, sizes, width, height
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

  const hasValidSrc = src && src.length > 0;

  return (
    <div className={`relative overflow-hidden flex items-center justify-center bg-[#1a1a1a] ${className}`}>
      {!hasValidSrc ? (
        <div className="flex flex-col items-center justify-center opacity-20 py-4">
          <ImageOff className="w-10 h-10 mb-2" />
          <span className="text-[10px] uppercase font-black tracking-widest px-2 text-center">{alt}</span>
        </div>
      ) : (
        <>
          {!loaded && !error && (
            <div className="absolute inset-0 bg-[#1a1a1a]" />
          )}
          <img
            src={src || undefined}
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
            onError={() => setError(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ imageRendering: '-webkit-optimize-contrast' as any }}
          />
        </>
      )}
    </div>
  );
};

export default OptimizedImage;