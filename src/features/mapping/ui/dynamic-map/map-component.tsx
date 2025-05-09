'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DynamicMapProps } from './dynamic-map';

// Fix for Leaflet's default icon paths
if (typeof window !== 'undefined') {
  // Set up default icon paths
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });
  } catch (e) {
    console.error('Failed to configure Leaflet default icons:', e);
  }
}

interface MapComponentProps extends DynamicMapProps {
  /**
   * Child elements to render inside the map
   */
  children?: React.ReactNode;
}

/**
 * Internal map component to be dynamically loaded
 * Contains the actual Leaflet implementation
 */
function MapComponent({
  center,
  zoom,
  showZoomControls,
  children,
  onMapReady,
  darkMode,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Store map instance ref and call onMapReady callback
  const handleMapCreated = (map: L.Map) => {
    try {
      mapRef.current = map;
      if (onMapReady && !initializedRef.current) {
        initializedRef.current = true;
        onMapReady(map);
      }
    } catch (e) {
      console.error('Error initializing map:', e);
      setError('Failed to initialize map. Please refresh the page or try again later.');
    }
  };

  // Apply dark mode to map
  useEffect(() => {
    if (!mapRef.current) return;
    
    try {
      const mapContainer = mapRef.current.getContainer();
      if (darkMode) {
        mapContainer.classList.add('dark-map');
      } else {
        mapContainer.classList.remove('dark-map');
      }
    } catch (e) {
      console.warn('Error applying theme to map:', e);
    }
  }, [darkMode]);

  // Use ref to access map instance after it's created
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    try {
      timeoutId = setTimeout(() => {
        if (mapRef.current && !initializedRef.current) {
          handleMapCreated(mapRef.current);
        }
      }, 100);
    } catch (e) {
      console.error('Error in map initialization timeout:', e);
    }
    
    return () => {
      clearTimeout(timeoutId);
      
      // Clean up map instance on unmount
      if (mapRef.current) {
        try {
          // Remove event listeners
          mapRef.current.off();
          // Remove map instance
          mapRef.current.remove();
          mapRef.current = null;
          initializedRef.current = false;
        } catch (e) {
          console.warn('Error cleaning up map:', e);
        }
      }
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-900 text-white p-4">
        <div className="text-center max-w-md">
          <div className="mb-4 text-red-400 text-3xl">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">Map Error</h3>
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center as L.LatLngExpression}
      zoom={zoom}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
      ref={(map) => {
        if (map && !initializedRef.current) {
          try {
            mapRef.current = map;
            handleMapCreated(map);
          } catch (e) {
            console.error('Error in map ref callback:', e);
            setError('Failed to initialize map properly.');
          }
        }
      }}
    >
      {/* Base tile layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Optional zoom controls */}
      {showZoomControls && <ZoomControl position="bottomright" />}
      
      {/* Child elements (markers, popups, etc.) */}
      {children}
    </MapContainer>
  );
}

export default MapComponent; 