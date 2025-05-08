"use client";

import { useEffect } from "react";
import { useViewport } from "@/lib/store/app-store";

/**
 * ViewportFix component
 * 
 * Handles mobile viewport height issues by using Zustand store
 * for viewport metrics rather than direct DOM manipulation.
 * 
 * This approach centralizes viewport state and allows components
 * to react to changes in a more React-friendly way.
 */
export function ViewportFix() {
  const { updateViewport } = useViewport();
  
  useEffect(() => {
    // Function to update viewport measurements
    const updateViewportMeasurements = () => {
      const height = window.innerHeight;
      const width = window.innerWidth;
      
      // Update the Zustand store
      updateViewport({
        height,
        width,
        isMobile: width < 768,
      });
      
      // Still set CSS variable for legacy components
      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
      
      // Also update any Leaflet map containers for consistent sizing
      const mapElements = document.querySelectorAll('.leaflet-container');
      mapElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.height = `calc(100 * var(--vh))`;
        }
      });
    };
    
    // Update measurements immediately
    updateViewportMeasurements();
    
    // Set up event listeners
    window.addEventListener('resize', updateViewportMeasurements);
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure accurate calculations after orientation change
      setTimeout(updateViewportMeasurements, 100);
    });
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('resize', updateViewportMeasurements);
      window.removeEventListener('orientationchange', () => {
        setTimeout(updateViewportMeasurements, 100);
      });
    };
  }, [updateViewport]);
  
  // Component doesn't render anything in the DOM
  return null;
}

export default ViewportFix; 