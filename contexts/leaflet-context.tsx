"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type * as LeafletNamespace from 'leaflet';

// Define the context type
interface LeafletContextType {
  L: typeof LeafletNamespace | null;
  map: LeafletNamespace.Map | null;
  isLoading: boolean;
  error: string | null;
  pluginsLoaded: {
    markerCluster: boolean;
  };
  setMap: (mapInstance: LeafletNamespace.Map | null) => void;
  verifyPlugins: () => Promise<boolean>;
}

// Create context with default values
const LeafletContext = createContext<LeafletContextType>({
  L: null,
  map: null,
  isLoading: true,
  error: null,
  pluginsLoaded: {
    markerCluster: false
  },
  setMap: () => {}, // No-op default implementation
  verifyPlugins: async () => false // No-op default implementation
});

// Hook to use the Leaflet context
export const useLeaflet = () => useContext(LeafletContext);

interface LeafletProviderProps {
  children: ReactNode;
}

export function LeafletProvider({ children }: LeafletProviderProps) {
  const [leafletState, setLeafletState] = useState<Omit<LeafletContextType, 'setMap' | 'verifyPlugins'>>({
    L: null,
    map: null,
    isLoading: true,
    error: null,
    pluginsLoaded: {
      markerCluster: false
    }
  });
  
  // Use refs instead of state values to break circular dependencies
  const leafletRef = useRef<typeof LeafletNamespace | null>(null);
  const pluginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationCompleteRef = useRef<boolean>(false);
  
  // Function to verify plugins are properly loaded - use refs to access Leaflet
  const verifyPlugins = useCallback(async (): Promise<boolean> => {
    const L = leafletRef.current;
    if (!L) return false;
    
    // Clear any existing timeout
    if (pluginTimeoutRef.current) {
      clearTimeout(pluginTimeoutRef.current);
      pluginTimeoutRef.current = null;
    }
    
    try {
      // Verify marker cluster plugin
      const verifyMarkerCluster = new Promise<boolean>((resolve) => {
        let attempts = 0;
        const maxAttempts = 20;
        const checkInterval = 100; // ms
        
        const checkPlugin = () => {
          if (L && 'markerClusterGroup' in L && typeof L.markerClusterGroup === 'function') {
            console.log('MarkerCluster plugin verified successfully');
            resolve(true);
            return;
          }
          
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn(`MarkerCluster plugin verification failed after ${maxAttempts} attempts`);
            resolve(false);
            return;
          }
          
          // Schedule next check
          pluginTimeoutRef.current = setTimeout(checkPlugin, checkInterval);
        };
        
        checkPlugin();
      });
      
      const markerClusterLoaded = await verifyMarkerCluster;
      
      // Update plugin status
      setLeafletState(prev => ({
        ...prev,
        pluginsLoaded: {
          ...prev.pluginsLoaded,
          markerCluster: markerClusterLoaded
        },
        isLoading: false
      }));
      
      return markerClusterLoaded;
    } catch (err) {
      console.error('Error verifying Leaflet plugins:', err);
      setLeafletState(prev => ({
        ...prev,
        error: 'Failed to verify Leaflet plugins',
        isLoading: false
      }));
      return false;
    }
  }, []); // No dependencies to break the loop

  // Initialize Leaflet - only once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // CRITICAL FIX: Check if initialization is already complete to prevent loops
    if (initializationCompleteRef.current) {
      console.log('Leaflet already initialized, skipping initialization');
      return;
    }
    
    let cancelled = false;
    let leafletTimeoutId: NodeJS.Timeout | null = null;

    async function loadLeaflet() {
      try {
        console.log('Loading Leaflet library');
        
        // Import Leaflet library
        const leaflet = await import('leaflet');
        
        // If component unmounted during async operation, abort
        if (cancelled) return;
        
        // Store in ref to break dependency cycle
        leafletRef.current = leaflet;
        
        // Configure default markers
        if (leaflet && leaflet.Icon && leaflet.Icon.Default) {
          delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
          leaflet.Icon.Default.mergeOptions({
            iconRetinaUrl: '/leaflet/marker-icon-2x.png',
            iconUrl: '/leaflet/marker-icon.png',
            shadowUrl: '/leaflet/marker-shadow.png',
          });
        }
        
        // First update with base Leaflet loaded
        setLeafletState(prev => ({
          ...prev,
          L: leaflet,
          isLoading: true, // Still loading plugins
          error: null
        }));

        // Try to load the marker cluster plugin with verification
        console.log('Loading MarkerCluster plugin');
        try {
          await import('leaflet.markercluster');
          
          // If component unmounted during async operation, abort
          if (cancelled) return;
          
          // Perform verification of plugins
          const pluginsVerified = await verifyPlugins();
          
          // If component unmounted during async operation, abort
          if (cancelled) return;
          
          if (!pluginsVerified) {
            console.warn('Some Leaflet plugins failed to load completely');
          }
          
          console.log('Leaflet initialization complete');
          
          // Mark initialization as complete to prevent loops
          initializationCompleteRef.current = true;
          
        } catch (pluginErr) {
          console.warn("MarkerCluster plugin not loaded, skipping:", pluginErr);
          
          // If component unmounted during async operation, abort
          if (cancelled) return;
          
          // Update context state with plugin status even if plugin failed
          setLeafletState(prev => ({
            ...prev,
            L: leaflet,
            isLoading: false,
            error: null,
            pluginsLoaded: {
              markerCluster: false
            }
          }));
          
          // Mark initialization as complete to prevent loops
          initializationCompleteRef.current = true;
        }
      } catch (err) {
        console.error("Failed to initialize Leaflet:", err);
        
        // If component unmounted during async operation, abort
        if (cancelled) return;
        
        setLeafletState({
          L: null,
          map: null,
          isLoading: false,
          error: "Failed to load Leaflet map library",
          pluginsLoaded: {
            markerCluster: false
          }
        });
        
        // Even on error, mark initialization as attempted to prevent loops
        initializationCompleteRef.current = true;
      }
    }
    
    // Start the loading process with a small delay to allow component to fully mount
    leafletTimeoutId = setTimeout(loadLeaflet, 50);
    
    // Cleanup function for effect
    return () => {
      cancelled = true;
      
      if (leafletTimeoutId) {
        clearTimeout(leafletTimeoutId);
      }
      
      if (pluginTimeoutRef.current) {
        clearTimeout(pluginTimeoutRef.current);
        pluginTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array to ensure it only runs once
  
  // Helper function to set map instance that can be called by MapContainer
  const setMapInstance = useCallback((mapInstance: LeafletNamespace.Map | null) => {
    setLeafletState(prev => ({
      ...prev,
      map: mapInstance
    }));
  }, []);

  const contextValue = {
    ...leafletState,
    setMap: setMapInstance,
    verifyPlugins
  };

  return (
    <LeafletContext.Provider value={contextValue}>
      {children}
    </LeafletContext.Provider>
  );
} 