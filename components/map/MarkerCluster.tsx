"use client"

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Activity, getActivityColor } from './types'
import { useLeaflet } from '@/contexts/leaflet-context'
import { hasMarkerCluster, isLeafletLoaded, createSafePopupContent } from './utils'
import { SimpleMarker } from './MarkerComponents'
import { useOverlay } from '@/contexts/overlay-context'
import { toast } from 'sonner'

interface MarkerClusterProps {
  activities: Activity[]
  selectedActivity?: string | null
}

export function MarkerCluster({ activities, selectedActivity }: MarkerClusterProps) {
  const { L, map, pluginsLoaded } = useLeaflet()
  const [error, setError] = useState<string | null>(null)
  const clusterGroupRef = useRef<any>(null)
  const markersRef = useRef<{ [id: string]: any }>({})
  const [initialized, setInitialized] = useState(false)
  const markerInitializationAttempted = useRef<boolean>(false);
  const initAttemptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef<number>(0);
  const MAX_ATTEMPTS = 10;
  const isMountedRef = useRef<boolean>(true);
  
  // Track component mounting state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Safe cleanup function that can be called from multiple places
  const cleanupMarkers = useCallback(() => {
    if (initAttemptTimeoutRef.current) {
      clearTimeout(initAttemptTimeoutRef.current);
      initAttemptTimeoutRef.current = null;
    }
    
    // Don't proceed with cleanup if component is unmounted
    if (!isMountedRef.current) return;
    
    // First, ensure proper cleanup of any existing markers
    if (map && clusterGroupRef.current) {
      try {
        clusterGroupRef.current.clearLayers();
        map.removeLayer(clusterGroupRef.current);
      } catch (err) {
        console.error('Error cleaning up cluster group:', err);
      } finally {
        clusterGroupRef.current = null;
      }
    }
    
    // Also clean up any directly added markers
    if (map) {
      Object.values(markersRef.current).forEach((marker: any) => {
        try {
          if (marker) {
            // Remove all event listeners
            if (typeof marker.off === 'function') {
              marker.off();
            }
            
            // Remove from map if it's there
            if (map.hasLayer(marker)) {
              map.removeLayer(marker);
            }
          }
        } catch (err) {
          // Ignore errors during cleanup
        }
      });
    }
    
    // Reset marker references
    markersRef.current = {};
  }, [map]);
  
  // First, check if Leaflet is properly loaded
  useEffect(() => {
    // Clean up on unmount
    return () => {
      cleanupMarkers();
    };
  }, [cleanupMarkers]);
  
  // Check if Leaflet is properly initialized - with exponential backoff
  useEffect(() => {
    // Clear state on dependencies change
    setInitialized(false);
    
    // Don't proceed without dependencies
    if (!L || !map) {
      console.log('Waiting for Leaflet and map to be available...');
      return;
    }
    
    // Ensure leaflet is properly loaded
    if (!isLeafletLoaded(L)) {
      setError('Leaflet library not properly loaded');
      console.error('Leaflet library not properly loaded');
      return;
    }
    
    // Setup initialization check with retries
    let retryCount = 0;
    const maxRetries = 8; // More retries for initialization
    
    const checkMapInitialization = () => {
      // Don't continue if component is unmounted
      if (!isMountedRef.current) return;
      
      // Verify the map is actually attached to the DOM
      try {
        // Don't try to access map if it's not available
        if (!map) {
          if (retryCount < maxRetries) {
            const delay = Math.min(300 * Math.pow(1.5, retryCount), 5000);
            retryCount++;
            console.log(`Map not available, retry ${retryCount}/${maxRetries} in ${Math.round(delay)}ms`);
            initAttemptTimeoutRef.current = setTimeout(checkMapInitialization, delay);
          } else {
            console.error('Max retries reached waiting for map initialization');
            setError('Timeout waiting for map initialization');
          }
          return;
        }
        
        const container = map.getContainer();
        if (!container || !document.body.contains(container)) {
          if (retryCount < maxRetries) {
            const delay = Math.min(300 * Math.pow(1.5, retryCount), 5000);
            retryCount++;
            console.log(`Map container not in DOM, retry ${retryCount}/${maxRetries} in ${Math.round(delay)}ms`);
            initAttemptTimeoutRef.current = setTimeout(checkMapInitialization, delay);
          } else {
            console.error('Max retries reached waiting for map container');
            setError('Map container not available after multiple attempts');
          }
          return;
        }
        
        // Verify map has properly initialized by checking if it has a size
        const size = map.getSize();
        if (!size || size.x === 0 || size.y === 0) {
          if (retryCount < maxRetries) {
            const delay = Math.min(300 * Math.pow(1.5, retryCount), 5000);
            retryCount++;
            console.log(`Map not properly sized yet, retry ${retryCount}/${maxRetries} in ${Math.round(delay)}ms`);
            initAttemptTimeoutRef.current = setTimeout(checkMapInitialization, delay);
          } else {
            console.error('Max retries reached waiting for map to be sized');
            setError('Map sizing issue detected');
          }
          return;
        }
        
        // Check if map is attached to DOM and interactive
        // Note: isFullyLoaded doesn't exist on standard Leaflet Map type
        // Instead check for map._loaded property or try to interact with map
        try {
          // Try to access internal property carefully (with type safety)
          const anyMap = map as any;
          const isLoaded = anyMap && (anyMap._loaded === true);
          
          if (!isLoaded) {
            if (retryCount < maxRetries) {
              const delay = Math.min(300 * Math.pow(1.5, retryCount), 5000);
              retryCount++;
              console.log(`Map not fully loaded, retry ${retryCount}/${maxRetries} in ${Math.round(delay)}ms`);
              initAttemptTimeoutRef.current = setTimeout(checkMapInitialization, delay);
            } else {
              // Don't treat this as a fatal error, proceed anyway
              console.warn('Proceeding with marker initialization despite map not fully loaded');
            }
            return;
          }
        } catch (mapAccessError) {
          console.warn('Error checking map loaded state:', mapAccessError);
          // Proceed despite the error checking the loaded state
        }
        
        // All checks passed, map is ready
        console.log('Leaflet and map are properly initialized, ready for marker initialization');
        setInitialized(true);
        
      } catch (err) {
        console.error('Error checking map initialization:', err);
        if (retryCount < maxRetries) {
          const delay = Math.min(500 * Math.pow(1.5, retryCount), 8000);
          retryCount++;
          console.log(`Error during map check, retry ${retryCount}/${maxRetries} in ${Math.round(delay)}ms`);
          initAttemptTimeoutRef.current = setTimeout(checkMapInitialization, delay);
        } else {
          setError('Error during map initialization check');
        }
      }
    };
    
    // Start the initialization check process
    checkMapInitialization();
    
    // Cleanup timeout on unmount or dependencies change
    return () => {
      if (initAttemptTimeoutRef.current) {
        clearTimeout(initAttemptTimeoutRef.current);
        initAttemptTimeoutRef.current = null;
      }
    };
  }, [L, map]);
  
  // Create the marker cluster group when map, activities, and markers are available
  useEffect(() => {
    // Exit if we're not initialized or don't have the necessary dependencies
    // or if there are no activities to display
    if (!initialized || !L || !map || !activities || activities.length === 0) {
      if (initialized && (!activities || activities.length === 0)) {
        console.log('No activities to display on map');
      }
      return;
    }
    
    // CRITICAL FIX: Perform an extensive safety check before initializing markers
    try {
      // 1. First verify map container exists and is properly attached
      const container = map.getContainer();
      if (!container || !document.body.contains(container)) {
        console.log('Map container not properly attached to DOM, delaying marker initialization');
        return;
      }
      
      // 2. Check container ownership by looking at data attributes
      const containerInstanceId = container.getAttribute('data-instance-id');
      const containerMounted = container.getAttribute('data-container-mounted') === 'true';
      
      if (!containerMounted) {
        console.log('Map container is not yet fully mounted, delaying marker initialization');
        return;
      }
      
      // 3. Check if container has the appropriate Leaflet class
      if (!container.classList.contains('leaflet-container')) {
        console.log('Map container is not properly initialized by Leaflet, delaying marker initialization');
        return;
      }
      
      // 4. Additional check for map._loaded property
      if (!(map as any)._loaded) {
        console.log('Map is not fully loaded yet, delaying marker initialization');
        return;
      }
      
      // 5. Verify that the marker layer plugin is available
      if (!L.markerClusterGroup) {
        console.error('Marker cluster plugin not available');
        return;
      }
      
      // 6. Check for disconnected elements (element is in document but parent chain is broken)
      let currentNode: Node | null = container;
      let pathToRoot = true;
      
      while (currentNode && currentNode !== document.body) {
        const parent: Node | null = currentNode.parentNode;
        if (!parent) {
          pathToRoot = false;
          break;
        }
        currentNode = parent;
      }
      
      if (!pathToRoot) {
        console.warn('Map container has broken parent chain to document.body, cannot initialize markers');
        return;
      }
    } catch (e) {
      console.error('Error during safety checks for marker initialization:', e);
      return;
    }
    
    // Store L in a constant to ensure TypeScript knows it's not null within this block
    const leaflet = L;
    
    // Reset the initialization flag when dependencies change
    markerInitializationAttempted.current = false;
    
    // Prevent duplicate initialization attempts during the same effect cycle
    if (markerInitializationAttempted.current) {
      return;
    }
    markerInitializationAttempted.current = true;
    
    console.log(`Initializing markers for ${activities.length} activities`);
    
    // Always clean up existing markers first
    cleanupMarkers();
    
    // Use a state-based initialization approach for better safety
    if (typeof window !== 'undefined') {
      // Check if map initialization is still in progress
      if (window._leafletInitInProgress) {
        console.log('Map initialization still in progress, delaying marker creation');
        setTimeout(() => {
          console.log('Retrying marker initialization after delay');
          setInitialized(prev => !prev); // Force re-run of effect
        }, 500);
        return;
      }
    }
    
    // Delay marker creation slightly to ensure the map is stable
    // and also to avoid race conditions with other components
    const initializationDelay = 300;
    console.log(`Delaying marker initialization by ${initializationDelay}ms for stability`);
    
    initAttemptTimeoutRef.current = setTimeout(() => {
      // Don't proceed if component unmounted during the delay
      if (!isMountedRef.current || !map) return;
      
      // Verify Leaflet is still available (might have changed during the timeout)
      if (!leaflet) return;
      
      try {
        // Double-check map stability before proceeding
        try {
          const container = map.getContainer();
          if (!container || !document.body.contains(container)) {
            console.warn('Map container not in DOM during marker initialization, aborting');
            markerInitializationAttempted.current = false;
            return;
          }
          
          // Also check map size once more
          const size = map.getSize();
          if (!size || size.x === 0 || size.y === 0) {
            console.warn('Map not properly sized during marker initialization, aborting');
            markerInitializationAttempted.current = false;
            return;
          }
        } catch (err) {
          console.error('Error checking map stability during marker init:', err);
          markerInitializationAttempted.current = false;
          return;
        }
        
        // Check if marker cluster plugin is available
        const markerClusterAvailable = pluginsLoaded?.markerCluster && hasMarkerCluster(leaflet);
        
        if (markerClusterAvailable) {
          console.log('Using marker cluster plugin');
          
          // Initialize the marker cluster group with options
          clusterGroupRef.current = leaflet.markerClusterGroup({
            maxClusterRadius: 40,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            removeOutsideVisibleBounds: true,
            animateAddingMarkers: true,
            disableClusteringAtZoom: 16,
            chunkedLoading: true, // Add chunked loading for performance
            spiderfyDistanceMultiplier: 1.5,
            iconCreateFunction: function(cluster) {
              const count = cluster.getChildCount();
              
              // Apply different styles based on the number of markers
              let size = 'small';
              if (count > 20) size = 'large';
              else if (count > 10) size = 'medium';
              
              return leaflet.divIcon({
                html: `<div class="marker-cluster marker-cluster-${size}"><span>${count}</span></div>`,
                className: `marker-cluster-custom marker-cluster-${size}`,
                iconSize: [40, 40]
              });
            }
          });
          
          // Add markers in chunks to prevent long-running scripts
          // Process a maximum of 20 activities per chunk
          const CHUNK_SIZE = 20;
          let processedCount = 0;
          
          function processNextChunk() {
            if (!isMountedRef.current || !map || !clusterGroupRef.current) return;
            
            const chunk = activities.slice(processedCount, processedCount + CHUNK_SIZE);
            processedCount += chunk.length;
            
            // Process this chunk of activities
            chunk.forEach(activity => {
              if (!activity || typeof activity.lat !== 'number' || typeof activity.lng !== 'number') {
                console.warn('Invalid activity data:', activity);
                return;
              }
              
              try {
                const marker = leaflet.marker([activity.lat, activity.lng], {
                  title: activity.title,
                  riseOnHover: true, // Rise marker on hover
                  bubblingMouseEvents: false // Prevent event bubbling for better performance
                });
                
                // Store activity ID on marker for reference
                if (marker) {
                  // Use our type-safe property
                  marker.activityId = activity.id;
                }
                
                // Store reference to marker
                markersRef.current[activity.id] = marker;
                
                // Add popup with sanitized content
                const color = getActivityColor(activity.type);
                
                // Create popup content with sanitized data
                const popupContent = document.createElement('div');
                popupContent.className = 'activity-popup';
                popupContent.innerHTML = createSafePopupContent(
                  activity.title,
                  activity.description,
                  activity.type,
                  activity.address || activity.country || '',
                  activity.responsible || '',
                  activity.id,
                  color
                );
                
                const popup = leaflet.popup({
                  closeButton: true,
                  className: 'activity-popup-container',
                  offset: [0, -5],
                  autoPan: true, // Auto pan the map when popup opens
                  autoPanPadding: [50, 50] // Padding for auto pan
                }).setContent(popupContent);
                
                marker.bindPopup(popup);
                
                // Add click handler to marker
                marker.on('click', () => {
                  if (window.showActivityOverlay && activity.id) {
                    window.showActivityOverlay('view', activity.id);
                  }
                });
                
                // Add marker to cluster group
                if (clusterGroupRef.current) {
                  clusterGroupRef.current.addLayer(marker);
                }
              } catch (err) {
                console.error(`Error creating marker for activity ${activity.id}:`, err);
              }
            });
            
            // If there are more activities to process, schedule the next chunk
            if (processedCount < activities.length) {
              // Use requestAnimationFrame for better performance
              requestAnimationFrame(() => setTimeout(processNextChunk, 0));
            } else {
              // All markers added, now add the cluster group to the map
              finishMarkerInitialization();
            }
          }
          
          // Final step after all markers are added
          function finishMarkerInitialization() {
            if (!isMountedRef.current || !map) return;
            
            // Verify the cluster group is valid before adding to map
            if (clusterGroupRef.current && clusterGroupRef.current.getLayers().length > 0) {
              // Add the cluster group to the map with animation
              console.log(`Adding cluster group with ${clusterGroupRef.current.getLayers().length} markers to map`);
              
              // Verify map is still valid before adding cluster group
              try {
                if (map.getContainer && document.body.contains(map.getContainer())) {
                  map.addLayer(clusterGroupRef.current);
                  
                  // If a marker is selected, open its popup
                  if (selectedActivity && markersRef.current[selectedActivity]) {
                    setTimeout(() => {
                      try {
                        if (!isMountedRef.current) return;
                        
                        const marker = markersRef.current[selectedActivity];
                        if (marker) {
                          marker.openPopup();
                          // Center the map on the selected marker
                          map.setView(marker.getLatLng(), 16, {
                            animate: true,
                            duration: 1
                          });
                        }
                      } catch (err) {
                        console.error('Error opening popup for selected activity:', err);
                      }
                    }, 500);
                  }
                } else {
                  console.warn('Map container not in DOM when trying to add marker cluster');
                }
              } catch (err) {
                console.error('Error adding cluster group to map:', err);
              }
            } else {
              console.warn('Cluster group is empty or invalid, not adding to map');
            }
            
            // Reset flag to allow re-initialization if needed
            markerInitializationAttempted.current = false;
          }
          
          // Start processing markers in chunks
          processNextChunk();
          
        } else {
          // Fallback to regular markers if cluster plugin is not available
          console.log('Marker clustering not available, using regular markers');
          setError('Marker clustering plugin not available. Using fallback.');
          toast.warning('Using standard markers instead of clustering');
          
          // Process fallback markers in chunks too
          const CHUNK_SIZE = 20;
          let processedCount = 0;
          
          function processNextFallbackChunk() {
            if (!isMountedRef.current || !map) return;
            
            const chunk = activities.slice(processedCount, processedCount + CHUNK_SIZE);
            processedCount += chunk.length;
            
            // Process this chunk of activities
            chunk.forEach(activity => {
              if (!activity || typeof activity.lat !== 'number' || typeof activity.lng !== 'number') {
                return;
              }
              
              try {
                const marker = leaflet.marker([activity.lat, activity.lng], {
                  title: activity.title,
                  riseOnHover: true
                });
                
                // Store reference to marker
                markersRef.current[activity.id] = marker;
                
                // Add popup with sanitized content
                const color = getActivityColor(activity.type);
                
                // Create popup content with sanitized data
                const popupContent = document.createElement('div');
                popupContent.className = 'activity-popup';
                popupContent.innerHTML = createSafePopupContent(
                  activity.title,
                  activity.description,
                  activity.type,
                  activity.address || activity.country || '',
                  activity.responsible || '',
                  activity.id,
                  color
                );
                
                const popup = leaflet.popup({
                  closeButton: true,
                  className: 'activity-popup-container',
                  autoPan: true
                }).setContent(popupContent);
                
                marker.bindPopup(popup);
                
                // Add click handler to marker
                marker.on('click', () => {
                  if (window.showActivityOverlay && activity.id) {
                    window.showActivityOverlay('view', activity.id);
                  }
                });
                
                // Verify map exists and is valid before adding marker
                if (map && typeof map.addLayer === 'function') {
                  // Add to map
                  marker.addTo(map);
                }
              } catch (err) {
                console.error(`Error creating fallback marker for activity ${activity.id}:`, err);
              }
            });
            
            // If there are more activities to process, schedule the next chunk
            if (processedCount < activities.length) {
              requestAnimationFrame(() => setTimeout(processNextFallbackChunk, 0));
            } else {
              // All markers added, handle selected marker if any
              finishFallbackInitialization();
            }
          }
          
          function finishFallbackInitialization() {
            if (!isMountedRef.current || !map) return;
            
            // If a marker is selected, open its popup in fallback mode too
            if (selectedActivity && markersRef.current[selectedActivity]) {
              setTimeout(() => {
                try {
                  if (!isMountedRef.current) return;
                  
                  const marker = markersRef.current[selectedActivity];
                  if (marker) {
                    marker.openPopup();
                    // Center the map on the selected marker
                    map.setView(marker.getLatLng(), 16, { animate: true });
                  }
                } catch (err) {
                  console.error('Error opening popup for selected activity:', err);
                }
              }, 500);
            }
            
            // Reset flag to allow re-initialization if needed
            markerInitializationAttempted.current = false;
          }
          
          // Start processing fallback markers
          processNextFallbackChunk();
        }
      } catch (err) {
        console.error('Error initializing marker cluster:', err);
        setError('Failed to initialize markers. Please try refreshing the page.');
        toast.error('Failed to initialize markers');
        
        // Reset flag to allow re-initialization if needed
        markerInitializationAttempted.current = false;
      }
    }, initializationDelay);
    
  }, [initialized, L, map, activities, selectedActivity, pluginsLoaded, cleanupMarkers]);
  
  // Display error if any
  if (error) {
    console.warn('Marker initialization error:', error);
  }
  
  return null;
}

export default MarkerCluster; 