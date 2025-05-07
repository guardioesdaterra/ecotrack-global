"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo, createContext, useContext } from "react"
import "leaflet/dist/leaflet.css"
import { useTheme } from "next-themes"
import dynamic from "next/dynamic"
import { Globe } from "lucide-react"
import { TileLayer, Marker, Popup, MapContainer, useMap, ZoomControl } from "react-leaflet"
import { Badge } from "@/components/ui/badge"
import { ParticleEffect } from "@/components/particle-effect"
import { useMediaQuery } from "@/hooks/use-media-query"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Zap, Leaf, Droplets, BookOpen, Shield, Wind } from "lucide-react"
import { ConnectionLines } from "./connection-lines"
import { getActivityColor } from "@/components/map-component"
import { getSupabaseBrowserClient } from "@/lib/supabaseClient"
import { useEffects } from "@/lib/effects"
import { AnimationInstance } from "@/types/animations"
import { Activity as ActivityType } from "@/components/map-component"
import { convertToMapActivity } from "@/lib/utils"

// Import Leaflet dynamically to avoid SSR issues
import type * as LeafletNamespace from 'leaflet';
// Import a specific version of Leaflet CSS to ensure compatibility
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"

// Define our local Activity interface for this component
import type { Activity as BaseActivity } from "@/components/map-component";

// This will be our Leaflet instance, initialized client-side only
let L: typeof LeafletNamespace | null = null;

// Add a type declaration for leaflet.markercluster
declare global {
  interface Window {
    prevActivityImage: (id: string) => void;
    nextActivityImage: (id: string) => void;
    showGallery_: {[key: string]: () => void};
  }
}

// Helper function to debounce function calls
function debounce<T extends (...args: any[]) => any>(
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

// Set up a flag to track if Leaflet is loaded
const useLeaflet = () => {
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [error, setError] = useState<string|null>(null);
  
  useEffect(() => {
    // Skip loading on server side
    if (typeof window === 'undefined') return;
    
    async function loadLeaflet() {
      try {
        if (L) {
          setIsLeafletLoaded(true);
          return;
        }
        
        // Import Leaflet library
        const leaflet = await import('leaflet');
        L = leaflet;
        
        // Import Leaflet MarkerCluster for clustering
        try {
          await import('leaflet.markercluster');
        } catch (err) {
          console.warn("Failed to load marker cluster plugin:", err);
          // Continue without marker clustering
        }
        
        // Configure default markers
        if (L && L.Icon && L.Icon.Default) {
          delete (L.Icon.Default.prototype as any)._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });
        }
        
        setIsLeafletLoaded(true);
      } catch (err) {
        console.error("Failed to load Leaflet:", err);
        setError("Failed to load map resources. Please check your connection and try again.");
      }
    }
    
    loadLeaflet();
  }, []);
  
  return { isLeafletLoaded, error };
};

interface Activity {
  id: string
  lat: number
  lng: number
  country?: string
  adress?: string
  city?: string | null
  type: string
  title: string
  responsible?: string
  description?: string
  photos?: string | null
  hyperlink?: string | null
  created_at?: string | null
  originalLat?: number
  originalLng?: number
}

interface MapClientProps {
  activities: Activity[]
  initialSelectedActivity?: string | null
  stadiaApiKey?: string | null
}


// Define SearchFilters interface if needed
interface SearchFilters {
  query: string
  types: string[]
  expanded: boolean
}

// Add PhotoGallery component at the top level of the file
interface PhotoGalleryProps {
  photos: string[];
  isOpen: boolean;
  onClose: () => void;
  activityTitle: string;
  activityColor: string;
}

