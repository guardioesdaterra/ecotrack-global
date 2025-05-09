"use client"

import { Activity } from './types';
import type * as LeafletNamespace from 'leaflet';
import { useLeaflet } from '@/contexts/leaflet-context';

// Helper function to safely check if Leaflet is loaded
export function isLeafletLoaded(L: any): L is typeof LeafletNamespace {
  return L !== null && 
         typeof L === 'object' && 
         typeof L.map === 'function' && 
         typeof L.marker === 'function' && 
         typeof L.popup === 'function';
}

// Helper function to safely check if MarkerClusterGroup is available
export function hasMarkerCluster(L: typeof LeafletNamespace): boolean {
  return typeof L.markerClusterGroup === 'function';
}

/**
 * Sanitize HTML content to prevent XSS attacks in popups and other HTML content
 * @param html The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  return html
    // Escape special characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create HTML popup content with proper sanitization
 */
export function createSafePopupContent(
  title: string = '',
  description: string = '',
  type: string = '',
  location: string = '',
  responsible: string = '',
  activityId: string = '',
  color: string = '#00fff7'
): string {
  // Sanitize all inputs
  const safeTitle = sanitizeHTML(title);
  const safeDescription = sanitizeHTML(description);
  const safeType = sanitizeHTML(type);
  const safeLocation = sanitizeHTML(location);
  const safeResponsible = sanitizeHTML(responsible);
  const safeActivityId = sanitizeHTML(activityId);
  const safeColor = color.match(/^#[0-9a-f]{6}$/i) ? color : '#00fff7';
  
  return `
    <div class="activity-popup" data-id="${safeActivityId}">
      <h3 class="text-md font-semibold mb-1" style="color: ${safeColor}; text-shadow: 0 0 5px ${safeColor}40;">${safeTitle}</h3>
      
      ${safeDescription ? `
        <p class="text-sm mb-2 text-gray-300">${safeDescription}</p>
      ` : ''}
      
      ${safeLocation ? `
        <div class="text-xs text-gray-400 mb-1">
          <span class="inline-block w-4 h-4 mr-1 align-text-bottom">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </span>
          ${safeLocation}
        </div>
      ` : ''}
      
      ${safeResponsible ? `
        <div class="text-xs text-gray-400 mb-2">
          <span class="inline-block w-4 h-4 mr-1 align-text-bottom">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </span>
          ${safeResponsible}
        </div>
      ` : ''}
      
      <button 
        class="mt-2 text-xs inline-flex items-center px-2 py-1 rounded-md"
        style="background: rgba(6, 182, 212, 0.2); border: 1px solid ${safeColor}; color: ${safeColor}; cursor: pointer;"
        onclick="window.showActivityOverlay && window.showActivityOverlay('view', '${safeActivityId}')"
      >
        View Details
      </button>
    </div>
  `;
}

// Function to safely parse photo URLs from activity data
export function parseActivityPhotos(photos: unknown): string[] {
  if (!photos) {
    return [];
  }
  
  try {
    // Handle string input (JSON string)
    if (typeof photos === 'string') {
      try {
        const parsed = JSON.parse(photos);
        if (Array.isArray(parsed)) {
          return parsed.filter(url => typeof url === 'string');
        }
        return [];
      } catch (e) {
        // If parsing fails, check if it might be a comma-separated string
        if (photos.includes(',')) {
          return photos.split(',').map(url => url.trim()).filter(Boolean);
        }
        // Single URL
        return [photos];
      }
    }
    
    // Handle array input
    if (Array.isArray(photos)) {
      return photos.filter(url => typeof url === 'string');
    }
    
    return [];
  } catch (e) {
    console.error('Error parsing activity photos:', e);
    return [];
  }
}

// Function to create a debounced version of a function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Configure the map controller with better safety checks
export function configureMapController(map: LeafletNamespace.Map, isMobile: boolean) {
  if (!map) {
    console.error('Map not defined for controller configuration');
    return;
  }
  
  try {
    // Set proper min/max zoom levels 
    map.options.minZoom = 1.5;
    map.options.maxZoom = 7;

    // Set initial view with appropriate zoom levels without animation
    map.setView([0, 0], isMobile ? 1.8 : 2.5, { animate: false });
    
    // Setup resize handler with enhanced safety checks
    const handleResize = debounce(() => {
      try {
        if (!map) return;
        
        // Check if map container exists and is in the DOM
        let container = null;
        try {
          container = map.getContainer();
        } catch (e) {
          console.warn("Could not access map container:", e);
          return; // Exit early if we can't access the container
        }
        
        // Verify the container is valid and in the DOM
        if (!container || !document.body.contains(container)) {
          console.warn("Map container not in DOM during resize");
          return;
        }
        
        // For safety, verify map has internal state before operations
        try {
          if (!map.getSize() || !map.getPixelOrigin()) {
            console.warn("Map internal state inconsistent during resize");
            return;
          }
        } catch (e) {
          console.warn("Error checking map internal state:", e);
          return;
        }
        
        // Only now perform resize operations
        try {
          const mobileView = window.innerWidth <= 768;
          map.setView([0, 0], mobileView ? 1.8 : 2.5, { animate: true, duration: 0.5 });
          map.invalidateSize({ animate: false });
        } catch (err) {
          console.error("Error in map resize operation:", err);
        }
      } catch (e) {
        console.error("Error in resize handler:", e);
      }
    }, 200);

    window.addEventListener("resize", handleResize);
    
    // Return cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  } catch (error) {
    console.error("Error configuring map controller:", error);
  }
}

// Function to enhance touch interactions for mobile devices
export function configureTouchInteractions(map: LeafletNamespace.Map) {
  // Currently empty but would include mobile-specific optimizations
  // This is a placeholder for future touch optimization code
  return () => {}; // Return cleanup function
}

// Function to add touch styles to the document head
export function addTouchStyles() {
  // Would add mobile-specific CSS
  // This is a placeholder for future touch styling code
}

// Calculate distance between two points in kilometers
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  if (
    typeof lat1 !== 'number' || 
    typeof lon1 !== 'number' || 
    typeof lat2 !== 'number' || 
    typeof lon2 !== 'number'
  ) {
    throw new Error('Coordinates must be numbers');
  }
  
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Find nearest activity to a point
export function findNearestActivity(
  activities: Activity[], 
  lat: number, 
  lng: number, 
  maxDistance = 50
): Activity | null {
  if (!Array.isArray(activities) || activities.length === 0) {
    return null;
  }

  let nearest: Activity | null = null;
  let minDistance = Infinity;

  for (const activity of activities) {
    if (
      typeof activity !== 'object' || 
      activity === null || 
      typeof activity.lat !== 'number' || 
      typeof activity.lng !== 'number'
    ) {
      continue; // Skip invalid activities
    }
    
    const distance = calculateDistance(lat, lng, activity.lat, activity.lng);
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      nearest = activity;
    }
  }

  return nearest;
} 