"use client"

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Activity, getActivityColor } from './types';
import { useTheme } from 'next-themes';
import { useOverlay } from '@/contexts/overlay-context';
import { parseActivityPhotos, createSafePopupContent } from './utils';
import { Leaf, Droplets, BookOpen, Shield, Zap, Globe } from 'lucide-react';
import { useLeaflet } from '@/contexts/leaflet-context';
import { renderToStaticMarkup } from 'react-dom/server';
import { toast } from 'sonner';

// Import types directly to prevent SSR issues
import type * as LeafletNamespace from 'leaflet';
import type { MarkerProps, PopupProps } from 'react-leaflet';

// Define proper types for dynamically imported Leaflet components
type LeafletMarkerComponent = React.ComponentType<MarkerProps>;
type LeafletPopupComponent = React.ComponentType<PopupProps>;

// This component renders individual activity markers
export interface SimpleMarkerProps {
  activity: Activity;
  Marker: LeafletMarkerComponent;  // Using proper type for the Marker component
  Popup: LeafletPopupComponent;    // Using proper type for the Popup component
}

export function getActivityIcon(type: string): React.ReactNode {
  switch (type) {
    case "reforestation":
      return <Leaf className="h-4 w-4" />
    case "clean-up":
      return <Droplets className="h-4 w-4" />
    case "education":
      return <BookOpen className="h-4 w-4" />
    case "conservation":
      return <Shield className="h-4 w-4" />
    case "renewable":
      return <Zap className="h-4 w-4" />
    default:
      return <Globe className="h-4 w-4" />
  }
}

// Create a marker icon with appropriate styling
export function createMarkerIcon(
  L: typeof LeafletNamespace, 
  color: string, 
  type: string, 
  activityId: string
): LeafletNamespace.DivIcon | undefined {
  if (typeof window === 'undefined' || !L) {
    return undefined;
  }
  
  // Format the icon for the marker based on activity type
  const iconSvg = (() => {
    switch (type) {
      case "reforestation":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 13l10-10 10 10"></path></svg>`;
      case "clean-up":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.2 13.9a5 5 0 1 0 7.6 0"></path><path d="M12 20v-8"></path><path d="M12 12H8.5a4 4 0 0 1-3.8-2.6l-.7-1.9"></path><path d="M12 12h3.5a4 4 0 0 0 3.8-2.6l.7-1.9"></path></svg>`;
      case "education":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
      case "conservation":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
      case "renewable":
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>`;
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
  })();
  
  // Create custom marker HTML - now using SVG for better rendering
  const html = `
    <div
      class="activity-marker-container"
      style="--color: ${color}; position: absolute !important; display: block !important; z-index: 99999 !important; visibility: visible !important; opacity: 1 !important; transform: translate(-25px, -25px) !important; pointer-events: auto !important;"
    >
      <div 
        class="activity-marker relative w-6 h-6 rounded-full flex items-center justify-center bg-black/80 backdrop-blur-sm border-2 border-transparent"
        style="
          border-color: ${color};
          box-shadow: 0 0 10px ${color}, 0 0 5px ${color};
          transform: translate(-50%, -50%) !important;
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          z-index: 99999 !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        "
        data-activity-id="${activityId}"
      >
        <div class="absolute inset-0 rounded-full opacity-20" 
             style="background: ${color}; filter: blur(2px);"></div>
        <div class="relative z-10 text-white" style="color: ${color};">
          ${iconSvg}
        </div>
      </div>
      
      <div 
        class="activity-marker-pulse marker-pulse rounded-full absolute"
        style="
          background: ${color};
          opacity: 0.2;
          width: 30px;
          height: 30px;
          transform: translate(-50%, -50%) scale(0.8) !important;
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          animation: marker-pulse-opacity 3s infinite ease-in-out;
        "
      ></div>
      
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 -z-10">
        <div class="absolute inset-0 rounded-full"
             style="background: radial-gradient(circle, ${color}30 0%, transparent 70%);"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-marker-icon super-high-z-marker',
    html,
    iconSize: [40, 40] as LeafletNamespace.PointExpression,
    iconAnchor: [20, 20] as LeafletNamespace.PointExpression
  });
};

export function SimpleMarker({ activity, Marker, Popup }: SimpleMarkerProps) {
  const { resolvedTheme } = useTheme();
  const color = getActivityColor(activity.type);
  const [showGallery, setShowGallery] = useState(false);
  const { L, map } = useLeaflet();
  
  // Add overlay context hook
  const { showOverlay } = useOverlay();
  
  // Create marker icon - use useMemo for performance
  const markerIcon = useMemo(() => {
    if (typeof window === 'undefined' || !L) {
      return undefined;
    }
    
    // Use the createMarkerIcon helper function with activity id
    return createMarkerIcon(L, color, activity.type, activity.id);
  }, [color, activity.type, activity.id, L]);
  
  // Function to handle marker click
  const handleMarkerClick = useCallback(() => {
    console.log("Marker clicked:", activity.title);
    
    // Show the activity details overlay using the overlay context
    if (activity.id) {
      // Use the overlay context to show activity details
      showOverlay("view", String(activity.id));
    } else {
      console.error("Activity ID missing - cannot show overlay");
    }
  }, [activity.id, showOverlay, activity.title]);
  
  // Generate sanitized popup content
  const popupContent = useMemo(() => {
    return createSafePopupContent(
      activity.title,
      activity.description,
      activity.type,
      activity.address || activity.country || '',
      activity.responsible || '',
      activity.id,
      color
    );
  }, [activity, color]);
  
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Position for the popup - use original coordinates if available
  const popupPosition: [number, number] = [
    activity.originalLat !== undefined ? activity.originalLat : activity.lat,
    activity.originalLng !== undefined ? activity.originalLng : activity.lng
  ];
  
  return (
    <>
      <Marker 
        position={[activity.lat, activity.lng]} 
        icon={markerIcon}
        eventHandlers={{
          click: handleMarkerClick
        }}
      >
        <Popup 
          className="activity-popup" 
          offset={[0, -20]} 
          closeButton={true}
          position={popupPosition}
        >
          <div dangerouslySetInnerHTML={{ __html: popupContent }} />
        </Popup>
      </Marker>
    </>
  );
}

// For server-side rendering compatibility
export default SimpleMarker; 