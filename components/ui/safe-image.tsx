"use client"

import React, { useEffect, useState } from "react"
import Image, { ImageProps } from "next/image"

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallbackSrc?: string;
}

export function SafeImage({ 
  src, 
  alt, 
  fallbackSrc = '/placeholder-image.jpg',
  ...props 
}: SafeImageProps) {
  // Use data URI as ultimate fallback if no fallbackSrc provided
  const defaultFallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwMCIgaGVpZ2h0PSI1MDAiIGZpbGw9IiMzRDRBNUMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIzNnB4IiBmaWxsPSJ3aGl0ZSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
  
  // State to track the current image source and error state
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    if (typeof src === 'string' && src) return src;
    return fallbackSrc || defaultFallback;
  });
  
  const [hasError, setHasError] = useState(false);
  
  // Update source if the prop changes
  useEffect(() => {
    if (typeof src === 'string' && src) {
      setCurrentSrc(src);
      setHasError(false);
    }
  }, [src]);
  
  // Determine if we should skip Next.js image optimization
  const isSupabaseUrl = typeof currentSrc === 'string' && 
    (currentSrc.includes('supabase.co') || currentSrc.startsWith('data:'));
  
  // Handle image load error
  const handleError = () => {
    console.warn(`Failed to load image: ${currentSrc}`);
    
    // If we're already using the fallback and it fails, use the default fallback
    if (currentSrc === fallbackSrc) {
      setCurrentSrc(defaultFallback);
    } 
    // Otherwise, try the provided fallback
    else if (fallbackSrc && currentSrc !== defaultFallback) {
      setCurrentSrc(fallbackSrc);
    } 
    // If no fallback provided or already tried, use default
    else {
      setCurrentSrc(defaultFallback);
    }
    
    setHasError(true);
  };
  
  // Return the Image component with error handling
  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt || 'Image'}
      onError={handleError}
      unoptimized={isSupabaseUrl}
    />
  );
} 