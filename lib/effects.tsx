"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMediaQuery } from "@/hooks/use-media-query";

// Performance mode levels
export type PerformanceMode = "high" | "medium" | "low";

// Context to manage effects and performance settings across the app
interface EffectsContextType {
  // Current performance mode
  performanceMode: PerformanceMode;
  // Whether animations should be reduced
  shouldReduceAnimations: boolean;
  // Whether to disable certain effects completely
  shouldDisableEffects: boolean;
  // Target FPS for animations
  targetFPS: number;
  // Set performance mode manually
  setPerformanceMode: (mode: PerformanceMode) => void;
}

const EffectsContext = createContext<EffectsContextType | undefined>(undefined);

// EffectsProvider component that manages performance settings
export function EffectsProvider({ 
  children, 
  initialPerformance = "medium" 
}: { 
  children: ReactNode;
  initialPerformance?: PerformanceMode;
}) {
  // Check for system preferences
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isLowEndDevice = useMediaQuery("(prefers-reduced-motion), (max-width: 768px)");
  
  // State for performance mode
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(
    prefersReducedMotion ? "low" : initialPerformance
  );
  
  // Derive settings from performance mode
  const shouldReduceAnimations = performanceMode === "low" || performanceMode === "medium";
  const shouldDisableEffects = performanceMode === "low";
  const targetFPS = 
    performanceMode === "high" ? 60 :
    performanceMode === "medium" ? 30 : 15;
  
  // Detect device capabilities on mount
  useEffect(() => {
    const detectPerformance = () => {
      // Start with initial or current performance mode
      let detectedMode = performanceMode;
      
      // Check for battery status if available
      if ('getBattery' in navigator) {
        // @ts-ignore - getBattery may not be in the type definition but exists in some browsers
        navigator.getBattery().then((battery: any) => {
          const isLowBattery = battery.level < 0.2 && !battery.charging;
          if (isLowBattery) {
            setPerformanceMode("low");
          }
        }).catch(() => {
          // Ignore errors, fall back to other detection methods
        });
      }
      
      // Check for mobile or reduced motion preference
      if (prefersReducedMotion) {
        detectedMode = "low";
      } else if (isMobile) {
        detectedMode = "medium";
      }
      
      // Optional: Check for device memory API
      // @ts-ignore - memory API may not be in the type definition
      if (navigator.deviceMemory && navigator.deviceMemory < 4) {
        detectedMode = "low";
      }
      
      // Check for hardware concurrency (CPU cores)
      // @ts-ignore - hardwareConcurrency may not be in the type definition
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
        detectedMode = "low";
      }
      
      // Update if detection found something different
      if (detectedMode !== performanceMode) {
        setPerformanceMode(detectedMode);
      }
    };
    
    detectPerformance();
    
    // Handle visibility changes to save resources when tab is not visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Save the current mode to restore later
        document.body.dataset.lastPerformanceMode = performanceMode;
        setPerformanceMode("low");
      } else if (document.body.dataset.lastPerformanceMode) {
        // Restore previous mode when tab becomes visible again
        setPerformanceMode(document.body.dataset.lastPerformanceMode as PerformanceMode);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Add class to body to allow CSS optimizations
    document.body.dataset.performanceMode = performanceMode;
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [prefersReducedMotion, isMobile]);
  
  // Update body attribute when performanceMode changes
  useEffect(() => {
    document.body.dataset.performanceMode = performanceMode;
  }, [performanceMode]);
  
  // Provide the context values
  const value = {
    performanceMode,
    shouldReduceAnimations,
    shouldDisableEffects,
    targetFPS,
    setPerformanceMode,
  };
  
  return (
    <EffectsContext.Provider value={value}>
      {children}
    </EffectsContext.Provider>
  );
}

// Hook to use the effects context
export function useEffects() {
  const context = useContext(EffectsContext);
  if (context === undefined) {
    throw new Error('useEffects must be used within an EffectsProvider');
  }
  return context;
} 