"use client"

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useMediaQuery } from '@/hooks/use-media-query';
import dynamic from 'next/dynamic';

// Import components to load dynamically
import { MapEffects, LoadingScreen, ErrorScreen } from './MapStyles';
import { MapLegend } from './MapLegend';
import { configureMapController } from './utils';
import { Activity } from './types';
import { useLeaflet } from '@/contexts/leaflet-context';
import { useOverlay, OverlayType } from '@/contexts/overlay-context';

// Global mutex for Leaflet initialization
// This ensures only one initialization process can happen at any time
let LEAFLET_INIT_MUTEX = false;
let MUTEX_OWNER: string | null = null;
let MUTEX_TIMESTAMP: number = 0;

// Function to acquire the mutex with timeout protection
function acquireMapInitMutex(ownerId: string): boolean {
  // If mutex is locked by someone else
  if (LEAFLET_INIT_MUTEX) {
    // Check for stale mutex (locked for more than 10 seconds)
    const now = Date.now();
    if (now - MUTEX_TIMESTAMP > 10000) {
      console.warn(`Stale mutex detected (owned by ${MUTEX_OWNER}), resetting after ${(now - MUTEX_TIMESTAMP)/1000}s`);
      LEAFLET_INIT_MUTEX = false;
      MUTEX_OWNER = null;
    } else {
      console.log(`Mutex already acquired by ${MUTEX_OWNER}, cannot initialize map`);
      return false;
    }
  }
  
  // Acquire mutex
  LEAFLET_INIT_MUTEX = true;
  MUTEX_OWNER = ownerId;
  MUTEX_TIMESTAMP = Date.now();
  console.log(`Mutex acquired by ${ownerId}`);
  return true;
}

// Function to release the mutex
function releaseMapInitMutex(ownerId: string): void {
  // Only the owner can release the mutex
  if (MUTEX_OWNER === ownerId) {
    LEAFLET_INIT_MUTEX = false;
    MUTEX_OWNER = null;
    console.log(`Mutex released by ${ownerId}`);
  } else if (MUTEX_OWNER) {
    console.warn(`Attempt to release mutex by non-owner (${ownerId}), current owner is ${MUTEX_OWNER}`);
  }
}

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    showGallery_: { [key: string]: () => void };
    showActivityOverlay?: (action: "view" | "edit" | string, id: string) => void;
    // Track map instance for retrieval
    _leafletMapInstance?: any;
    // Track if map initialization is in progress
    _leafletInitInProgress?: boolean;
    // Track the container that owns the map
    _leafletMapContainer?: string;
  }
}

// Extend HTMLElement to include Leaflet properties
interface LeafletElement extends HTMLElement {
  _leaflet_id?: number;
  _leaflet_pos?: any;
}

// Extend Leaflet with internal properties
interface LeafletExtended {
  _leaflet_id_to_map?: Record<number, any>;
}

// This component handles the Leaflet map initialization
interface MapContainerProps {
  activities: Activity[];
  stadiaApiKey?: string | null;
}

/**
 * Map initializer that sets up the Leaflet map instance
 */
