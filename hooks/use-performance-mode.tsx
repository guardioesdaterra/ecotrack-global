"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useMediaQuery } from "@/hooks/use-media-query";

// Performance mode levels
export type PerformanceMode = "high" | "medium" | "low";

// Context to manage performance settings across the app
interface PerformanceContextType {
  // Current performance mode
  performanceMode: PerformanceMode;
  // Whether animations should be reduced
  shouldReduceAnimations: boolean;
  // Whether to disable certain effects completely
  shouldDisableEffects: boolean;
  // Maximum FPS to target
  targetFPS: number;
  // Set performance mode manually
  setPerformanceMode: (mode: PerformanceMode) => void;
  // Otimizador de navegação entre páginas
  optimizeForNavigation: (isNavigating: boolean) => void;
  // Status atual da navegação
  isNavigating: boolean;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function PerformanceProvider({ children }: { children: ReactNode }) {
  // Check for system preferences
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isLowEndDevice = useMediaQuery("(max-width: 768px), (prefers-reduced-motion)");
  
  // State for performance mode and navigation state
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("medium");
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fpsDetectionDone = useRef(false);
  const previousPerformanceModeRef = useRef<PerformanceMode>("medium");
  const visibilityModeRef = useRef<PerformanceMode>("medium");
  const lastUrlRef = useRef(typeof window !== 'undefined' ? window.location.href : '');
  
  // Auto-detect device capabilities more aggressively
  useEffect(() => {
    const detectPerformance = () => {
      // Start with a reasonable default
      let detectedMode: PerformanceMode = "medium";
      
      // Check for battery status
      if ('getBattery' in navigator) {
        // @ts-ignore - getBattery may not be in all type definitions
        navigator.getBattery().then((battery: any) => {
          const isLowBattery = battery.level < 0.3 && !battery.charging;
          if (isLowBattery) {
            setPerformanceMode("low");
          }
        }).catch(() => {
          // Silently fail and continue with other detection methods
        });
      }
      
      // Browser memory
      // @ts-ignore - deviceMemory não está em todas as definições de tipo
      const memory = navigator.deviceMemory;
      if (memory !== undefined && memory < 4) {
        detectedMode = "low";
      }
      
      // CPU cores check
      const cores = navigator.hardwareConcurrency || 0;
      if (cores < 4) {
        detectedMode = "low";
      } else if (cores < 8) {
        detectedMode = "medium";
      }
      
      // Device type detection
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobileDevice) {
        detectedMode = cores <= 6 ? "low" : "medium";
      }
      
      // Reduced motion preference from OS
      if (prefersReducedMotion) {
        detectedMode = "low";
      }
      
      // Only run FPS detection once on mount
      if (!fpsDetectionDone.current) {
        fpsDetectionDone.current = true;
        
        // FPS check to detect slow rendering
        detectFPS().then(fps => {
          if (fps < 30) {
            setPerformanceMode("low");
          } else if (fps < 55 && detectedMode !== "low" && detectedMode !== "medium") {
            setPerformanceMode("medium");
          } else if (detectedMode !== performanceMode) {
            setPerformanceMode(detectedMode);
          }
        });
      } else if (detectedMode !== performanceMode) {
        setPerformanceMode(detectedMode);
      }
    };
    
    // FPS detection função assíncrona
    const detectFPS = async (): Promise<number> => {
      return new Promise(resolve => {
        let startTime = performance.now();
        let frameCount = 0;
        let rafId: number;
        
        const countFrames = () => {
          frameCount++;
          const currentTime = performance.now();
          const elapsedTime = currentTime - startTime;
          
          if (elapsedTime >= 1000) {
            // Calculate FPS
            const fps = Math.round(frameCount * 1000 / elapsedTime);
            cancelAnimationFrame(rafId);
            resolve(fps);
            return;
          }
          
          rafId = requestAnimationFrame(countFrames);
        };
        
        rafId = requestAnimationFrame(countFrames);
        
        // Set a timeout to ensure we resolve even if requestAnimationFrame has issues
        setTimeout(() => {
          cancelAnimationFrame(rafId);
          const fps = Math.round(frameCount * 1000 / (performance.now() - startTime));
          resolve(fps || 60); // Default to 60 if calculation fails
        }, 2000);
      });
    };
    
    // Run detection on mount
    detectPerformance();
    
    // Also detect when the page is fully loaded, but only once
    const handleLoad = () => {
      detectPerformance();
      window.removeEventListener('load', handleLoad);
    };
    window.addEventListener('load', handleLoad);
    
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, [prefersReducedMotion, isMobile]); // Remove performanceMode from dependencies
  
  // Otimizador para navegação entre páginas
  const optimizeForNavigation = (navigating: boolean) => {
    // Limpar o timer existente se houver
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }
    
    // Durante a navegação, reduzir temporariamente as animações
    if (navigating) {
      setIsNavigating(true);
      
      // Armazenar o modo anterior para restaurar depois
      previousPerformanceModeRef.current = performanceMode;
      
      // Forçar modo baixo durante navegação
      setPerformanceMode("low");
    } else {
      // Definir um temporizador para restaurar após a navegação
      const timer = setTimeout(() => {
        setIsNavigating(false);
        
        // Restaurar modo anterior
        setPerformanceMode(previousPerformanceModeRef.current);
      }, 300); // Pequeno delay para garantir que a página esteja estável
      
      navigationTimerRef.current = timer;
    }
  };
  