function PhotoGallery({ photos, isOpen, onClose, activityTitle, activityColor }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { shouldReduceAnimations } = useEffects();
  
  // Memoize the transition duration to avoid frequent recalculations
  const transitionDuration = useMemo(() => 
    shouldReduceAnimations ? 500 : 300, 
    [shouldReduceAnimations]
  );
  
  useEffect(() => {
    // Lock body scroll when gallery is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Add ESC key handler to close gallery
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      
      window.addEventListener('keydown', handleEsc);
      return () => {
        window.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);
  
  const nextImage = useCallback(() => {
    if (isTransitioning || photos.length <= 1) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
      setIsTransitioning(false);
    }, transitionDuration);
  }, [isTransitioning, photos.length, transitionDuration]);
  
  const prevImage = useCallback(() => {
    if (isTransitioning || photos.length <= 1) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
      setIsTransitioning(false);
    }, transitionDuration);
  }, [isTransitioning, photos.length, transitionDuration]);
  
  // Add keyboard navigation using arrow keys
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage(); 
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextImage, prevImage]);
  
  if (!isOpen) return null;
  
  // Use simpler styling for reduced motion/animations
  const containerShadow = shouldReduceAnimations 
    ? `border: 1px solid ${activityColor}40` 
    : `box-shadow: 0 0 30px ${activityColor}50, 0 0 50px ${activityColor}20; border: 1px solid ${activityColor}40`;
  
  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center" 
      style={{
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: shouldReduceAnimations ? 'none' : 'blur(10px)',
      }}
    >
      <div 
        className="relative max-w-4xl w-full mx-4 rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'rgba(20, 20, 25, 0.9)',
          [containerShadow]: true,
          height: 'calc(100vh - 120px)',
          maxHeight: '800px',
        }}
      >
        {/* Header */}
        <div 
          className="flex justify-between items-center p-3 border-b"
          style={{ borderColor: `${activityColor}30` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${activityColor}20`, border: `1px solid ${activityColor}40` }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activityColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-medium truncate">{activityTitle}</h3>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Main Image Container */}
        <div 
          className="relative flex items-center justify-center" 
          style={{ 
            height: 'calc(100% - 120px)',
            backgroundColor: 'rgba(0,0,0,0.5)' 
          }}
        >
          {/* Fullsize Image */}
          <img 
            src={photos[currentIndex]} 
            alt={`${activityTitle} - Photo ${currentIndex + 1}`}
            className="h-full w-full object-contain"
            style={{ 
              transition: `opacity ${transitionDuration}ms ease-in-out, transform ${transitionDuration}ms ease-in-out`,
              opacity: isTransitioning ? 0.5 : 1,
              transform: isTransitioning ? 'scale(0.95)' : 'scale(1)'
            }}
          />
          
          {/* Cyberpunk overlay effects - only render if not reducing animations */}
          {!shouldReduceAnimations && (
            <>
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ 
                  boxShadow: `inset 0 0 100px ${activityColor}20`,
                  backgroundImage: `
                    linear-gradient(
                      to bottom,
                      transparent 0%,
                      transparent 95%,
                      ${activityColor}40 100%
                    )
                  `,
                  opacity: 0.7
                }}
              />
              
              <div 
                className="absolute inset-0 pointer-events-none opacity-10" 
                style={{ 
                  backgroundImage: 'url("/scanline.gif")',
                  backgroundRepeat: 'repeat',
                  mixBlendMode: 'overlay'
                }}
              />
            </>
          )}
          
          {/* Image number indicator */}
          <div 
            className="absolute bottom-4 right-4 px-3 py-1.5 rounded bg-black/70 text-white text-sm"
            style={{ 
              border: `1px solid ${activityColor}40`,
              boxShadow: shouldReduceAnimations ? 'none' : `0 0 10px ${activityColor}30`
            }}
          >
            {currentIndex + 1} / {photos.length}
          </div>
          
          {/* Navigation buttons (only show if more than one image) */}
          {photos.length > 1 && (
            <>
              {/* Previous button */}
              <button 
                onClick={prevImage}
                className="absolute left-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all hover:scale-110"
                style={{ 
                  boxShadow: shouldReduceAnimations ? 'none' : `0 0 15px ${activityColor}20`,
                  border: `1px solid ${activityColor}30`
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              {/* Next button */}
              <button 
                onClick={nextImage}
                className="absolute right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all hover:scale-110"
                style={{ 
                  boxShadow: shouldReduceAnimations ? 'none' : `0 0 15px ${activityColor}20`,
                  border: `1px solid ${activityColor}30`
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}
        </div>
        
        {/* Thumbnail navigation */}
        {photos.length > 1 && (
          <div 
            className="p-4 flex gap-2 overflow-x-auto custom-scrollbar"
            style={{
              backgroundColor: 'rgba(10, 10, 20, 0.8)',
              borderTop: `1px solid ${activityColor}20`
            }}
          >
            {photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index !== currentIndex) {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setCurrentIndex(index);
                      setIsTransitioning(false);
                    }, transitionDuration);
                  }
                }}
                className={`flex-shrink-0 rounded overflow-hidden transition-all ${
                  index === currentIndex ? 'scale-105' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  width: '60px',
                  height: '60px',
                  transitionDuration: `${transitionDuration * 0.7}ms`,
                  border: index === currentIndex ? `2px solid ${activityColor}` : 'none'
                }}
              >
                <img
                  src={photo}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case "reforestation":
      return <Leaf className="h-4 w-4" />
    case "clean-up":
      return <Droplets className="h-4 w-4" />
    case "education":
      return <BookOpen className="h-4 w-4" />
    case "conservation":
      return <Shield className="h-4 w-4" />
    default:
      return <Zap className="h-4 w-4" />
  }
}

