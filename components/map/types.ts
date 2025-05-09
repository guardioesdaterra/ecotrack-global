// Define all shared map-related types
import type * as LeafletNamespace from 'leaflet';

// Extend Leaflet typings to include marker cluster plugin
declare module 'leaflet' {
  // Add MarkerClusterGroup to Leaflet namespace
  export interface MarkerClusterGroupOptions {
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    spiderfyOnMaxZoom?: boolean;
    removeOutsideVisibleBounds?: boolean;
    animate?: boolean;
    animateAddingMarkers?: boolean;
    disableClusteringAtZoom?: number;
    maxClusterRadius?: number;
    polygonOptions?: LeafletNamespace.PolylineOptions;
    singleMarkerMode?: boolean;
    spiderfyDistanceMultiplier?: number;
    iconCreateFunction?: (cluster: any) => LeafletNamespace.DivIcon;
    chunkedLoading?: boolean;
  }
  
  // Extend Marker type to include custom properties
  export interface Marker {
    activityId?: string;  // Our custom property for activity ID
  }
  
  // Add the function for creating marker cluster groups
  export function markerClusterGroup(options?: MarkerClusterGroupOptions): any;
}

// Standard Activity interface used across all map components
export interface Activity {
  id: string
  lat: number
  lng: number
  country?: string
  address?: string
  city?: string | null
  type: string
  title: string
  responsible?: string
  description?: string
  photos?: string[] // Updated to string array to match our implementation
  hyperlink?: string | null
  created_at?: string | null
  // Optional properties for internal use
  originalLat?: number
  originalLng?: number
}

// MapClientProps for the main component
export interface MapClientProps {
  activities: Activity[]
  initialSelectedActivity?: string | null
  stadiaApiKey?: string | null
}

// Photo gallery types
export interface PhotoGalleryProps {
  photos: string[];
  isOpen: boolean;
  onClose: () => void;
  activityTitle: string;
  activityColor: string;
}

// Connection types for lines between activities
export interface Connection {
  id: string
  from_activity_id: string
  to_activity_id: string
  type: string
  description?: string
}

// Particle types
export interface Particle {
  x: number
  y: number
  size: number
  speed: number
  progress: number
  color: string
  connection?: ConnectionData
  el?: HTMLDivElement
}

export interface ConnectionData {
  source: Activity
  target: Activity
  id: string
  curveDirection: number
}

// Utility function to get color based on activity type
export function getActivityColor(type: string): string {
  switch (type) {
    case "reforestation":
      return "#00fff7"
    case "clean-up":
      return "#ff00ea"
    case "education":
      return "#ffe600"
    case "conservation":
      return "#00ff85"
    case "renewable":
      return "#64ff00"
    default:
      return "#ff007a"
  }
} 