function MapInitializer({ isMobile }: { isMobile: boolean }) {
  const mapRef = useRef<any>(null);
  const { L, setMap } = useLeaflet();
  const [initAttempts, setInitAttempts] = useState(0);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerIdRef = useRef<string>(`map-container-${Date.now()}`);
  const isMountedRef = useRef<boolean>(true);
  const initializationCompleteRef = useRef<boolean>(false);
  const mutexIdRef = useRef<string>(`mutex-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  
  // Set mounted ref on unmount to prevent late callbacks from running
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Make sure to release the mutex if we're unmounting and still hold it
      if (MUTEX_OWNER === mutexIdRef.current) {
        releaseMapInitMutex(mutexIdRef.current);
      }
    };
  }, []);
  
  // Cleanup function to safely remove map instance - extracted for reuse
  const safeCleanup = useCallback(() => {
    try {
      // If unmounted, don't do cleanup as it might be too late
      if (!isMountedRef.current) return;
      
      // Clear timeout if any
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      
      // Clear init flag if this component is unmounting during initialization
      if (typeof window !== 'undefined') {
        window._leafletInitInProgress = false;
      }
      
      // Make sure to release the mutex if we still hold it during cleanup
      if (MUTEX_OWNER === mutexIdRef.current) {
        releaseMapInitMutex(mutexIdRef.current);
      }
      
      if (mapRef.current) {
        console.log('Cleaning up map instance');
        
        // Only remove the map if we own the container
        if (window._leafletMapContainer === containerIdRef.current) {
          // Before removing, check if the map is actually attached to the DOM
          try {
            const container = mapRef.current.getContainer();
            if (!container || !document.body.contains(container)) {
              console.log('Map container already removed from DOM, skipping cleanup');
              mapRef.current = null;
              return;
            }
          } catch (e) {
            console.warn('Error checking map container:', e);
          }
          
          // *********************
          // CRITICAL FIX: PREVENT "Map container is being reused" ERROR
          // *********************
          try {
            // Flag to indicate if we're in the problematic cleanup stage
            const isCleaningUp = true;
            
            // 1. First gently unbind all event listeners
            if (typeof mapRef.current.off === 'function') {
              mapRef.current.off();
              if (typeof mapRef.current.stopLocate === 'function') {
                mapRef.current.stopLocate();
              }
            }
            
            // 2. Remove all layers and controls carefully
            if (mapRef.current.eachLayer) {
              // Store layers in array first to avoid modification during iteration
              const layersToRemove: any[] = [];
              mapRef.current.eachLayer((layer: any) => {
                if (layer) {
                  layersToRemove.push(layer);
                }
              });
              
              // Then remove each layer
              layersToRemove.forEach((layer: any) => {
                try {
                  mapRef.current.removeLayer(layer);
                } catch (e) {
                  // Ignore errors during layer removal
                }
              });
            }
            
            // 3. If we have the DOM element, clean it directly
            const mapElement = mapRef.current._container;
            if (mapElement) {
              try {
                // Set a flag on the element to indicate we're handling cleanup
                // (This is a custom flag to help us track the cleanup state)
                (mapElement as any)._leaflet_being_cleaned = true;
                
                // Remove Leaflet-specific classes
                mapElement.classList.remove('leaflet-container');
                mapElement.classList.remove('leaflet-touch');
                mapElement.classList.remove('leaflet-fade-anim');
                mapElement.classList.remove('leaflet-grab');
                mapElement.classList.remove('leaflet-touch-drag');
                mapElement.classList.remove('leaflet-touch-zoom');
                
                // Clear any inline styles added by Leaflet
                mapElement.style.cssText = '';
                
                // Empty the container but keep the element itself
                while (mapElement.firstChild) {
                  mapElement.removeChild(mapElement.firstChild);
                }
                
                // Reset any Leaflet-specific properties on the element
                if ((mapElement as any)._leaflet_id !== undefined) {
                  delete (mapElement as any)._leaflet_id;
                }
                if ((mapElement as any)._leaflet_pos !== undefined) {
                  delete (mapElement as any)._leaflet_pos;
                }
              } catch (containerErr) {
                console.warn('Error cleaning map container element:', containerErr);
              }
            }
            
            // 4. Explicitly clean up Leaflet's internal references
            if (L) {
              try {
                // Check if we can access Leaflet's internal registry
                const extendedL = L as unknown as LeafletExtended;
                if (extendedL._leaflet_id_to_map && mapRef.current._leaflet_id) {
                  // Remove the map from Leaflet's internal registry
                  delete extendedL._leaflet_id_to_map[mapRef.current._leaflet_id];
                }
              } catch (registryErr) {
                console.warn('Error accessing Leaflet registry:', registryErr);
              }
            }
            
            // 5. Finally, set global variables to indicate the map is gone
            window._leafletMapInstance = undefined;
            window._leafletMapContainer = undefined;
            
            // Clear our references
            mapRef.current = null;
            setMap(null);
          } catch (e) {
            console.error('Error during deep map cleanup:', e);
            
            // Fallback: attempt nuclear cleanup if everything else fails
            try {
              // Get the HTML element directly
              const mapDiv = document.getElementById('map');
              if (mapDiv) {
                // Complete reset of the map div
                mapDiv.innerHTML = '';
                mapDiv.className = '';
                mapDiv.style.cssText = '';
                
                // Clear all Leaflet-specific properties
                Object.keys(mapDiv).forEach(key => {
                  if (key.startsWith('_leaflet')) {
                    delete (mapDiv as any)[key];
                  }
                });
              }
              
              // Reset global variables
              window._leafletMapInstance = undefined;
              window._leafletMapContainer = undefined;
              
              // Clear our references
              mapRef.current = null;
              setMap(null);
            } catch (nuclearErr) {
              console.error('Nuclear cleanup also failed:', nuclearErr);
            }
          }
        } else {
          console.log('Not removing map instance as container is owned by another component');
          // Just clear our reference
          mapRef.current = null;
          setMap(null);
        }
      }
    } catch (e) {
      console.error('Error during map cleanup:', e);
    }
  }, [L, setMap, containerIdRef, mutexIdRef]);
  
  // Prevent running the initialization if it's already complete (fixes loops)
  useEffect(() => {
    if (initializationCompleteRef.current) {
      console.log('Map already initialized, skipping initialization');
      return;
    }
    
    if (typeof window === 'undefined' || !L) return;
    
    // MUTEX PATTERN: Check if another initialization is in progress
    // If so, we'll wait and retry later
    if (!acquireMapInitMutex(mutexIdRef.current)) {
      console.log(`Map initialization blocked by mutex, will retry in 500ms...`);
      
      // Set up a retry mechanism
      const retryInterval = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(retryInterval);
          return;
        }
        
        if (acquireMapInitMutex(mutexIdRef.current)) {
          console.log(`Successfully acquired mutex after waiting, proceeding with initialization`);
          clearInterval(retryInterval);
          setInitAttempts(prev => prev + 1); // Trigger effect to run again with mutex acquired
        } else {
          console.log(`Still waiting for mutex to be released...`);
        }
      }, 500);
      
      return () => {
        clearInterval(retryInterval);
      };
    }
    
    // Prevent multiple simultaneous initialization attempts
    if (window._leafletInitInProgress) {
      console.log('Map initialization already in progress, waiting...');
      
      // Release the mutex since we're not proceeding with initialization
      releaseMapInitMutex(mutexIdRef.current);
      
      const checkInterval = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(checkInterval);
          return;
        }
        
        if (!window._leafletInitInProgress) {
          clearInterval(checkInterval);
          setInitAttempts(prev => prev + 1); // Trigger effect to run again
        }
      }, 200);
      
      return () => clearInterval(checkInterval);
    }
    
    // Set flag to indicate initialization is in progress
    window._leafletInitInProgress = true;
    console.log('Starting map initialization with mutex acquired');
    
    // Create a more robust map initialization with retries
    let retryCount = 0;
    const maxRetries = 5;
    const retryInterval = 300; // ms
    
    const initMap = () => {
      try {
        // If component unmounted, don't continue
        if (!isMountedRef.current) {
          window._leafletInitInProgress = false;
          releaseMapInitMutex(mutexIdRef.current);
          return;
        }
        
        // Check if initialization was already completed in another attempt
        if (initializationCompleteRef.current) {
          window._leafletInitInProgress = false;
          releaseMapInitMutex(mutexIdRef.current);
          return;
        }
        
        // Check if L is available
        if (!L) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Leaflet not available, retry ${retryCount}/${maxRetries}...`);
            initTimeoutRef.current = setTimeout(initMap, retryInterval);
          } else {
            console.error('Leaflet not available after maximum retries');
            window._leafletInitInProgress = false;
            releaseMapInitMutex(mutexIdRef.current);
          }
          return;
        }
        
        // First check if we already have a global map instance
        if (window._leafletMapInstance) {
          console.log('Using existing global map instance');
          
          // Check if the map is still valid and attached to DOM
          try {
            const container = window._leafletMapInstance.getContainer();
            if (container && document.body.contains(container)) {
              console.log('Existing map instance is valid');
              mapRef.current = window._leafletMapInstance;
              
              // Update our ownership of this instance
              window._leafletMapContainer = containerIdRef.current;
              
              setMap(window._leafletMapInstance);
              
              // Configure the map controller
              configureMapController(window._leafletMapInstance, isMobile);
              window._leafletInitInProgress = false;
              initializationCompleteRef.current = true;
              releaseMapInitMutex(mutexIdRef.current);
              return;
            } else {
              console.log('Existing map instance container not in DOM, creating new instance');
              // Clear the reference to the invalid map
              window._leafletMapInstance = undefined;
              window._leafletMapContainer = undefined;
            }
          } catch (e) {
            console.warn('Error checking existing map instance:', e);
            window._leafletMapInstance = undefined;
            window._leafletMapContainer = undefined;
          }
        }
        
        // Try to get the map element
        const mapElement = document.getElementById('map') as LeafletElement | null;
        if (!mapElement) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Map element not found, retry ${retryCount}/${maxRetries}...`);
            initTimeoutRef.current = setTimeout(initMap, retryInterval);
          } else {
            console.error('Map element not found after maximum retries');
            window._leafletInitInProgress = false;
            releaseMapInitMutex(mutexIdRef.current);
          }
          return;
        }
        
        // CRITICAL FIX: Before initializing a new map, forcibly clean up any existing Leaflet artifacts
        // This is crucial for avoiding the "Map container is being reused" error
        if (mapElement._leaflet_id) {
          console.log('Map element has existing Leaflet ID, performing deep cleanup');
          
          // Check if another component owns this container
          if (window._leafletMapContainer && window._leafletMapContainer !== containerIdRef.current) {
            console.warn(`Map container conflict: current="${window._leafletMapContainer}", attempted="${containerIdRef.current}"`);
            // Wait before trying again
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Waiting for container to be released, retry ${retryCount}/${maxRetries}...`);
              initTimeoutRef.current = setTimeout(initMap, retryInterval);
            } else {
              console.error('Container ownership conflict could not be resolved');
              window._leafletInitInProgress = false;
              releaseMapInitMutex(mutexIdRef.current);
            }
            return;
          }
          
          // Access Leaflet's internal registry of map instances
          // This requires a type assertion since these are private Leaflet properties
          const extendedL = L as unknown as LeafletExtended;
          
          // Get any existing map instance from Leaflet's registry
          let existingMap = null;
          if (extendedL._leaflet_id_to_map) {
            existingMap = extendedL._leaflet_id_to_map[mapElement._leaflet_id];
          }
          
          if (existingMap) {
            console.log('Found existing map instance in Leaflet registry, cleaning up');
            
            try {
              // Try to safely clean up the existing map
              if (typeof existingMap.off === 'function') {
                existingMap.off();
                if (typeof existingMap.stopLocate === 'function') {
                  existingMap.stopLocate();
                }
              }
              
              // Remove all layers
              if (typeof existingMap.eachLayer === 'function') {
                existingMap.eachLayer((layer: any) => {
                  try {
                    existingMap.removeLayer(layer);
                  } catch (e) {
                    // Ignore errors
                  }
                });
              }
              
              // Clear any other resources
              if (typeof existingMap._clearControlPos === 'function') {
                existingMap._clearControlPos();
              }
            } catch (e) {
              console.warn('Error cleaning up existing map instance:', e);
            }
          }
          
          // Reset the element's Leaflet properties
          delete mapElement._leaflet_id;
          if (mapElement._leaflet_pos) delete mapElement._leaflet_pos;
          
          // Clear the element's contents
          while (mapElement.firstChild) {
            mapElement.removeChild(mapElement.firstChild);
          }
          
          // Remove Leaflet-specific classes
          mapElement.classList.remove('leaflet-container');
          mapElement.style.cssText = '';
          
          // Reset global references
          window._leafletMapInstance = undefined;
          window._leafletMapContainer = undefined;
        }
        
        // Initialize a new map instance
        console.log('Initializing new map instance');
        try {
          // CRITICAL FIX: Replace the map element entirely instead of reusing it
          // This is the most reliable way to avoid the "Map container is being reused" error
          const mapContainer = document.getElementById('map');
          if (mapContainer) {
            // Clone parent to keep its styling/position
            const parentElement = mapContainer.parentElement;
            if (parentElement) {
              // Create a fresh map container with a new ID
              const freshMapId = `map-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              
              // First, completely remove the old container
              parentElement.removeChild(mapContainer);
              
              // Create fresh container with same classes but new ID
              const freshMapContainer = document.createElement('div');
              freshMapContainer.id = 'map'; // Keep the same ID for consistency with other code
              freshMapContainer.className = mapContainer.className;
              freshMapContainer.style.cssText = 'height: 100%; width: 100%;';
              
              // Add a data attribute to track replacement
              freshMapContainer.setAttribute('data-fresh-container', freshMapId);
              
              // Add the fresh container to the parent
              parentElement.appendChild(freshMapContainer);
              
              console.log(`Replaced map container with fresh element (${freshMapId})`);
            }
          }
          
          // Set the container ownership with our unique ID
          window._leafletMapContainer = containerIdRef.current;
          
          // Create the map with proper options
          mapRef.current = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            minZoom: 1.5,
            maxZoom: 7,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            wheelPxPerZoomLevel: 120,
            // Add a unique ID as a custom property (not through options)
          });
          
          // Add a custom property to the map instance for debugging
          // This is done after creation since it's not a standard Leaflet option
          mapRef.current.ecoTrackMapId = `eco-track-map-${Date.now()}`;
          
          // Store the map instance globally for retrieval
          if (typeof window !== 'undefined') {
            window._leafletMapInstance = mapRef.current;
          }
          
          // Register the map with the context
          setMap(mapRef.current);
          
          // Configure the map controller
          configureMapController(mapRef.current, isMobile);
          
          console.log('Map initialization complete');
          window._leafletInitInProgress = false;
          initializationCompleteRef.current = true;
          releaseMapInitMutex(mutexIdRef.current);
        } catch (e) {
          console.error('Error creating map instance:', e);
          window._leafletInitInProgress = false;
          
          if (retryCount < maxRetries) {
            retryCount++;
            initTimeoutRef.current = setTimeout(initMap, retryInterval);
          } else {
            releaseMapInitMutex(mutexIdRef.current);
          }
        }
      } catch (e) {
        console.error('Error during map initialization:', e);
        window._leafletInitInProgress = false;
        
        if (retryCount < maxRetries) {
          retryCount++;
          initTimeoutRef.current = setTimeout(initMap, retryInterval);
        } else {
          releaseMapInitMutex(mutexIdRef.current);
        }
      }
    };
    
    // Start the initialization process
    initMap();
    
    // Cleanup function
    return () => {
      safeCleanup();
      // Make sure mutex is released in the cleanup
      if (MUTEX_OWNER === mutexIdRef.current) {
        releaseMapInitMutex(mutexIdRef.current);
      }
    };
  }, [L, isMobile, setMap, initAttempts, safeCleanup]);
  
  // Add extra cleanup on component unmount with useEffect's cleanup function
  useEffect(() => {
    return () => {
      // This provides an extra layer of protection for cleanup
      safeCleanup();
      // Final check to release mutex if still held
      if (MUTEX_OWNER === mutexIdRef.current) {
        releaseMapInitMutex(mutexIdRef.current);
      }
    };
  }, [safeCleanup]);
  
  return null;
}

/**
 * The main map container - load leaflet components dynamically 
 */
export function MapContainer({ activities, stadiaApiKey }: MapContainerProps) {
  const { resolvedTheme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { L, isLoading, error: leafletError } = useLeaflet();
  const [error, setError] = useState<string | null>(leafletError);
  // Get overlay context to connect with window.showActivityOverlay
  const { showOverlay } = useOverlay();
  
  // Use a unique instance ID to force clean re-mounting when needed
  const ownerIdRef = useRef<string>(`map-owner-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  
  // Track if this component created the map container
  const [isContainerOwner, setIsContainerOwner] = useState<boolean>(false);
  
  // Get the container element's unique identifier
  const [containerId, setContainerId] = useState<string>('');
  
  // Create an additional key that will be updated whenever we need to force a remount
  const [mapContainerKey, setMapContainerKey] = useState<string>(`leaflet-key-${Date.now()}`);
  
  // Verify ownership of the map container before initializing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const verifyOwnership = () => {
      try {
        // Get the map container element
        const mapElement = document.getElementById('map');
        
        if (!mapElement) {
          console.warn('Map container element not found');
          setIsContainerOwner(false);
          return;
        }
        
        // Check if this element is already owned by another instance
        const existingInstanceId = mapElement.getAttribute('data-instance-id');
        
        if (existingInstanceId) {
          // Store the container ID we found
          setContainerId(existingInstanceId);
          
          // If the element already has an ID, check if it's from our parent
          const isCleanMount = mapElement.getAttribute('data-clean-mount') === 'true';
          const isOurContainer = document.body.contains(mapElement) && isCleanMount;
          
          setIsContainerOwner(isOurContainer);
          
          console.log(`Container ownership check: ID=${existingInstanceId}, isOurs=${isOurContainer}`);
          
          if (!isOurContainer) {
            // This element belongs to another instance - we'll need to force cleanup
            console.warn(`Map container is owned by another instance (${existingInstanceId})`);
          }
        } else {
          // No instance ID on the element
          console.log('Map container has no instance ID, claiming ownership');
          
          // No existing owner - claim ownership
          mapElement.setAttribute('data-instance-id', ownerIdRef.current);
          mapElement.setAttribute('data-owner', 'MapContainer');
          setContainerId(ownerIdRef.current);
          setIsContainerOwner(true);
        }
      } catch (e) {
        console.error('Error verifying container ownership:', e);
        setIsContainerOwner(false);
      }
    };
    
    // Verify ownership immediately
    verifyOwnership();
    
    // And also after a small delay in case the DOM is still settling
    const timeoutId = setTimeout(verifyOwnership, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
  
  // If we don't own the container, force a replacement of the map element
  useEffect(() => {
    if (typeof window === 'undefined' || isContainerOwner) return;
    
    try {
      console.log('Attempting to replace container since we are not the owner');
      
      const existingMapElement = document.getElementById('map');
      if (!existingMapElement) return;
      
      // Get the parent of the map element
      const parentElement = existingMapElement.parentElement;
      if (!parentElement) return;
      
      // Create a new, clean container
      const newContainer = document.createElement('div');
      newContainer.id = 'map';
      newContainer.style.cssText = 'height: 100%; width: 100%;';
      
      // Set our ownership
      newContainer.setAttribute('data-instance-id', ownerIdRef.current);
      newContainer.setAttribute('data-create-time', Date.now().toString());
      newContainer.setAttribute('data-owner', 'MapContainer-recovered');
      
      // Replace the old container
      parentElement.replaceChild(newContainer, existingMapElement);
      
      // Update our state
      setIsContainerOwner(true);
      setContainerId(ownerIdRef.current);
      
      // Update the map container key to force a remount
      setMapContainerKey(`leaflet-recovery-${Date.now()}`);
      
      console.log('Successfully replaced map container and claimed ownership');
    } catch (e) {
      console.error('Failed to replace map container:', e);
    }
  }, [isContainerOwner]);

  // Force remount if we detect a fresh container was created
  useEffect(() => {
    // Check for fresh containers
    const checkForFreshContainers = () => {
      const mapElement = document.getElementById('map');
      if (mapElement && mapElement.hasAttribute('data-fresh-container')) {
        // Get the fresh container ID
        const freshId = mapElement.getAttribute('data-fresh-container');
        // Force a remount of the MapContainer by updating its key
        setMapContainerKey(`leaflet-key-${freshId || Date.now()}`);
        console.log(`Detected fresh container (${freshId}), forcing MapContainer remount`);
      }
    };
    
    // Run the check once
    checkForFreshContainers();
    
    // Also set up a minimal MutationObserver to detect DOM changes
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if any of the added nodes has our special attribute
            Array.from(mutation.addedNodes).forEach((node) => {
              if (node instanceof Element && 
                  (node.id === 'map' || node.querySelector('#map'))) {
                checkForFreshContainers();
              }
            });
          }
        });
      });
      
      // Start observing the document body
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Cleanup observer on unmount
      return () => observer.disconnect();
    }
  }, []);
  
  // Update error state when leafletError changes
  useEffect(() => {
    if (leafletError) {
      setError(leafletError);
    }
  }, [leafletError]);
  
  // Reset initialization flags when component unmounts
  useEffect(() => {
    // Set owner info in container if we own it
    if (isContainerOwner && containerId) {
      try {
        const container = document.getElementById('map');
        if (container) {
          container.setAttribute('data-container-mounted', 'true');
          container.setAttribute('data-mount-time', Date.now().toString());
        }
      } catch (e) {
        console.warn('Error setting container attributes:', e);
      }
    }
    
    return () => {
      // When this component unmounts, ensure we clean up any initialization flags
      if (typeof window !== 'undefined') {
        window._leafletInitInProgress = false;
        
        // Only clean the container if we own it
        if (isContainerOwner) {
          try {
            const container = document.getElementById('map');
            if (container && container.getAttribute('data-instance-id') === containerId) {
              container.setAttribute('data-container-unmounted', 'true');
              container.setAttribute('data-unmount-time', Date.now().toString());
            }
          } catch (e) {
            console.warn('Error setting container unmount attributes:', e);
          }
        }
      }
    };
  }, [isContainerOwner, containerId]);
  
  // Dynamic imports for Leaflet components
  const MapContainer = dynamic(
    () => import('react-leaflet').then(mod => mod.MapContainer),
    { ssr: false, loading: () => <div>Initializing map...</div> }
  );
  
  const TileLayer = dynamic(
    () => import('react-leaflet').then(mod => mod.TileLayer),
    { ssr: false }
  );
  
  const ZoomControl = dynamic(
    () => import('react-leaflet').then(mod => mod.ZoomControl),
    { ssr: false }
  );
  
  const AttributionControl = dynamic(
    () => import('react-leaflet').then(mod => mod.AttributionControl),
    { ssr: false }
  );
  
  const MarkerCluster = dynamic(
    () => import('./MarkerCluster'),
    { ssr: false }
  );
  
  // Setup window function for marker clicks and connect to overlay context
  useEffect(() => {
    // Register window function to help with marker clicks
    if (typeof window !== 'undefined') {
      // Make sure it's initialized before using it
      if (!window.showGallery_) {
        window.showGallery_ = {};
      }
      
      // Register global overlay handler for markers
      window.showActivityOverlay = (action, id) => {
        console.log(`Activity overlay triggered: ${action}, ID: ${id}`);
        // Connect to our overlay context
        if (showOverlay && typeof showOverlay === 'function') {
          // Convert action to a valid OverlayType
          const overlayType = (action === 'view' || action === 'edit' || action === 'submit' || action === 'monitor')
            ? action as OverlayType
            : 'view'; // Default to 'view' for invalid types
          
          showOverlay(overlayType, id);
        }
      };
    }
    
    return () => {
      // Clean up window functions
      if (typeof window !== 'undefined') {
        // Reset to empty object
        window.showGallery_ = {};
        // Keep window.showActivityOverlay for other components that might need it
      }
    };
  }, [showOverlay]); // Add showOverlay to dependency array
  
  if (error) {
    return <ErrorScreen error={error} />;
  }
  
  if (isLoading || !L) {
    return <LoadingScreen />;
  }
  
  return (
    <div className="w-full h-full relative bg-gray-100 dark:bg-gray-900">
      <style jsx global>{`
        /* Ensure the map container takes full height */
        .leaflet-container {
          height: 100%;
          width: 100%;
        }
      `}</style>
      
      {/* Add map effects (styling) */}
      <MapEffects />
      
      {/* Get container ID to use as key if available */}
      {containerId && (
        <MapContainer
          id="map"
          key={`map-container-${containerId || mapContainerKey}`}
          className="h-full w-full"
          preferCanvas={true}
          zoomControl={false}
          center={[0, 0]}
          zoom={isMobile ? 1.8 : 2.5}
          minZoom={1.5}
          maxZoom={7}
          scrollWheelZoom={true}
          attributionControl={false}
          fadeAnimation={!isMobile}
          markerZoomAnimation={true}
          easeLinearity={isMobile ? 0.3 : 0.25}
        >
          {/* Add attribution control with small size */}
          <AttributionControl key={`attribution-${containerId || mapContainerKey}`} position="bottomleft" prefix={false} />
          
          {/* Add zoom control with custom position */}
          <ZoomControl key={`zoom-${containerId || mapContainerKey}`} position={isMobile ? "bottomright" : "topleft"} />
          
          {/* Tile layer - uses Stadia Maps if API key provided */}
          <TileLayer
            key={`tile-layer-${containerId || mapContainerKey}`}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={
              stadiaApiKey
                ? `https://tiles.stadiamaps.com/tiles/alidade_smooth${
                    resolvedTheme === "dark" ? "_dark" : ""
                  }/{z}/{x}/{y}{r}.png?api_key=${stadiaApiKey}`
                : `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
            }
          />
          
          {/* Marker clustering */}
          <MarkerCluster key={`marker-cluster-${containerId || mapContainerKey}`} activities={activities} />
          
          {/* Map initializer helper */}
          <MapInitializer key={`map-initializer-${containerId || mapContainerKey}`} isMobile={isMobile} />
        </MapContainer>
      )}
      
      {/* Show loading placeholder if container ID is not available yet */}
      {!containerId && (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-gray-500">Preparing map container...</p>
        </div>
      )}
      
      {/* Map legend */}
      <MapLegend isMobile={isMobile} />
    </div>
  );
}

export default MapContainer; 