// MapEffects component to inject animation styles
function MapEffects() {
  return (
    <div style={{ display: 'none' }}>
      <style jsx global>{`
        @keyframes windLineAnimation {
          0% {
            opacity: 0;
            transform: translateX(-50px) rotate(var(--rotation, 0deg)) scale(0.5);
          }
          50% {
            opacity: 0.8;
            transform: translateX(0) rotate(var(--rotation, 0deg)) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(50px) rotate(var(--rotation, 0deg)) scale(0.5);
          }
        }
        
        @keyframes pulsate {
          0% {
            transform: scale(0.8);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.6;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.3;
          }
        }
        
        /* New animation that only changes opacity */
        @keyframes marker-pulse-opacity {
          0% {
            opacity: 0.7;
            transform: translate(-50%, -50%);
          }
          50% {
            opacity: 0.3;
            transform: translate(-50%, -50%);
          }
          100% {
            opacity: 0.7;
            transform: translate(-50%, -50%);
          }
        }
        
        /* Override the hover animation for activity markers */
        .activity-marker:hover,
        .activity-marker-hover:hover {
          transform: translate(-50%, -50%) !important; /* Keep in the same position */
          box-shadow: 0 0 25px var(--color, cyan), 0 0 50px var(--color, cyan) !important; /* Intense glow effect */
        }
        
        /* Ensure markers don't move on hover */
        .super-high-z-marker:hover {
          transform: none !important;
        }
        
        /* Make sure the container doesn't move either */
        .activity-marker-container:hover {
          transform: none !important;
        }

        /* Fix any global CSS that might be causing movement */
        .leaflet-marker-icon:hover {
          transform: none !important;
        }
        
        /* Enhanced label visibility */
        .leaflet-labels-pane {
          filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.7));
          z-index: 1000 !important; /* Force higher z-index */
        }

        .leaflet-labels-pane img {
          mix-blend-mode: normal;
          filter: contrast(1.7) brightness(1.6) saturate(1.4);
        }
        
        /* Add a stronger glow around labels */
        .leaflet-labels-pane::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          filter: blur(3px);
          opacity: 0.5;
        }
        
        /* Chroma key for white color only with high z-index */
        .enhanced-labels {
          color: white;
          z-index: 999999 !important;
          background-color: transparent;
          text-shadow: 1px 1px 2px #fff, 0 0 25px #fff, 0 0 5px #fff;
        }
        
        /* Create a highlight effect around important labels */
        .leaflet-labels-pane .leaflet-tile-loaded {
          position: relative;
          font-weight: bold !important;
        }
        
        /* Increase label visibility with backlight effect */
        .leaflet-tile-container {
          position: relative;
        }
        
        /* Improve map visibility */
        .osm-base-layer {
          filter: contrast(1.2) brightness(1.1);
        }
        
        /* Enhance text labels specifically */
        .leaflet-tile-loaded {
          font-weight: bold !important;
        }
        
        /* Add a subtle highlight to map features */
        .leaflet-container {
          --map-highlight: rgba(255, 255, 255, 0.1);
          --map-shadow: rgba(0, 0, 0, 0.2);
          box-shadow: inset 0 0 30px var(--map-shadow);
          border-radius: 4px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// Create a non-hook version of MapController - extract the logic
function configureMapController(map: L.Map, isMobile: boolean) {
  if (!map) {
    console.error('Map not defined for controller configuration');
    return;
  }
  
  try {
    // Set proper min/max zoom levels for better mobile experience
    map.options.minZoom = 2;
    map.options.maxZoom = 5;

    // Set initial view with appropriate zoom levels without animation
    map.setView([0, 0], isMobile ? 1.8 : 2.5, { animate: false });
    
    // Setup resize handler with enhanced safety checks for _leaflet_pos errors
    const handleResize = debounce(() => {
      try {
        // First ensure map still exists
    if (!map) return;
    
        // Check if map container exists and is in the DOM
        let container = null;
        try {
          // Use try-catch for accessing container since this often fails
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
        
        // Check any DOM elements with _leaflet_pos that might cause errors
        try {
          const mapPanes = container.querySelector('.leaflet-map-pane');
          if (mapPanes && !mapPanes.hasAttribute('style')) {
            console.warn("Map panes missing style attribute");
            return;
          }
        } catch (e) {
          console.warn("Error validating map DOM elements:", e);
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

// Define Map Context Type
interface MapContextType {
  map: L.Map | null;
  processedActivities: Activity[];
}

// Create MapContext for passing the map instance
const MapContext = createContext<MapContextType>({ map: null, processedActivities: [] });

// Change the signature of ActivityNode to accept the needed map and not use useMap
function ActivityNode({ activity, map }: { activity: Activity, map: L.Map | null }) {
  const { resolvedTheme } = useTheme();
  const color = getActivityColor(activity.type);
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const markerRef = useRef<L.Marker | null>(null);
  
  // Parse photos from JSON string if available
  useEffect(() => {
    if (activity.photos) {
      // If it's already a string and looks like a URL, use it directly
      if (typeof activity.photos === 'string') {
        if (activity.photos.startsWith('http://') || activity.photos.startsWith('https://')) {
          // It's a single URL, wrap it in an array
          setImages([activity.photos]);
        } else {
          // Only try to parse if it doesn't look like a URL
          try {
            const photoUrls = JSON.parse(activity.photos);
            if (Array.isArray(photoUrls)) {
              setImages(photoUrls);
            } else if (typeof photoUrls === 'string') {
              setImages([photoUrls]);
            }
          } catch (e) {
            // If parsing fails, treat as a single string
            setImages([activity.photos]);
            console.error("Not a URL or valid JSON, using as plain string:", activity.photos);
          }
        }
      }
    }
  }, [activity.photos]);
  
  // Define image navigation functions
  const photoArray = useMemo(() => {
    if (!activity.photos) return [];
    if (typeof activity.photos !== 'string') return [];
    return activity.photos.split(',').map(url => url.trim()).filter(url => url.length > 0);
  }, [activity.photos]);
  
  const prevImage = useCallback(() => {
    if (photoArray.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? photoArray.length - 1 : prev - 1));
  }, [photoArray.length]);
  
  const nextImage = useCallback(() => {
    if (photoArray.length <= 1) return;
    setActiveImageIndex((prev) => (prev === photoArray.length - 1 ? 0 : prev + 1));
  }, [photoArray.length]);
  
  // Update global functions for image navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Store function references in a more controlled way
      if (!window.showGallery_) {
        window.showGallery_ = {};
      }
      
      // Create a function to show this specific activity's gallery
      window.showGallery_[activity.id] = () => setShowGallery(true);
      
      // Define global functions for image navigation
      const prevHandler = (id: string) => {
        if (id === activity.id) prevImage();
      };
      
      const nextHandler = (id: string) => {
        if (id === activity.id) nextImage();
      };
      
      window.prevActivityImage = prevHandler;
      window.nextActivityImage = nextHandler;
      
      return () => {
        // Clean up global functions when component unmounts
        if (window.showGallery_ && window.showGallery_[activity.id]) {
          delete window.showGallery_[activity.id];
        }
      };
    }
  }, [activity.id, prevImage, nextImage]);
  
  // Create marker and add to map - using pure Leaflet API rather than React-Leaflet components
  useEffect(() => {
    // Early return if map isn't available or L is not loaded
    if (!map || !L) return;
    
    // Since we've guarded against L being null, we can now safely use it in this scope
    const leafletLib = L;
    
    // Create a delayed setup function to ensure DOM is ready
    const setupMarker = () => {
      try {
        // Skip if no valid container
        if (!map.getContainer || typeof map.getContainer !== 'function') {
          console.error('Map container function not available, cannot add marker');
          return;
        }
        
        const container = map.getContainer();
        if (!container || !document.body.contains(container)) {
          console.error('Map container not in DOM, cannot add marker');
          return;
        }
        
        // Create a divIcon with even higher z-index
        const divIcon = leafletLib.divIcon({
    html: `
      <div class="activity-marker-container" style="
        position: relative;
        width: 50px; 
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
        z-index: 99999999 !important;
        visibility: visible !important;
        opacity: 1 !important;
      ">
      <div class="activity-marker" style="
        width: 30px; 
        height: 30px; 
        background-color: ${color};
        border-radius: 50%;
        display: flex; 
        align-items: center; 
        justify-content: center;
        box-shadow: 0 0 15px ${color}, 0 0 30px ${color};
        border: 2px solid white;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 99999999 !important;
        transition: none !important;
        visibility: visible !important;
        opacity: 1 !important;
      "></div>
      ${activity.originalLat !== undefined ? `
        <div style="
          position: absolute;
          top: 8%;
          right: 8%;
          width: 16px;
          height: 16px;
          background-color: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          border: 1px solid ${color};
          color: white;
          font-size: 10px;
          font-weight: bold;
          text-align: center;
          line-height: 14px;
          z-index: 99999 !important;
          box-shadow: 0 0 5px ${color}, 0 0 10px rgba(0, 0, 0, 0.5);
        ">+</div>
      ` : ''}
      <div class="activity-marker-pulse" style="
        position: absolute;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: transparent;
        border: 2px solid ${color};
        opacity: 0.6;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: marker-pulse-opacity 2s infinite;
        z-index: 99997 !important;
        visibility: visible !important;
        display: block !important;
      "></div>
      </div>
    `,
    className: "super-high-z-marker",
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });
  
        // Create popup instance
        const customPopup = leafletLib.popup({
          className: "custom-popup",
          maxWidth: 500,
          autoPan: true,
          closeButton: true,
          autoClose: false
        });
        
        // Create marker and add to map if it doesn't exist yet
        if (!markerRef.current) {
          const marker = leafletLib.marker([activity.lat, activity.lng], {
            icon: divIcon,
            interactive: true, // Ensure marker is clickable
            bubblingMouseEvents: false // Don't pass events to map
          });
          
          // Store the marker reference
          markerRef.current = marker;
          
          // Add click handler
          marker.on('click', (e) => {
            try {
              // Skip if map is no longer valid
              if (!map || !map.getContainer || typeof map.getContainer !== 'function') {
                return;
              }
              
              const container = map.getContainer();
              if (!container || !document.body.contains(container)) {
                return;
              }
              
            console.log("Marker clicked:", activity.title);
            
            // Calculate new zoom level respecting min/max limits
            let newZoom = map.getZoom() < 8 ? 8 : map.getZoom() + 1;
            // Ensure zoom is within our limits
            newZoom = Math.min(16, Math.max(2, newZoom));
            
            // Generate image slider HTML if we have images
            let imageSliderHtml = '';
            if (images.length > 0) {
              const currentImage = images[activeImageIndex];
              
              imageSliderHtml = `
                <div class="eco-activity-image-slider">
                  <img src="${currentImage}" class="eco-activity-image" alt="${activity.title}" />
                  <div class="eco-activity-image-overlay"></div>
                  
                  ${images.length > 1 ? `
                      <button onclick="window.prevActivityImage('${activity.id}')" class="image-nav-button absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    
                      <button onclick="window.nextActivityImage('${activity.id}')" class="image-nav-button absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                    
                    <div class="eco-activity-dots">
                      ${images.map((_, i) => `
                        <div class="eco-activity-dot ${i === activeImageIndex ? 'active' : ''}"></div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }
            
            // Format the activity information
            let locationInfo = '';
            if (activity.adress) {
              locationInfo = activity.adress;
            } else if (activity.country) {
              locationInfo = activity.country;
              if (activity.city) locationInfo = `${activity.city}, ${locationInfo}`;
            }
            
              // Create content for the popup - skipped most of it for brevity
            const content = `
              <div class="eco-activity-popup">
                ${imageSliderHtml}
                <div class="eco-activity-content">
                    <!-- Content would go here - removed for brevity -->
                    <h3>${activity.title}</h3>
                    <p>${activity.description || ''}</p>
              </div>
            </div>
          `;
            
            // Open the popup at the marker's location
            customPopup.setLatLng([activity.lat, activity.lng]).setContent(content).openOn(map);
            } catch (e) {
              console.error("Error handling marker click:", e);
            }
          });
          
          // Add the marker to the map with a slight delay to ensure DOM is ready
          setTimeout(() => {
            try {
              if (map && map.getContainer && typeof map.getContainer === 'function') {
                const container = map.getContainer();
                if (container && document.body.contains(container) && markerRef.current) {
                  markerRef.current.addTo(map);
                }
              }
            } catch (e) {
              console.error("Error adding marker to map:", e);
            }
          }, 300);
        }
      } catch (e) {
        console.error("Error creating marker:", e);
      }
    };
    
    // Execute with delay to ensure DOM is ready
    const timer = setTimeout(setupMarker, 500);
    
    // Return cleanup function to remove marker when component unmounts
    return () => {
      clearTimeout(timer);
      
      try {
        if (map && markerRef.current) {
          // Verify map is valid before removing marker
          if (map.getContainer && typeof map.getContainer === 'function') {
            const container = map.getContainer();
            if (container && document.body.contains(container)) {
              markerRef.current.remove();
            }
          }
          markerRef.current = null;
        }
      } catch (e) {
        console.error("Error removing marker during cleanup:", e);
      }
    };
  }, [map, activity, color, images, activeImageIndex]);
  
  return (
    <>
      {/* Photo Gallery Overlay */}
      <PhotoGallery 
        photos={images} 
        isOpen={showGallery} 
        onClose={() => setShowGallery(false)} 
        activityTitle={activity.title}
        activityColor={color}
      />
      
      {/* CSS additional specific for this marker */}
      <style jsx global>{`
        .super-high-z-marker {
          z-index: 99999999 !important;
          position: absolute !important;
          pointer-events: auto !important;
          visibility: visible !important;
          opacity: 1 !important;
          display: block !important;
        }
        
        /* Force marker visibility */
        .leaflet-marker-pane {
          z-index: 9999999 !important;
          visibility: visible !important;
          display: block !important;
        }
        
        .leaflet-marker-icon {
          visibility: visible !important;
          opacity: 1 !important;
          display: block !important;
          position: absolute !important;
        }
      `}</style>
    </>
  );
}