  // Handle visibility changes (background/foreground)
  useEffect(() => {
    // Update the ref whenever performanceMode changes
    visibilityModeRef.current = performanceMode;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Store current mode in ref (already updated above)
        setPerformanceMode("low");
      } else {
        // Restore from ref when visible again
        setPerformanceMode(visibilityModeRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [performanceMode]);
  
  // Aplicar o modo de desempenho ao elemento body para controles CSS
  useEffect(() => {
    document.body.dataset.performanceMode = performanceMode;
  }, [performanceMode]);
  
  // Capturar eventos de navegação do Next.js
  useEffect(() => {
    // Initialize URL ref if it's a browser environment
    if (typeof window !== 'undefined') {
      lastUrlRef.current = window.location.href;
    }
    
    // Observer para detectar mudanças na URL que indicam navegação
    const urlObserverCallback = () => {
      if (lastUrlRef.current !== window.location.href) {
        lastUrlRef.current = window.location.href;
        optimizeForNavigation(true);
        setTimeout(() => optimizeForNavigation(false), 300);
      }
    };
    
    // Capture more navigation events to better handle transitions
    const captureNavigationEvents = () => {
      window.addEventListener('popstate', urlObserverCallback);
      
      // Also listen for click events on links to preemptively optimize
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const closestLink = target.closest('a');
        
        if (closestLink && 
            closestLink.getAttribute('href') && 
            closestLink.getAttribute('href')?.startsWith('/') && 
            !closestLink.getAttribute('target')) {
          // Internal navigation is about to happen
          optimizeForNavigation(true);
        }
      });
      
      // Prefetch strategy - prefetch links in viewport
      if ('IntersectionObserver' in window && performanceMode !== 'low') {
        const prefetchObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const link = entry.target as HTMLAnchorElement;
              const href = link.getAttribute('href');
              
              if (href && href.startsWith('/')) {
                // Pre-warm the route
                const prefetcher = document.createElement('link');
                prefetcher.rel = 'prefetch';
                prefetcher.href = href;
                prefetcher.as = 'document';
                document.head.appendChild(prefetcher);
                
                // Stop observing once prefetched
                prefetchObserver.unobserve(link);
              }
            }
          });
        }, {
          rootMargin: '200px', // Start prefetching before links are in view
          threshold: 0
        });
        
        // Observe navigation links
        setTimeout(() => {
          document.querySelectorAll('a[href^="/"]').forEach(link => {
            prefetchObserver.observe(link);
          });
        }, 2000); // Delay to prioritize initial page load
      }
    };
    
    // Next.js hydration safe check
    if (typeof window !== 'undefined') {
      // Run after hydration is complete
      if (document.readyState === 'complete') {
        captureNavigationEvents();
      } else {
        window.addEventListener('load', captureNavigationEvents, { once: true });
      }
    }
    
    return () => {
      window.removeEventListener('popstate', urlObserverCallback);
      window.removeEventListener('load', captureNavigationEvents);
    };
  }, [optimizeForNavigation, performanceMode]);
  
  // Derive settings from performance mode
  const shouldReduceAnimations = performanceMode === "low" || performanceMode === "medium" || isNavigating;
  const shouldDisableEffects = performanceMode === "low" || isNavigating;
  const targetFPS = performanceMode === "low" ? 30 : performanceMode === "medium" ? 45 : 60;
  
  return (
    <PerformanceContext.Provider
      value={{
        performanceMode,
        shouldReduceAnimations,
        shouldDisableEffects,
        targetFPS,
        setPerformanceMode,
        optimizeForNavigation,
        isNavigating
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformanceMode() {
  const context = useContext(PerformanceContext);
  
  if (context === undefined) {
    throw new Error("usePerformanceMode must be used within a PerformanceProvider");
  }
  
  return context;
} 