import { useCallback, useEffect, useState } from 'react';

interface ViewportDimensions {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  vh: number;
}

/**
 * Hook to track viewport dimensions and provide responsive helpers
 */
export function useViewport(): ViewportDimensions {
  const [dimensions, setDimensions] = useState<ViewportDimensions>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    vh: typeof window !== 'undefined' ? window.innerHeight * 0.01 : 8,
  });

  const updateDimensions = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const vh = height * 0.01; // 1% of viewport height
    
    setDimensions({
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      vh,
    });
    
    // Set CSS variable for viewport height to handle mobile browsers more reliably
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }, []);

  useEffect(() => {
    // Initialize on mount
    updateDimensions();
    
    // Add event listener
    window.addEventListener('resize', updateDimensions);
    
    // Clean up
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  return dimensions;
} 