function MapOverlays({ map }: { map: L.Map }) {
  const [gridImageLoaded, setGridImageLoaded] = useState(true);
  const [scanlineImageLoaded, setScanlineImageLoaded] = useState(true);
  const [particlesActive, setParticlesActive] = useState(true);
  // Get activities from the parent scope to use in particle effects
  const { processedActivities } = useContext(MapContext);
  
  useEffect(() => {
    // Check if grid overlay image exists
    const gridImg = new Image();
    gridImg.onload = () => setGridImageLoaded(true);
    gridImg.onerror = () => setGridImageLoaded(false);
    gridImg.src = '/grid-overlay.png';
    
    // Check if scanline image exists
    const scanlineImg = new Image();
    scanlineImg.onload = () => setScanlineImageLoaded(true);
    scanlineImg.onerror = () => setScanlineImageLoaded(false);
    scanlineImg.src = '/scanline.gif';
  }, []);
  
  // Convert to BaseActivity type for the particle components
  const baseActivities = useMemo(() => {
    if (!processedActivities) return [];
    return processedActivities.map(activity => convertToBaseActivity(activity));
  }, [processedActivities]);
  
  return (
    <>
      {/* Activity-to-Activity particles */}
      {particlesActive && processedActivities && processedActivities.length > 1 && (
        <>
          <ParticleEffect activities={baseActivities} map={map} />
          <ConnectionLines activities={baseActivities} map={map} />
        </>
      )}
      
      {/* Partículas animadas */}
      {particlesActive && (
        <div className="absolute inset-0 pointer-events-none overflow-visible particle-container" style={{ zIndex: 9999 }}>
          {/* Ambient particles - background */}
          <div 
            className="absolute inset-0 z-[1997] overflow-visible" 
            style={{ 
              background: `
                radial-gradient(circle at 20% 30%, rgba(6, 247, 247, 0.03) 0%, transparent 8%),
                radial-gradient(circle at 50% 70%, rgba(148, 82, 245, 0.03) 0%, transparent 8%),
                radial-gradient(circle at 80% 20%, rgba(255, 42, 109, 0.03) 0%, transparent 8%),
                radial-gradient(circle at 15% 80%, rgba(10, 252, 10, 0.03) 0%, transparent 8%),
                radial-gradient(circle at 85% 60%, rgba(5, 217, 254, 0.03) 0%, transparent 8%)
              `,
              animation: "pulse 8s infinite alternate" 
            }}
          />
          
          {/* Animated floating particles */}
          <div className="particle-overlay absolute inset-0 z-[9998]">
            {Array.from({ length: 100 }).map((_, i) => {
              const size = Math.random() * 4 + 2;
              const top = Math.random() * 100;
              const left = Math.random() * 100;
              
              // Randomize particle colors
              const colors = ['rgba(6, 247, 247, 0.8)', 'rgba(148, 82, 245, 0.8)', 'rgba(255, 42, 109, 0.8)', 'rgba(10, 252, 10, 0.8)', 'rgba(5, 217, 254, 0.8)'];
              const color = colors[Math.floor(Math.random() * colors.length)];
              
              // Randomize animation properties
              const animType = Math.random() > 0.5 ? 'float-particle' : 'float-particle-alt';
              const duration = 10 + Math.random() * 10;
              const delay = Math.random() * 5;
              const pulse = Math.random() > 0.7;
              
              return (
                <div 
                  key={i}
                  className="absolute rounded-full map-particle"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    top: `${top}%`,
                    left: `${left}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 ${size * 2}px ${color}, 0 0 ${size}px ${color}`,
                    opacity: 0.4 + Math.random() * 0.4,
                    zIndex: 99999,
                    animation: `
                      ${animType} ${duration}s infinite ease-in-out ${delay}s
                      ${pulse ? `, particle-pulse ${3 + Math.random() * 2}s infinite ${Math.random() * 2}s` : ''}
                    `
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Grid overlay with improved styling, animation and fallback */}
      {gridImageLoaded ? (
        <div 
          className="absolute inset-0 pointer-events-none z-[1999] grid-effect" 
          style={{
            backgroundImage: "url('/grid-overlay.png')",
            backgroundSize: "cover",
            backgroundRepeat: "repeat",
            mixBlendMode: "overlay",
            opacity: 0.3
          }}
        />
      ) : (
        <div 
          className="absolute inset-0 pointer-events-none z-[1999] grid-effect" 
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 40px,
              rgba(255, 255, 255, 0.02) 40px,
              rgba(255, 255, 255, 0.02) 41px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              rgba(255, 255, 255, 0.02) 40px,
              rgba(255, 255, 255, 0.02) 41px
            )`,
            mixBlendMode: "overlay"
          }}
        />
      )}
      
      {/* Scanline effect with improved styling, animation and fallback */}
      {scanlineImageLoaded ? (
        <div 
          className="absolute inset-0 pointer-events-none z-[1998] scanline-effect" 
          style={{
            backgroundImage: "url('/scanline.gif')",
            backgroundSize: "cover",
            backgroundRepeat: "repeat",
            mixBlendMode: "overlay",
            opacity: 0.03
          }}
        />
      ) : (
        <div 
          className="absolute inset-0 pointer-events-none z-[1998] scanline-effect" 
          style={{
            background: `repeating-linear-gradient(
              180deg,
              transparent,
              transparent 3px,
              rgba(255, 255, 255, 0.015) 3px,
              rgba(255, 255, 255, 0.015) 4px
            )`,
            mixBlendMode: "overlay"
          }}
        />
      )}
      
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-[399] bg-gradient-to-b from-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[399] bg-gradient-to-t from-black/40 to-transparent" />
      <div className="absolute top-0 bottom-0 left-0 w-32 pointer-events-none z-[399] bg-gradient-to-r from-black/40 to-transparent" />
      <div className="absolute top-0 bottom-0 right-0 w-32 pointer-events-none z-[399] bg-gradient-to-l from-black/40 to-transparent" />
    </>
  )
}

function LoadingScreen() {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-black via-black/90 to-black/80 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse flex items-center justify-center relative">
          <Globe className="h-8 w-8 text-white animate-spin-slow" />
        </div>
      </div>
    </div>
  )
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="p-6 bg-gray-800 rounded-lg border border-red-500/50 shadow-lg shadow-red-500/20 max-w-md">
        <h2 className="text-xl font-bold text-red-500 mb-2">Error Loading Map</h2>
        <p className="text-gray-300">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

// This function converts our internal Activity type to BaseActivity
// for components that require the original type
const convertToBaseActivity = (activity: Activity): BaseActivity => {
  let photos: string[] = [];
  
  // Handle the photos field safely
  if (activity.photos) {
    // If it's already a string and looks like a URL, use it directly
    if (typeof activity.photos === 'string') {
      if (activity.photos.startsWith('http://') || activity.photos.startsWith('https://')) {
        // It's a single URL, wrap it in an array
        photos = [activity.photos];
      } else {
        // Only try to parse if it doesn't look like a URL
        try {
          const photoUrls = JSON.parse(activity.photos);
          if (Array.isArray(photoUrls)) {
            photos = photoUrls;
          } else if (typeof photoUrls === 'string') {
            photos = [photoUrls];
          }
        } catch (e) {
          // If parsing fails, treat as a single string
          photos = [activity.photos];
          console.error("Not a URL or valid JSON, using as plain string:", activity.photos);
        }
      }
    }
  }
  
  return {
    id: activity.id,
    lat: activity.lat,
    lng: activity.lng,
    country: activity.country,
    adress: activity.adress,
    type: activity.type,
    title: activity.title,
    responsible: activity.responsible,
    description: activity.description,
    photos
  };
};

// Update the MapPaneCreator function to not use hooks - around line 1161
function mapPaneCreator(map: L.Map) {
    if (!map) return;
    
    // Create custom panes
    // Super high z-index pane for markers
    if (!map.getPane('superMarkerPane')) {
      try {
        map.createPane('superMarkerPane');
        const pane = map.getPane('superMarkerPane');
        if (pane) {
          pane.style.zIndex = '9999999';
          pane.style.pointerEvents = 'auto';
        }
      } catch (e) {
        console.error("Error creating superMarkerPane:", e);
      }
    }
    
    // Create a pane just for labels
    if (!map.getPane('labelsPane')) {
      try {
        map.createPane('labelsPane');
        const pane = map.getPane('labelsPane');
        if (pane) {
          pane.style.zIndex = '800';
          pane.style.pointerEvents = 'none';
          pane.className += ' leaflet-labels-pane';
        }
      } catch (e) {
        console.error("Error creating labelsPane:", e);
      }
    }
}

// Completely rewrite the safeTileLayer function to be more robust
function safeTileLayer(options: { 
  url: string, 
  attribution: string,
  map: L.Map,
  pane?: string,
  className?: string,
  opacity?: number,
}) {
  const { url, attribution, map, pane, className, opacity } = options;
  
  // Early validation
  if (!map || !L) {
    console.error('Map or Leaflet not properly initialized for tile layer');
  return null;
  }
  
  // Create tile layer with error handling
  try {
    console.log('Creating tile layer with URL:', url);
    
    // Since we've guarded against L being null, we can now safely use it
    const leafletLib = L;
    
    // Create the tile layer WITHOUT adding it yet
    const tileLayer = leafletLib.tileLayer(url, {
      attribution, 
      pane,
      className,
      opacity: opacity || 1.0,
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      crossOrigin: true
    });
    
    // Instead of trying to add it immediately, return it for later use
    // and let the caller decide when to add it
    return tileLayer;
  } catch (e) {
    console.error('Error creating tile layer:', e);
    return null;
  }
}

// MapReady component to ensure children are only rendered after map is fully initialized
function MapReady({ children, map }: { children: React.ReactNode, map: L.Map }) {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (!map) return;
    
    const handleMapReady = () => {
      console.log("Map is ready");
      setReady(true);
    };
    
    map.whenReady(handleMapReady);
    
    return () => {
      // No cleanup needed for whenReady
    };
  }, [map]);
  
  if (!ready) {
    return null;
  }
  
  return <>{children}</>;
}

// DelayedMapContent component ensures DOM is fully ready before rendering layers
function DelayedMapContent({ children, map }: { children: React.ReactNode, map: L.Map }) {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (!map) return;
    
    const timer = setTimeout(() => {
      console.log("Delayed content is ready");
      setReady(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  if (!ready) {
    return null;
  }
  
  return <>{children}</>;
}

// Simple ErrorBoundary component
class ErrorBoundary extends React.Component<{ 
  children: React.ReactNode, 
  onError?: () => void 
}, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode, onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error("Error in component:", error, info);
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// Update the MapInitializer function to not use hooks
function mapInitializer(map: L.Map) {
    if (!map) return;

  // Initialize map panes
      if (!map.getPane('labelsPane')) {
        try {
          map.createPane('labelsPane');
          const pane = map.getPane('labelsPane');
          if (pane) {
            pane.style.zIndex = '800';
            pane.style.pointerEvents = 'none';
          }
        } catch (e) {
          console.error("Error creating labelsPane:", e);
        }
      }
}

// Helper function to spread overlapping markers
function spreadOverlappingMarkers(activities: Activity[]): Activity[] {
  // Create a map to group activities by coordinates
  const locationGroups: { [key: string]: Activity[] } = {};
  
  // Group activities by their coordinates
  activities.forEach(activity => {
    const locationKey = `${activity.lat.toFixed(6)},${activity.lng.toFixed(6)}`;
    if (!locationGroups[locationKey]) {
      locationGroups[locationKey] = [];
    }
    locationGroups[locationKey].push(activity);
  });
  
  // Process groups that have more than one activity at the same coordinates
  const adjustedActivities = activities.map(activity => {
    const locationKey = `${activity.lat.toFixed(6)},${activity.lng.toFixed(6)}`;
    const group = locationGroups[locationKey];
    
    // If this is a group with overlapping markers
    if (group && group.length > 1) {
      // Find this activity's index in the group
      const activityIndex = group.findIndex(a => a.id === activity.id);
      
      // Only adjust position if we found the activity
      if (activityIndex >= 0) {
        // Offset distance for spreading markers
        const offsetDistance = 0.001;
        
        // Calculate angle for this marker in the circle
        const angle = (2 * Math.PI * activityIndex) / group.length;
        
        // Calculate new position
        const newActivity = { ...activity };
        newActivity.lat = activity.lat + offsetDistance * Math.sin(angle);
        newActivity.lng = activity.lng + offsetDistance * Math.cos(angle);
        
        // Store original coordinates for proper popup positioning
        newActivity.originalLat = activity.lat;
        newActivity.originalLng = activity.lng;
        
        return newActivity;
      }
    }
    
    // If no adjustment is needed, return the original activity
    return activity;
  });
  
  return adjustedActivities;
}

// Replace the StaticMap function with an updated version that properly handles the watercolor maps
function StaticMap({ activities, stadiaApiKey }: { activities?: Activity[], stadiaApiKey?: string | null }) {
  const { resolvedTheme } = useTheme();
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [processedActivities, setProcessedActivities] = useState<Activity[]>([]);
  const { isLeafletLoaded, error } = useLeaflet();
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const tileLayersRef = useRef<L.TileLayer[]>([]);
  
  // Process activities on mount
  useEffect(() => {
    if (!activities || activities.length === 0) return;
    
    console.log(`Processing ${activities.length} activities for markers`, activities);
    
    // Process activities (spread overlapping markers, etc.)
    try {
      const spreadActivities = spreadOverlappingMarkers(activities);
      setProcessedActivities(spreadActivities);
    } catch (e) {
      console.error("Error processing activities:", e);
      setProcessedActivities(activities || []);
    }
  }, [activities]);
  
  // Helper to add timers with automatic cleanup
  const addTimer = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);
  
  // Initialize map - completely rewritten with better error handling
  useEffect(() => {
    // Check if we have what we need to create the map
    if (!isLeafletLoaded || !mapContainerRef.current || !L) return;
    
    // Safety guard to avoid duplicate initialization
    if (mapInstanceRef.current) return;
    
    // Track mounted state for cleanup
    let isMounted = true;
    
    // Use a multi-phase initialization approach
    const initPhase1 = () => {
      try {
        console.log("Initializing map instance - Phase 1");
        
        // Verify container is still valid
        if (!mapContainerRef.current || !document.body.contains(mapContainerRef.current)) {
          console.error("Map container not in DOM during initialization");
          return;
        }
        
        // Check if L is available
        if (!L) {
          console.error("Leaflet library not available");
          return;
        }
        
        // Now TypeScript knows L is not null
        const leaflet = L;
        
        // Use a try-catch for the map creation - this can fail if the element isn't ready
        try {
          // Create map instance with minimal options first
          const mapInstance = leaflet.map(mapContainerRef.current, {
        attributionControl: true,
            zoomControl: false
          });
          
          // Store map instance in ref for later use
      mapInstanceRef.current = mapInstance;
      
          // Move to phase 2 after a short delay
          addTimer(initPhase2, 100);
        } catch (e) {
          console.error("Error creating map instance:", e);
          // Try again after a longer delay
          if (isMounted) {
            addTimer(initPhase1, 500);
          }
        }
      } catch (e) {
        console.error("Error in map init phase 1:", e);
      }
    };
    
    const initPhase2 = () => {
      try {
        console.log("Initializing map instance - Phase 2");
        
        // Check if we have a valid map instance
        if (!mapInstanceRef.current) {
          console.error("Map instance lost during initialization phase 2");
          return;
        }
        
        // Verify map container is in the DOM
        try {
          // Use proper getContainer method with fallback
          let container = null;
          try {
            container = mapInstanceRef.current.getContainer();
          } catch (e) {
            console.error("Error accessing map container:", e);
            return;
          }
          
          if (!container || !document.body.contains(container)) {
            console.error("Map container not in DOM during phase 2");
            return;
          }
          
          // Configure map options in a separate step
          mapInstanceRef.current.setMinZoom(2);
          mapInstanceRef.current.setMaxZoom(5);
          mapInstanceRef.current.setView([0, 0], isMobile ? 1.8 : 2.5, { animate: false });
          
          // Signal map is ready and move to final phase
          setMapReady(true);
          addTimer(initPhase3, 300);
          
        } catch (e) {
          console.error("Error configuring map in phase 2:", e);
        }
      } catch (e) {
        console.error("Error in map init phase 2:", e);
      }
    };
    
    const initPhase3 = () => {
      try {
        console.log("Initializing map instance - Phase 3");
        
        // Final setup for the map
          if (!mapInstanceRef.current) return;
          
        try {
          // Use proper getContainer method with fallback
          let container = null;
          try {
            container = mapInstanceRef.current.getContainer();
          } catch (e) {
            console.error("Error accessing map container:", e);
            return;
          }
          
          if (!container || !document.body.contains(container)) {
            console.error("Map container not in DOM during phase 3");
            return;
          }
          
          // Apply more options and configuration
          mapInstanceRef.current.options.worldCopyJump = true;
          mapInstanceRef.current.options.maxBoundsViscosity = 1.0;
          mapInstanceRef.current.options.zoomSnap = 0.5;
          mapInstanceRef.current.options.zoomDelta = 0.5;
          mapInstanceRef.current.options.wheelDebounceTime = 100;
          mapInstanceRef.current.options.tapTolerance = 30;
          mapInstanceRef.current.options.bounceAtZoomLimits = false;
          
          // Ensure minimum size is set
          mapInstanceRef.current.invalidateSize({ animate: false });
        } catch (e) {
          console.error("Error in final map configuration:", e);
        }
      } catch (e) {
        console.error("Error in map init phase 3:", e);
      }
    };
    
    // Start the initialization process
    initPhase1();
    
    // Return a cleanup function
    return () => {
      isMounted = false;
      console.log("Cleaning up map instance");
      
      // Clear all timers
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
      
      // Remove all tile layers first
      if (tileLayersRef.current.length > 0) {
        tileLayersRef.current.forEach(layer => {
          try {
            if (mapInstanceRef.current && layer) {
              mapInstanceRef.current.removeLayer(layer);
            }
          } catch (e) {
            console.error("Error removing tile layer:", e);
          }
        });
        tileLayersRef.current = [];
      }
      
      // Then remove the map with extra precautions
      if (mapInstanceRef.current) {
        try {
          // Store a reference to the container before we try to remove the map
          let container = null;
          try {
            container = mapInstanceRef.current.getContainer();
          } catch (e) {
            console.error("Error accessing map container during cleanup:", e);
          }
          
          // Remove all event listeners first
          try {
            mapInstanceRef.current.off();
          } catch (e) {
            console.error("Error removing map event listeners:", e);
          }
          
          // Try to remove the map with explicit error handling
          try {
            if (container && document.body.contains(container)) {
              mapInstanceRef.current.remove();
            }
          } catch (e) {
            console.error("Error removing map:", e);
            
            // Fallback cleanup if .remove() fails
            try {
              if (container && document.body.contains(container)) {
                container.remove();
              }
            } catch (e2) {
              console.error("Error removing map container:", e2);
            }
          }
          
          // Clear the ref
          mapInstanceRef.current = null;
        } catch (e) {
          console.error("Error during map cleanup:", e);
        }
      }
    };
  }, [isLeafletLoaded, isMobile, addTimer]);
  
  // Create a separate useEffect for adding layers that only runs when mapReady is true
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !isLeafletLoaded || !L) return;
    
    let isMounted = true;
    console.log("Map is ready, adding layers now");
    
    // Verify map has a valid container before proceeding
    try {
      const container = mapInstanceRef.current.getContainer();
      if (!container || !document.body.contains(container)) {
        console.error("Map container missing before layer addition");
        return;
      }
    } catch (e) {
      console.error("Error validating container before adding layers:", e);
      return;
    }
    
    // Create the tile layers first without adding them
    console.log("Creating tile layers");
    
    // Wait a bit to ensure map is fully rendered before creating layers
    addTimer(() => {
      if (!isMounted || !mapInstanceRef.current) return;
      
      // Extra guard against L being null
      if (!L) {
        console.error("Leaflet library not available when creating layers");
        return;
      }
      
      // Now we know L is not null for TypeScript
      const leaflet = L;
      
      try {
        // Create watercolor base layer
        try {
          // Using direct L.tileLayer instead of safeTileLayer
          const watercolorLayer = leaflet.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg', {
            attribution: 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.',
            opacity: 0.7,
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
          });
          
          // Fallback layer - usaremos se o primeiro falhar
          const fallbackLayer = leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            opacity: 0.2
          });
          
          // Adicionar listener para erro e tentar o fallback
          watercolorLayer.on('tileerror', () => {
            console.warn("Watercolor tiles falhou, usando fallback");
            if (mapInstanceRef.current) {
              fallbackLayer.addTo(mapInstanceRef.current);
            }
          });
          
          if (watercolorLayer) {
            tileLayersRef.current.push(watercolorLayer);
          }
          
          // Também guardar o fallback
          tileLayersRef.current.push(fallbackLayer);
        } catch (e) {
          console.error("Error creating watercolor layer:", e);
        }
        

        // Add a clearer labels layer with better visibility on watercolor backgrounds
        try {
          // Use a clearer labels layer with better visibility on watercolor backgrounds
          const labelsLayer = leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            pane: 'labelsPane',
            opacity: 1.0,
            className: 'enhanced-labels'
          });

          if (labelsLayer) {
            tileLayersRef.current.push(labelsLayer);
          }
        } catch (e) {
          console.error("Error creating labels layer:", e);
        }

        // Add the layers after another delay
        addTimer(() => {
          if (!isMounted || !mapInstanceRef.current) return;
          
          // Recheck container validity
          try {
            // Use the getContainer method for type safety
            const container = mapInstanceRef.current.getContainer();
            if (!container || !document.body.contains(container)) {
              console.error("Map container missing before adding layers");
              return;
            }
            
            // Try to add the first layer with extra safety
            if (tileLayersRef.current.length > 0 && tileLayersRef.current[0]) {
              try {
                console.log("Adding watercolor layer to map");
                
                // Adicionar um evento para verificar se os tiles estão carregando
                tileLayersRef.current[0].on('tileerror', (error) => {
                  console.error("Erro ao carregar tile do watercolor:", error);
                });
                
                tileLayersRef.current[0].on('tileload', (tile) => {
                  console.log("Tile do watercolor carregado com sucesso", tile);
                });
                
                tileLayersRef.current[0].addTo(mapInstanceRef.current);
              } catch (e) {
                console.error("Error adding watercolor layer:", e);
              }
            }
            
            // Try to add the second layer after a delay
            addTimer(() => {
              if (!isMounted || !mapInstanceRef.current) return;
              
              try {
                // Use the getContainer method for type safety
                const container = mapInstanceRef.current.getContainer();
                if (!container || !document.body.contains(container)) {
                  return;
                }
                
                if (tileLayersRef.current.length > 1 && tileLayersRef.current[1]) {
                  console.log("Adding primary labels layer to map");
                  tileLayersRef.current[1].addTo(mapInstanceRef.current);
                }
                
                // Signal that layers are ready
                addTimer(() => {
                  if (isMounted) {
                    setLayersReady(true);
                  }
                }, 500);
              } catch (e) {
                console.error("Error adding OSM layer:", e);
              }
            }, 700);
          } catch (e) {
            console.error("Error in layer addition sequence:", e);
          }
        }, 500);
      } catch (e) {
        console.error("Error creating layers:", e);
      }
    }, 300);
    
    return () => {
      isMounted = false;
    };
  }, [mapReady, isLeafletLoaded, addTimer]);
  
  // Add markers after layers are ready
  useEffect(() => {
    if (!layersReady || !mapInstanceRef.current || !isLeafletLoaded || !L) return;
    
    let isMounted = true;
    console.log("Layers are ready, adding markers now");
    
    // Add markers to the map with delay
    addTimer(() => {
      if (!isMounted || !mapInstanceRef.current) return;
      
      // Check if container is valid
      try {
        if (!mapInstanceRef.current.getContainer || 
            typeof mapInstanceRef.current.getContainer !== 'function') {
          console.error('Map container function not available, cannot add markers');
          return;
        }
        
        const container = mapInstanceRef.current.getContainer();
        if (!container || !document.body.contains(container)) {
          console.error('Map container not in DOM, cannot add markers');
          return;
        }
        
        console.log(`Adding ${processedActivities.length} activities as nodes to map context`);
        
        // Force a map update to ensure it's ready for markers
        mapInstanceRef.current.invalidateSize({ animate: false });
    } catch (error) {
        console.error("Error adding markers:", error);
      }
    }, 700); // Longer delay for markers after layers
    
    return () => {
      isMounted = false;
    };
  }, [layersReady, isLeafletLoaded, processedActivities, addTimer]);
  
  return (
    <div className="w-full h-full relative">
      {/* Map container div */}
      <div className="w-full h-full z-10">
        <div 
          ref={mapContainerRef}
          id="eco-track-map" 
          className="w-full h-full eco-track-map-container"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </div>
      
      {/* Dark background for map boundaries */}
      <div 
        className="absolute top-0 left-0 w-full h-full"
        style={{
          backgroundColor: '#0a2342',
          zIndex: -1,
          backgroundImage: 'radial-gradient(circle at center, rgba(30, 100, 170, 0.3) 0%, rgba(10, 35, 66, 0.1) 50%, rgba(10, 35, 66, 0) 100%)',
        }}
      />
      
      {/* Provide map and processedActivities through context */}
      <MapContext.Provider value={{ map: mapInstanceRef.current, processedActivities }}>
        {/* Map overlays with fixed z-index - pass map instance directly */}
        {mapInstanceRef.current && layersReady && <MapOverlays map={mapInstanceRef.current} />}
        
        {/* Add markers once the layers are ready */}
        {mapInstanceRef.current && layersReady && processedActivities.map(activity => (
          <ActivityNode 
            key={activity.id} 
            activity={activity} 
            map={mapInstanceRef.current} 
          />
        ))}
        
        {/* MapEffects for styles */}
        {mapInstanceRef.current && layersReady && <MapEffects />}
      </MapContext.Provider>
      
      {/* Loading spinner while map is initializing */}
      {!layersReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
          <LoadingScreen />
        </div>
      )}
      
      {/* Error message if map failed to load */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
          <ErrorScreen error={error} />
        </div>
      )}
    </div>
  );
}

// Export the MapClient component
export default function MapClient({ activities: propActivities, initialSelectedActivity, stadiaApiKey }: MapClientProps) {
  // The useLeaflet hook ensures Leaflet is loaded before rendering the map
  const { isLeafletLoaded, error } = useLeaflet();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Handle activities data
  useEffect(() => {
    if (propActivities && propActivities.length > 0) {
      setActivities(propActivities);
    } else {
      // If no activities provided, use empty array
      setActivities([]);
    }
    setIsLoading(false);
  }, [propActivities]);

  // Ensure component only renders on client side
  if (typeof window === 'undefined') {
    return <div className="w-full h-full bg-black" />;
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <ErrorScreen error={error} />
      </div>
    );
  }

  if (!isLeafletLoaded || isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <LoadingScreen />
      </div>
    );
  }

  // Return the map component
  return (
    <ErrorBoundary>
      <div className="w-full h-full relative">
        <StaticMap 
          activities={activities} 
          stadiaApiKey={stadiaApiKey} 
        />
      </div>
    </ErrorBoundary>
  );
}

