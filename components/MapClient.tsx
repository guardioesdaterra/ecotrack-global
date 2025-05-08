"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo, createContext, useContext, forwardRef } from "react"
import "leaflet/dist/leaflet.css"
import { useTheme } from "next-themes"
import dynamic from "next/dynamic"
import { Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ParticleEffect } from "@/components/particle-effect"
import { useMediaQuery } from "@/hooks/use-media-query"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Zap, Leaf, Droplets, BookOpen, Shield, Wind } from "lucide-react"
import { ConnectionLines as ConnectionLinesComponent } from "./connection-lines"
import { getActivityColor } from "@/components/map-component"
import { getSupabaseBrowserClient } from "@/lib/supabaseClient"
import { useEffects } from "@/lib/effects"
import { AnimationInstance } from "@/types/animations"
import { Activity as ActivityType } from "@/components/map-component"
import { convertToMapActivity } from "@/lib/utils"
import { useOverlay } from "@/contexts/overlay-context"

// Import Leaflet CSS
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"

// Import types directly
import type { Activity as BaseActivity } from "@/components/map-component"
import type * as LeafletNamespace from 'leaflet'

// Dynamically import React-Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

// Import the Marker component with forwardRef properly set up
const Marker = dynamic(
  () => import('react-leaflet').then(mod => {
    // Return the actual Marker component which already uses forwardRef internally
    return mod.Marker;
  }),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

const ZoomControl = dynamic(
  () => import('react-leaflet').then((mod) => mod.ZoomControl),
  { ssr: false }
)

// Import useMap directly instead of dynamically
// useMap is a hook and can't be dynamically imported like a component
import { useMap } from 'react-leaflet'

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

// Set up a hook to load Leaflet properly on the client side
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
                className="absolute inset-0 pointer-events-none opacity-20" 
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
    <style jsx global>{`
      /* Base map styling */
      .leaflet-container {
        background-color: #061825;
        z-index: 10; /* Lower than overlay z-index */
      }
      
      /* Custom popup styling */
      .leaflet-popup-content-wrapper {
        background: rgba(10, 25, 41, 0.85);
        color: white;
        border-radius: 8px;
        backdrop-filter: blur(12px);
        border: 1px solid rgba(6, 182, 212, 0.2);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1), 0 0 20px rgba(6, 182, 212, 0.1);
      }
      
      .leaflet-popup-tip {
        background: rgba(6, 182, 212, 0.8);
        backdrop-filter: blur(12px);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1), 0 0 20px rgba(6, 182, 212, 0.1);
      }
      
      .leaflet-popup-close-button {
        color: #0891b2 !important; /* Cyan color to match theme */
      }
      
      /* Make sure markers remain clickable */
      .super-high-z-marker {
        z-index: 40 !important;
      }
      
      /* Ensure overlay has higher z-index than map */
      .activity-overlay {
        z-index: 50;
      }

      /* Pulse animation for markers */
      @keyframes marker-pulse-opacity {
        0% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0.7;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.2);
          opacity: 0.3;
        }
        100% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0.7;
        }
      }
      
      @keyframes float-particle {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        25% { transform: translateY(-10px) rotate(5deg); }
        50% { transform: translateY(10px) rotate(-5deg); }
        75% { transform: translateY(-5px) rotate(2deg); }
      }
      
      @keyframes float-particle-alt {
        0%, 100% { transform: translateX(0) rotate(0deg); }
        25% { transform: translateX(-10px) rotate(-5deg); }
        50% { transform: translateX(10px) rotate(5deg); }
        75% { transform: translateX(-5px) rotate(-2deg); }
      }
      
      @keyframes particle-pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.8; }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      
      @keyframes scanline {
        0% { top: -10%; }
        100% { top: 110%; }
      }
    `}</style>
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
    map.options.minZoom = 1.5;
    map.options.maxZoom = 7;

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

// Create MapContext for passing the map instance
const MapContext = createContext<L.Map | null>(null);

// Custom Marker component using React-Leaflet
const CustomMarker = forwardRef(function CustomMarker({ activity }: { activity: Activity }, ref) {
  const { resolvedTheme } = useTheme();
  const color = getActivityColor(activity.type);
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const markerRef = useRef<any>(null);
  // Add overlay context hook
  const { showOverlay } = useOverlay();
  
  // Combine refs - external ref and local ref
  const setRef = useCallback(
    (node: any) => {
      // Save a reference to the node locally
      markerRef.current = node;
      
      // Call the original ref if it exists
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );
  
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
  
  useEffect(() => {
    // Only run on client side and when the marker reference and L are available
    if (typeof window === 'undefined' || !markerRef.current || !L) return;
    
    // Create a custom icon for the marker
    const icon = L.divIcon({
      html: `
        <div class="activity-marker-container" style="
          position: relative;
          width: 50px; 
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          cursor: pointer;
          z-index: 99999 !important;
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
          z-index: 99999 !important;
          transition: box-shadow 0.3s ease;
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
        "></div>
        </div>
      `,
      className: "super-high-z-marker",
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    });
    
    // Access the underlying Leaflet marker instance and set the icon
    const leafletMarker = markerRef.current;
    if (leafletMarker && leafletMarker.setIcon) {
      try {
        leafletMarker.setIcon(icon);
      } catch (err) {
        console.error("Error setting marker icon:", err);
      }
    }
  }, [activity, color, markerRef]);
  
  // Function to handle marker click
  const handleMarkerClick = useCallback(() => {
    console.log("Marker clicked:", activity.title);
    
    // Show the activity details overlay
    if (activity.id) {
      showOverlay("view", String(activity.id));
    } else {
      console.error("Activity ID missing - cannot show overlay");
    }
    
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
  }, [activity, images, activeImageIndex, showOverlay]);
  
  const renderPopup = () => {
    // Simplify or remove the popup since we're now using the overlay
    return null;
  };
  
  if (typeof window === 'undefined') {
    return null;
  }
  
  return (
    <>
      {/* Use React-Leaflet Marker component */}
      <Marker 
        position={[activity.lat, activity.lng]} 
        ref={setRef}
        eventHandlers={{
          click: handleMarkerClick
        }}
      >
        {renderPopup()}
      </Marker>
      
      {/* Photo Gallery Overlay */}
      <PhotoGallery 
        photos={images} 
        isOpen={showGallery} 
        onClose={() => setShowGallery(false)} 
        activityTitle={activity.title}
        activityColor={color}
      />
      
      {/* CSS specific for this marker */}
      <style jsx global>{`
        .super-high-z-marker {
          z-index: 99999 !important;
          position: absolute !important;
          pointer-events: auto !important;
        }
      `}</style>
    </>
  );
});

function MapOverlays({ map }: { map: L.Map }) {
  const [gridImageLoaded, setGridImageLoaded] = useState(true);
  const [scanlineImageLoaded, setScanlineImageLoaded] = useState(true);
  const [particlesActive, setParticlesActive] = useState(true);
  
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
  
  return (
    <>
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
            opacity: 0.5
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

// Component to ensure Leaflet is loaded before rendering children
function LeafletLoader({ children }: { children: React.ReactNode }) {
  const { isLeafletLoaded, error } = useLeaflet();
  
  if (error) {
    return <ErrorScreen error={error} />;
  }
  
  if (!isLeafletLoaded) {
    return <LoadingScreen />;
  }
  
  return <>{children}</>;
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

// Map component using React-Leaflet
function MapWrapper({ activities, stadiaApiKey }: { 
  activities: Activity[],
  stadiaApiKey?: string | null 
}) {
  const { resolvedTheme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const mapRef = useRef<any>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Create panes when map is ready
  const MapInitializer = () => {
    // Since we're importing useMap directly, we can use it directly in this component
    // that's rendered inside MapContainer
    try {
      const map = useMap();
      
      // Set up map on first render
      useEffect(() => {
        if (!map) return;
        
        // Create custom panes
        if (!map.getPane('superMarkerPane')) {
          map.createPane('superMarkerPane');
          const pane = map.getPane('superMarkerPane');
          if (pane) {
            pane.style.zIndex = '9000';
            pane.style.pointerEvents = 'auto';
          }
        }
        
        // Create a pane just for labels
        if (!map.getPane('labelsPane')) {
          map.createPane('labelsPane');
          const pane = map.getPane('labelsPane');
          if (pane) {
            pane.style.zIndex = '800';
            pane.style.pointerEvents = 'none';
            pane.className += ' leaflet-labels-pane';
          }
        }
        
        // Store map reference
        mapRef.current = map;
        setInitialized(true);
      }, [map]);
      
      return null;
    } catch (e) {
      // This should only happen during SSR, which we're preventing with dynamic imports
      console.error("Error in MapInitializer:", e);
      return null;
    }
  };
  
  // Process activities to spread overlapping markers
  const processedActivities = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    
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
  }, [activities]);
  
  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[0, 0]}
        zoom={isMobile ? 1.8 : 2.5}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        minZoom={1.5}
        maxZoom={7}
        worldCopyJump={true}
        maxBoundsViscosity={1.0}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelDebounceTime={100}
        tapTolerance={30}
        bounceAtZoomLimits={false}
        className="w-full h-full"
      >
        <MapInitializer />
        
        {/* Base OpenStreetMap layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          opacity={0.9}
        />
        
        {/* Labels layer */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
          subdomains="abcd"
          maxZoom={20}
          pane="labelsPane"
          className="enhanced-labels"
        />
        
        {/* Activity markers */}
        {initialized && processedActivities.map(activity => (
          <CustomMarker key={activity.id} activity={activity} />
        ))}
        
        {/* Add ZoomControl to the map */}
        <ZoomControl position="bottomright" />
      </MapContainer>
      
      {/* Map overlays */}
      <div className="absolute inset-0 pointer-events-none z-[1999] grid-effect" 
        style={{
          backgroundImage: "url('/grid-overlay.png')",
          backgroundSize: "cover",
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
          opacity: 0.5
        }}
      />
      
      <div className="absolute inset-0 pointer-events-none z-[1998] scanline-effect" 
        style={{
          backgroundImage: "url('/scanline.gif')",
          backgroundSize: "cover",
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
          opacity: 0.03
        }}
      />
      
      {/* Edge gradients */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-[399] bg-gradient-to-b from-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[399] bg-gradient-to-t from-black/40 to-transparent" />
      <div className="absolute top-0 bottom-0 left-0 w-32 pointer-events-none z-[399] bg-gradient-to-r from-black/40 to-transparent" />
      <div className="absolute top-0 bottom-0 right-0 w-32 pointer-events-none z-[399] bg-gradient-to-l from-black/40 to-transparent" />
      
      {/* Map styles */}
      <MapEffects />
    </div>
  );
}

// Export the MapClient component with proper SSR handling
function MapClientBase({ activities, initialSelectedActivity, stadiaApiKey }: MapClientProps) {
  const { isLeafletLoaded, error } = useLeaflet();
  const [processedActivities, setProcessedActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Add overlay context
  const { showOverlay } = useOverlay();

  // Handle activities data
  useEffect(() => {
    if (activities && activities.length > 0) {
      setProcessedActivities(activities);
    } else {
      // If no activities provided, use empty array
      setProcessedActivities([]);
    }
    setIsLoading(false);
  }, [activities]);

  // Handle initialSelectedActivity
  useEffect(() => {
    if (initialSelectedActivity && !isLoading) {
      // Show the overlay for the initially selected activity on mount
      showOverlay("view", initialSelectedActivity);
    }
  }, [initialSelectedActivity, showOverlay, isLoading]);

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (!isLeafletLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="w-full h-full relative">
      <ClientOnlyMap
        activities={processedActivities} 
        stadiaApiKey={stadiaApiKey} 
      />
    </div>
  );
}

// This component only renders on the client-side
const ClientOnlyMap = dynamic(
  () => Promise.resolve(MapWrapper),
  {
    ssr: false,
    loading: LoadingScreen
  }
);

// Use dynamic import with ssr: false for the main component
export default dynamic(
  () => Promise.resolve(MapClientBase),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <LoadingScreen />
      </div>
    )
  }
);

