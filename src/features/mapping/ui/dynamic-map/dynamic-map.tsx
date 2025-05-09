'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useViewport } from '@/lib/store/app-store';
import type { Map as LeafletMap } from 'leaflet';

// Define types for props
export interface DynamicMapProps {
  /**
   * Center coordinates [latitude, longitude]
   */
  center?: [number, number];
  /**
   * Zoom level (1-18)
   */
  zoom?: number;
  /**
   * Whether to show zoom controls
   */
  showZoomControls?: boolean;
  /**
   * Children elements to render inside the map
   */
  children?: React.ReactNode;
  /**
   * Additional className for styling
   */
  className?: string;
  /**
   * Callback when map is ready
   */
  onMapReady?: (map: LeafletMap) => void;
  /**
   * Whether to use dark mode styles
   */
  darkMode?: boolean;
}

/**
 * Map loading placeholder component
 */
const MapPlaceholder = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center bg-gray-900 w-full h-full ${className}`}>
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-cyan-400 animate-pulse">Loading map...</p>
      </div>
    </div>
  );
};

// Type for the dynamically loaded component
type DynamicMapComponentType = React.ComponentType<DynamicMapProps & { children?: React.ReactNode }>;

/**
 * Dynamic Leaflet map component
 * - Uses next/dynamic to prevent SSR hydration issues
 * - Implements proper viewport height calculations
 * - Supports dark mode
 * - Handles resize events
 */
export function DynamicMap({
  center = [0, 0],
  zoom = 3,
  showZoomControls = true,
  children,
  className = '',
  onMapReady,
  darkMode = true,
}: DynamicMapProps) {
  // Get viewport info from Zustand store
  const { height } = useViewport();
  
  // Protect against SSR hydration issues with dynamic import
  const MapComponent = React.useMemo(
    () =>
      dynamic(
        () => import('./map-component'), 
        {
          loading: () => <MapPlaceholder className={className} />,
          ssr: false, // Disable server-side rendering
        }
      ) as DynamicMapComponentType,
    [className]
  );

  return (
    <div 
      className={`leaflet-container ${className}`} 
      style={{ height: `${height || 100}px` }}
    >
      <MapComponent
        center={center}
        zoom={zoom}
        showZoomControls={showZoomControls}
        darkMode={darkMode}
        onMapReady={onMapReady}
      >
        {children}
      </MapComponent>
    </div>
  );
}

export default DynamicMap; 