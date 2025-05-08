'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DynamicMapProps } from './dynamic-map';

// Fix for Leaflet's default icon paths
if (typeof window !== 'undefined') {
  // Set up default icon paths
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
  });
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

  // Store map instance ref and call onMapReady callback
  const handleMapCreated = (map: L.Map) => {
    mapRef.current = map;
    if (onMapReady) {
      onMapReady(map);
    }
  };

  // Apply dark mode to map
  useEffect(() => {
    if (mapRef.current) {
      const mapContainer = mapRef.current.getContainer();
      if (darkMode) {
        mapContainer.classList.add('dark-map');
      } else {
        mapContainer.classList.remove('dark-map');
      }
    }
  }, [darkMode, mapRef]);

  // Use ref to access map instance after it's created
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (mapRef.current) {
        handleMapCreated(mapRef.current);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <MapContainer
      center={center as L.LatLngExpression}
      zoom={zoom}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
      ref={(map) => {
        if (map) {
          mapRef.current = map;
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