"use client"

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Activity } from './types';
import { useOverlay } from '@/contexts/overlay-context';
import { MapContainer } from './MapContainer';
import { Overlay } from '../overlay';
import { useMediaQuery } from '@/hooks/use-media-query';

interface MapClientProps {
  activities?: Activity[] | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  stadiaApiKey?: string | null;
}

export function MapClient({
  activities = [],
  isLoading = false,
  error = null,
  className,
  stadiaApiKey
}: MapClientProps) {
  const { showOverlay, hideOverlay } = useOverlay();
  const { resolvedTheme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Generate a truly unique ID for this particular instance of the map
  const uniqueMapId = useMemo(() => `map-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, []);
  const instanceIdRef = useRef<string>(uniqueMapId);
  const hasUnmountedRef = useRef(false);
  const containerRefReady = useRef(false);
  
  // PRE-MOUNT: Prepare the DOM for a clean mount even before React renders
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Force clear any global state
      window._leafletMapInstance = undefined;
      window._leafletMapContainer = undefined;
      window._leafletInitInProgress = false;
      
      // Ensure we have a clean slate for leaflet by creating a dedicated container
      // with a unique ID for this specific map instance
      const attemptDomPreparation = () => {
        try {
          // Check for the standard map container
          const existingMapElement = document.getElementById('map');
          if (existingMapElement) {
            console.log('Pre-mount: Found existing map element, replacing with clean container');
            
            // Get container's parent (or create parent if needed)
            const parentElement = existingMapElement.parentElement;
            if (parentElement) {
              // First, remove the existing element completely
              parentElement.removeChild(existingMapElement);
              
              // Create a completely fresh container with a unique ID just for this instance
              const uniqueContainer = document.createElement('div');
              uniqueContainer.id = 'map'; // Keep standard ID for compatibility
              uniqueContainer.className = 'leaflet-container-wrapper';
              uniqueContainer.style.cssText = 'height: 100%; width: 100%; position: relative;';
              
              // Critical: Add unique attributes to track this specific container
              uniqueContainer.setAttribute('data-instance-id', uniqueMapId);
              uniqueContainer.setAttribute('data-create-time', Date.now().toString());
              uniqueContainer.setAttribute('data-clean-mount', 'true');
              
              // Add the fresh container
              parentElement.appendChild(uniqueContainer);
              console.log(`Pre-mount: Created clean container with ID ${uniqueMapId}`);
              
              // Mark ready for mount
              containerRefReady.current = true;
            }
          }
        } catch (e) {
          console.warn('Error during pre-mount DOM preparation:', e);
        }
      };
      
      // Try to prepare DOM immediately
      attemptDomPreparation();
      
      // Fallback with a small delay if the DOM isn't ready
      if (!containerRefReady.current) {
        setTimeout(attemptDomPreparation, 50);
      }
    }
  }, [uniqueMapId]);
  
  // On component unmount, set hasUnmounted to true to prevent late callbacks
  useEffect(() => {
    return () => {
      hasUnmountedRef.current = true;
      
      // On unmount, clear the global showActivityOverlay
      if (typeof window !== 'undefined') {
        // Don't completely delete the function as it might be used elsewhere
        // Instead, replace it with a warning function
        window.showActivityOverlay = (action: string, id: string) => {
          console.warn('MapClient has been unmounted, showActivityOverlay is no longer active');
        };
      }
      
      // CRITICAL FIX: Radical cleanup on unmount to prevent "Map container is being reused" error
      if (typeof window !== 'undefined') {
        // Clear global references
        window._leafletMapInstance = undefined;
        window._leafletMapContainer = undefined;
        window._leafletInitInProgress = false;
        
        // Find our specific map container and completely remove it
        try {
          // Look for our specific container by unique ID
          const mapContainer = document.querySelector(`#map[data-instance-id="${uniqueMapId}"]`) || 
                               document.getElementById('map');
          
          if (mapContainer) {
            console.log(`Unmounting map container with ID ${uniqueMapId}`);
            
            // First completely remove this element from the DOM
            if (mapContainer.parentElement) {
              mapContainer.parentElement.removeChild(mapContainer);
            }
            
            // Then create a placeholder replacement (different ID)
            const parentElement = document.querySelector('.leaflet-container-wrapper')?.parentElement || 
                                 document.querySelector('.map-container');
                                 
            if (parentElement) {
              // Create a new container with a different ID and clear attributes
              const freshContainer = document.createElement('div');
              freshContainer.id = 'map-placeholder'; // Different ID to break references
              freshContainer.style.cssText = 'height: 100%; width: 100%; position: relative;';
              freshContainer.setAttribute('data-unmounted', 'true');
              freshContainer.setAttribute('data-unmount-time', Date.now().toString());
              
              // Add the placeholder
              parentElement.appendChild(freshContainer);
              console.log('Created placeholder for unmounted map container');
              
              // After a small delay, rename to standard ID for next component
              setTimeout(() => {
                if (freshContainer && document.body.contains(freshContainer)) {
                  freshContainer.id = 'map';
                }
              }, 100);
            }
          }
        } catch (e) {
          console.warn('Error during aggressive map cleanup on unmount:', e);
        }
        
        // Try to clean up any lingering Leaflet resources
        try {
          // Access all elements with leaflet classes and clean them
          const leafletElements = document.querySelectorAll('[class*="leaflet"]');
          leafletElements.forEach(el => {
            if (!document.body.contains(el)) return; // Skip if not in DOM
            
            // Remove leaflet-specific classes
            const classList = Array.from(el.classList);
            classList.forEach(cls => {
              if (cls.includes('leaflet')) {
                el.classList.remove(cls);
              }
            });
            
            // Remove any leaflet data attributes
            Array.from(el.attributes)
              .filter(attr => attr.name.startsWith('data-leaflet'))
              .forEach(attr => el.removeAttribute(attr.name));
          });
        } catch (leafletCleanupErr) {
          console.warn('Error cleaning leaflet elements:', leafletCleanupErr);
        }
      }
    };
  }, [uniqueMapId]);
  
  // Register the global showActivityOverlay function
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasUnmountedRef.current) {
      window.showActivityOverlay = (action: 'view' | 'edit' | string, id: string) => {
        if (hasUnmountedRef.current) {
          console.warn('MapClient has been unmounted, ignoring showActivityOverlay call');
          return;
        }
        
        if (action === 'view' || action === 'edit') {
          // Use the overlay context to show the appropriate overlay
          showOverlay(action, id);
        }
      };
    }
    
    return () => {
      // Cleanup is handled in the main unmount effect
    };
  }, [activities, showOverlay]);

  if (isLoading) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-900", className)}>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-2 text-lg font-medium">Loading map data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex h-full w-full flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4", className)}>
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Map</h2>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Please try refreshing the page or contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  // Check if we have any activities to display
  if (!activities || activities.length === 0) {
    return (
      <div className={cn("flex h-full w-full flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4", className)}>
        <div className="max-w-md text-center">
          <h2 className="text-xl font-medium mb-2">No Activities Found</h2>
          <p className="text-gray-600 dark:text-gray-400">
            There are currently no activities to display on the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)} key={instanceIdRef.current}>
      {/* Main Map Component */}
      <MapContainer 
        activities={activities} 
        stadiaApiKey={stadiaApiKey} 
        key={instanceIdRef.current} // Important: Add a key to force clean remounting
      />
      
      {/* Overlay is global and managed by OverlayContext */}
      <Overlay />
    </div>
  );
}

export default MapClient; 