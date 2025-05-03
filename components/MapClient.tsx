"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { MapContainer, TileLayer, useMap, ZoomControl, Marker, Popup } from "react-leaflet"
import { Badge } from "@/components/ui/badge"
import { ParticleEffect } from "@/components/particle-effect"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Zap, Leaf, Droplets, BookOpen, Shield, Globe, Wind } from "lucide-react"
import { ConnectionLines } from "./connection-lines"
import { getActivityColor } from "@/components/map-component"
import { supabase } from "@/lib/supabaseClient"
import { useEffects } from "@/lib/effects"

// Import Leaflet dynamically to avoid SSR issues
import type * as LeafletNamespace from 'leaflet';
// Import a specific version of Leaflet CSS to ensure compatibility
import "leaflet/dist/leaflet.css"

// Define our local Activity interface for this component
import type { Activity as BaseActivity } from "@/components/map-component";

let L: typeof LeafletNamespace | null = null;

// Set up a flag to track if Leaflet is loaded
const useLeaflet = () => {
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [error, setError] = useState<string|null>(null);
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    async function loadLeaflet() {
      try {
        if (L) {
          setIsLeafletLoaded(true)
          return
        }
        
        // Import Leaflet library
        const leaflet = await import('leaflet')
        L = leaflet
        
        // Configure default markers
        if (L && L.Icon && L.Icon.Default) {
          delete (L.Icon.Default.prototype as any)._getIconUrl
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          })
        }
        
        setIsLeafletLoaded(true)
      } catch (err) {
        console.error("Failed to load Leaflet:", err)
        // Set error safely
        setError && setError("Failed to load map resources. Please check your connection and try again.")
      }
    }
    
    loadLeaflet()
  }, [])
  
  return isLeafletLoaded;
};

interface Activity {
  id: number
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
  direct_benefited?: number
  indirect_benefited?: number
}

interface MapClientProps {
  activities: Activity[]
  initialSelectedActivity?: number | null
}

// Add description to the FlyToEvent interface if missing from Activity
interface FlyToEvent {
  id: number | string
  lat: number
  lng: number
  zoom: number
  color: string
}

// Define SearchFilters interface if needed
interface SearchFilters {
  query: string
  types: string[]
  expanded: boolean
}

// Define global window interface for image navigation functions
declare global {
  interface Window {
    prevActivityImage: (id: number) => void;
    nextActivityImage: (id: number) => void;
    showGallery_: {[key: number]: () => void};
  }
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
                className="absolute inset-0 pointer-events-none opacity-30" 
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
                  <polyline points="9 18 15 12 9 6"></polyline>
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

// New FlyToAnimation component
function FlyToAnimation({ event }: { event: FlyToEvent | null }) {
  const map = useMap();
  const { shouldReduceAnimations } = useEffects();
  
  useEffect(() => {
    if (!event) return;
    
    // Fly to location with different settings based on performance mode
    map.flyTo(
      [event.lat, event.lng],
      event.zoom,
      {
        duration: shouldReduceAnimations ? 1.5 : 0.8,
        easeLinearity: shouldReduceAnimations ? 0.5 : 0.25
      }
    );
    
    // Show ripple effect unless in reduced mode
    if (!shouldReduceAnimations) {
      const point = map.latLngToContainerPoint([event.lat, event.lng]);
      
      // Create ripple element
      const ripple = document.createElement('div');
      ripple.className = 'map-focus-indicator marker-pulse';
      ripple.style.cssText = `
        position: absolute;
        left: ${point.x}px;
        top: ${point.y}px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: transparent;
        border: 2px solid ${event.color};
        transform: translate(-50%, -50%) scale(0);
        opacity: 0.8;
        z-index: 1000;
        pointer-events: none;
        animation: markerPulse 1.5s cubic-bezier(0, 0.6, 0.4, 1) forwards;
        box-shadow: 0 0 15px ${event.color}60, 0 0 30px ${event.color}30;
      `;
      
      // Add to map and remove after animation
      map.getContainer().appendChild(ripple);
      setTimeout(() => {
        map.getContainer().removeChild(ripple);
      }, 1500);
    }
  }, [event, map, shouldReduceAnimations]);
  
  return null;
}

// Provide a way to trigger flyTo animations
const useFlyToStore = () => {
  const [event, setEvent] = useState<FlyToEvent | null>(null);
  
  const flyTo = useCallback((newEvent: FlyToEvent) => {
    setEvent(prev => {
      // Only update if different location
      if (prev?.id !== newEvent.id) {
        return newEvent;
      }
      return prev;
    });
  }, []);
  
  return { event, flyTo };
};

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
        
        .map-focus-indicator {
          animation: focusPulse 2s infinite;
        }
        
        @keyframes focusPulse {
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
      `}</style>
    </div>
  );
}

// MapController with access to flyTo events
function MapController() {
  const { event } = useFlyToStore();
  const map = useMap();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { resolvedTheme } = useTheme();

  // Initialize the map with proper styling and configuration
  useEffect(() => {
    const container = map.getContainer();
    
    if (resolvedTheme === 'dark') {
      container.classList.add("dark-map");
      container.classList.remove("light-map");
    } else {
      container.classList.add("light-map");
      container.classList.remove("dark-map");
    }

    // Configure the map background to avoid white background
    document.documentElement.style.setProperty('--map-background', '#121212');
    container.style.backgroundColor = '#121212';
    
    // Set boundaries to prevent dragging beyond limits
    if (L) {
      const southWest = L!.latLng(-90, -200);
      const northEast = L!.latLng(90, 200);
      const bounds = L!.latLngBounds(southWest, northEast);
    
    // Apply limits with a margin to avoid visual issues
    map.setMaxBounds(bounds);
    map.options.maxBoundsViscosity = 1.0; // Force map to stay within boundaries
    }
    
    // Additional settings to improve experience
    map.options.zoomSnap = 1;
    map.options.zoomDelta = 1;
    map.options.wheelDebounceTime = 100;

    if (isMobile) {
      map.setView([20, 0], 1.8, { animate: true, duration: 1 });
    } else {
      map.setView([20, 0], 2.5, { animate: true, duration: 1 });
    }

    const handleResize = () => {
      if (window.innerWidth <= 768) {
        map.setView([20, 0], 1.8, { animate: true, duration: 0.5 });
      } else {
        map.setView([20, 0], 2.5, { animate: true, duration: 0.5 });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map, isMobile, resolvedTheme]);
  
  return (
    <>
      <MapEffects />
      <FlyToAnimation event={event} />
    </>
  );
}

function ActivityNode({ activity }: { activity: Activity }) {
  const { resolvedTheme } = useTheme();
  const color = getActivityColor(activity.type);
  const { flyTo } = useFlyToStore();
  const map = useMap();
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  
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
  
  // Protect against undefined window or Leaflet
  if (typeof window === 'undefined' || !L) return null;
  
  // Now we know L is defined, so we can safely use it
  const divIcon = L.divIcon({
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
          z-index: 2;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      "></div>
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
        animation: pulse 2s infinite;
      "></div>
      </div>
    `,
    className: "",
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });
  
  // Create a popup with custom styles
  const customPopup = L.popup({
    className: `activity-${activity.id}-popup`,
    closeButton: true,
    autoPan: true,
    maxWidth: 500, // Make popup wider
    minWidth: 300
  });
  
  // Apply styles for the popup
  useEffect(() => {
    const styleId = `popup-style-${activity.id}`;
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    
    styleEl.innerHTML = `
      .activity-${activity.id}-popup .leaflet-popup-content-wrapper {
        background-color: rgba(17, 17, 17, 0.8) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        color: #ffffff !important;
        border: 1px solid ${color}80 !important;
        box-shadow: 0 0 15px ${color}40, 0 0 30px ${color}20 !important;
        border-radius: 12px !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      
      .activity-${activity.id}-popup .leaflet-popup-content {
        margin: 0 !important;
        width: 100% !important;
      }
      
      .activity-${activity.id}-popup .leaflet-popup-tip {
        background-color: rgba(17, 17, 17, 0.8) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        border: 1px solid ${color}80 !important;
        box-shadow: 0 0 15px ${color}40 !important;
      }
      
      .activity-${activity.id}-popup .leaflet-popup-close-button {
        color: white !important;
        background-color: rgba(0, 0, 0, 0.6) !important;
        border-radius: 50% !important;
        width: 24px !important;
        height: 24px !important;
        font-size: 20px !important;
        line-height: 20px !important;
        text-align: center !important;
        top: 8px !important;
        right: 8px !important;
        z-index: 10 !important;
        transition: all 0.2s ease !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      .activity-${activity.id}-popup .leaflet-popup-close-button:hover {
        background-color: ${color}80 !important;
        color: white !important;
        transform: scale(1.1) !important;
      }
      
      .eco-activity-image-slider .image-nav-button {
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .eco-activity-image-slider:hover .image-nav-button {
        opacity: 1;
      }
      
      .eco-activity-pill {
        background-color: ${color}20;
        color: ${color};
        border: 1px solid ${color}40;
        border-radius: 100px;
        padding: 2px 10px;
        font-size: 0.75rem;
        display: inline-block;
        transition: all 0.3s ease;
      }
      
      .eco-activity-pill:hover {
        background-color: ${color}40;
      }
      
      @keyframes pulse {
        0% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0.6;
        }
        70% {
          transform: translate(-50%, -50%) scale(1.3);
          opacity: 0;
        }
        100% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0;
        }
      }
      
      .activity-marker-container:hover .activity-marker {
        transform: translate(-50%, -50%) scale(1.2);
        box-shadow: 0 0 25px ${color}, 0 0 40px ${color};
      }
      
      .eco-activity-image-slider {
        position: relative;
        width: 100%;
        height: 200px;
        overflow: hidden;
        border-bottom: 1px solid ${color}30;
      }
      
      .eco-activity-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: all 0.3s ease;
      }
      
      .eco-activity-image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
        z-index: 1;
      }
      
      .eco-activity-dots {
        position: absolute;
        bottom: 10px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 6px;
        z-index: 2;
      }
      
      .eco-activity-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: rgba(255,255,255,0.5);
        transition: all 0.3s ease;
      }
      
      .eco-activity-dot.active {
        background-color: white;
        transform: scale(1.2);
        box-shadow: 0 0 5px rgba(255,255,255,0.8);
      }
    `;
    
    return () => {
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [activity.id, color]);
  
  // Image navigation in slider
  const nextImage = () => {
    if (images.length > 0) {
      setActiveImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }
  };
  
  const prevImage = () => {
    if (images.length > 0) {
      setActiveImageIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    }
  };
  
  // Set up gallery trigger function
  useEffect(() => {
    if (!window.showGallery_) {
      window.showGallery_ = {};
    }
    
    window.showGallery_[activity.id] = () => {
      setShowGallery(true);
    };
    
    return () => {
      if (window.showGallery_ && window.showGallery_[activity.id]) {
        delete window.showGallery_[activity.id];
      }
    };
  }, [activity.id]);
  
  return (
    <>
      <Marker 
        position={[activity.lat, activity.lng]} 
        icon={divIcon}
        eventHandlers={{
          click: (e) => {
            console.log("Marker clicked:", activity.title);
            
            // Trigger the flyTo animation
            flyTo({
              id: activity.id,
              lat: activity.lat,
              lng: activity.lng,
              zoom: map.getZoom() < 8 ? 8 : map.getZoom() + 1,
              color: color
            });
            
            // Generate image slider HTML if we have images
            let imageSliderHtml = '';
            if (images.length > 0) {
              const currentImage = images[activeImageIndex];
              
              imageSliderHtml = `
                <div class="eco-activity-image-slider">
                  <img src="${currentImage}" class="eco-activity-image" alt="${activity.title}" />
                  <div class="eco-activity-image-overlay"></div>
                  
                  ${images.length > 1 ? `
                    <button onclick="window.prevActivityImage(${activity.id})" class="image-nav-button absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    
                    <button onclick="window.nextActivityImage(${activity.id})" class="image-nav-button absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center">
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
            
            // Define global functions for image navigation
            window.prevActivityImage = (id) => {
              if (id === activity.id) prevImage();
            };
            
            window.nextActivityImage = (id) => {
              if (id === activity.id) nextImage();
            };
            
            // Format the activity information
            let locationInfo = '';
            if (activity.adress) {
              locationInfo = activity.adress;
            } else if (activity.country) {
              locationInfo = activity.country;
              if (activity.city) locationInfo = `${activity.city}, ${locationInfo}`;
            }
            
            // Get date from time or use generic text
            const dateText = activity.created_at 
              ? new Date(activity.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short', 
                  day: 'numeric'
                })
              : 'Date not specified';

            // Create a beautiful card content
            const content = `
              <div class="activity-card w-full max-w-md overflow-hidden">
                ${imageSliderHtml}
                
                <div class="p-4">
                  <div class="flex items-start gap-3 mb-3">
                    <div style="background-color: ${color}20; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid ${color}40">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${activity.type === 'reforestation' ? 
                          '<path d="M17 14v6m-3-3h6M9 18V7c0-2 2-3 4-3s4 1 4 3v11"/>' : 
                        activity.type === 'clean-up' ? 
                          '<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>' : 
                        activity.type === 'recycling' ?
                          '<path d="M16 3l-4 4-4-4M4 8l4-4M8 21V7M4 17l4 4 4-4M20 16l-4 4-4-4M20 8l-4 4"/>' :
                        activity.type === 'conservation' ?
                          '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' :
                        activity.type === 'research' ?
                          '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>' :
                        activity.type === 'education' ?
                          '<path d="M12 9a3 3 0 100-6 3 3 0 000 6zM19 9a3 3 0 100-6 3 3 0 000 6zM5 9a3 3 0 100-6 3 3 0 000 6zM12 21a3 3 0 100-6 3 3 0 000 6zM19 21a3 3 0 100-6 3 3 0 000 6zM5 21a3 3 0 100-6 3 3 0 000 6zM6 9v3M12 9v3M18 9v3M6 18v-3M12 18v-3M18 18v-3"/>' :
                          '<path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>'
                        }
                      </svg>
                    </div>
                    
                    <div class="flex-1 min-w-0">
                      <h2 style="font-weight: 700; font-size: 1.25rem; margin-bottom: 0.25rem; color: #fff; line-height: 1.3;">
                ${activity.title}
                      </h2>
                      
                      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span class="eco-activity-pill">
                    ${activity.type}
                  </span>
                    
                        ${locationInfo ? `
                          <span style="color: rgba(156, 163, 175, 0.9); font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                      </svg>
                            ${locationInfo}
                          </span>
                        ` : ''}
                    </div>
                    </div>
                  </div>
                  
                  ${activity.description ? `
                    <div style="margin-bottom: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 0.75rem; border-left: 3px solid ${color};">
                      <p style="font-size: 0.875rem; line-height: 1.5; color: rgba(229, 231, 235, 0.9); max-height: 100px; overflow-y: auto;">
                        ${activity.description}
                      </p>
                  </div>
                ` : ''}
                
                  <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.5rem; margin-top: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      ${activity.responsible ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem; background-color: rgba(0,0,0,0.2); padding: 0.375rem 0.75rem; border-radius: 1rem;">
                          <div style="color: rgba(156, 163, 175, 0.9);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                          <span style="font-size: 0.75rem; color: rgba(229, 231, 235, 0.9);">${activity.responsible}</span>
                    </div>
                  ` : ''}
                  
                      <div style="display: flex; align-items: center; gap: 0.5rem; background-color: rgba(0,0,0,0.2); padding: 0.375rem 0.75rem; border-radius: 1rem;">
                        <div style="color: rgba(156, 163, 175, 0.9);">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                      </svg>
                        </div>
                            <span style="font-size: 0.75rem; color: rgba(229, 231, 235, 0.9);">${dateText}</span>
                      </div>
                    </div>
                    
                    <a 
                      ${images.length > 0 ? 
                        `href="#" 
                        onclick="(function(e) { e.preventDefault(); window.showGallery_[${activity.id}](); })(event);"` : 
                        `href="javascript:void(0)" 
                        style="pointer-events: none;"`} 
                      style="
                        font-size: 0.8125rem;
                        padding: 0.5rem 0.75rem;
                        border-radius: 6px;
                        background-color: ${images.length > 0 ? color : '#5a5a5a'};
                        color: ${images.length > 0 ? 'black' : '#9a9a9a'};
                        font-weight: 500;
                        text-decoration: none;
                        display: inline-flex;
                        align-items: center;
                        gap: 0.375rem;
                        transition: all 0.2s ease;
                        border: none;
                        opacity: ${images.length > 0 ? '1' : '0.7'};
                        cursor: ${images.length > 0 ? 'pointer' : 'not-allowed'};
                        box-shadow: ${images.length > 0 ? `0 4px 6px ${color}20, 0 1px 3px ${color}40` : 'none'};
                      "
                      onmouseover="${images.length > 0 ? `this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 10px ${color}30, 0 2px 4px ${color}50';` : ''}"
                      onmouseout="${images.length > 0 ? `this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px ${color}20, 0 1px 3px ${color}40';` : ''}"
                    >
                      <span>View Photos</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </a>
                  </div>
                
                  ${activity.hyperlink ? `
                    <div style="margin-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem; text-align: center;">
                      <a 
                        href="${activity.hyperlink}" 
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                          font-size: 0.75rem;
                          color: ${color};
                          text-decoration: none;
                          display: inline-flex;
                          align-items: center;
                          gap: 0.25rem;
                        "
                      >
                        <span>Visit official website</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                  </div>
                  ` : ''}
                </div>
              </div>
            `;
            
            customPopup.setLatLng([activity.lat, activity.lng]).setContent(content).openOn(map);
          }
        }}
      />
      
      {/* Photo Gallery Overlay */}
      <PhotoGallery 
        photos={images} 
        isOpen={showGallery} 
        onClose={() => setShowGallery(false)} 
        activityTitle={activity.title}
        activityColor={color}
      />
    </>
  );
}

function MapOverlays() {
  const [gridImageLoaded, setGridImageLoaded] = useState(true);
  const [scanlineImageLoaded, setScanlineImageLoaded] = useState(true);
  
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
    direct_benefited: activity.direct_benefited,
    indirect_benefited: activity.indirect_benefited,
    photos
  };
};

export default function MapClient({ activities: propActivities, initialSelectedActivity }: MapClientProps) {
  const [activities, setActivities] = useState<Activity[]>(propActivities || []);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [error, setError] = useState<string|null>(null)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    types: [],
    expanded: false
  });
  const [mapKey, setMapKey] = useState<number>(0);
  const [photoModalVisible, setPhotoModalVisible] = useState<boolean>(false);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [currentActivityTitle, setCurrentActivityTitle] = useState<string>("");
  const [currentActivityColor, setCurrentActivityColor] = useState<string>("");
  const { event: flyToEvent, flyTo } = useFlyToStore();
  const isLeafletLoaded = useLeaflet();

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // If we already have activities from props, use them
        if (propActivities && propActivities.length > 0) {
          setActivities(propActivities);
          setFilteredActivities(propActivities);
          setLoading(false);
          setInitialLoadComplete(true);
          return;
        }

        // Otherwise fetch from Supabase
        const { data, error: supabaseError } = await supabase
          .from('ecotrack')
          .select('*')

        if (supabaseError) {
          throw supabaseError;
        }
          
        if (!data) {
          setActivities([]);
          setFilteredActivities([]);
          setLoading(false);
          setInitialLoadComplete(true);
          return;
        }
        
        // Map the database schema to the Activity interface
        const activitiesData = data.map(item => ({
          id: item.id ? parseInt(item.id.toString()) : Math.random() * 10000,
          lat: item.latitude !== undefined && item.latitude !== null ? item.latitude : (item.lat || 0),
          lng: item.longitude !== undefined && item.longitude !== null ? item.longitude : (item.lng || 0),
          country: item.country || 'Unknown',
          adress: item.street ? `${item.city || ''}, ${item.street}` : (item.city || ''),
          city: item.city,
          type: item.type || 'other',
          title: item.title || 'Untitled Activity',
          responsible: item.responsible || 'Unknown',
          photos: item.photos || null,
          hyperlink: item.hyperlink || null,
          created_at: item.created_at || null,
          direct_benefited: item.direct_benefited || 0,
          indirect_benefited: item.indirect_benefited || 0,
          description: item.description || '',
        }));
        
        console.log(`Loaded ${activitiesData.length} activities from ecotrack table`);
        
        // Filter out activities with invalid coordinates (both lat and lng are 0)
        const validActivities = activitiesData.filter(activity => 
          !(activity.lat === 0 && activity.lng === 0)
        );
        
        if (validActivities.length < activitiesData.length) {
          console.warn(`Filtered out ${activitiesData.length - validActivities.length} activities with invalid coordinates`);
        }
        
        setActivities(validActivities);
        setFilteredActivities(validActivities);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(err instanceof Error ? err.message : 'Unknown error fetching activities');
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    }

    fetchActivities()
  }, [propActivities])

  // Handle initial activity selection
  useEffect(() => {
    if (!loading && initialSelectedActivity && activities.length > 0) {
      const activity = activities.find(a => a.id === initialSelectedActivity)
      
      if (activity) {
        // Create a fly to event with a slight delay to ensure map is ready
        setTimeout(() => {
          const event = {
            id: activity.id,
            lat: activity.lat,
            lng: activity.lng,
            zoom: 14,
            color: getActivityColor(activity.type)
          }
          flyTo(event)
        }, 500)
      }
    }
  }, [loading, initialSelectedActivity, activities, flyTo])

  // Fix for React's StrictMode and leaflet initialization
  useEffect(() => {
    // Cleanup any existing map instance on unmount
    return () => {
      if (typeof window === 'undefined' || !L) {
        L = null;
      }
    };
  }, []);

  // Only show loading screen during initial load
  if (loading && !initialLoadComplete) {
    return <LoadingScreen />
  }

  if (error) {
    return <ErrorScreen error={error} />
  }
  
  // Don't render the map until Leaflet has loaded
  if (!isLeafletLoaded) {
    return <LoadingScreen />
  }

  // Use a fixed tile layer URL for dark mode (inverted by CSS)
  const tileLayerUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

  return (
    <div className="w-full h-full relative">
      {/* Main map container - this is where Leaflet will render */}
      <div className="w-full h-full z-10 dark-map" />
      
      {/* Activity info overlay - shown when activity is selected */}
      <style jsx global>{`
        .leaflet-container {
          background-color: #121212 !important;
        }
        
        /* Evitar borda branca ao arrastar */
        .leaflet-map-pane {
          background-color: #121212;
        }
        
        /* Garantir que o fundo do pane também seja escuro */
        .leaflet-pane {
          background-color: #121212;
        }
        
        /* Correção para garantir que efeitos de glow/blur não sejam cortados */
        .leaflet-marker-icon,
        .leaflet-marker-shadow {
          overflow: visible !important;
        }
        
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
          overflow: visible !important;
        }
        
        /* Melhorar a renderização do marker */
        .activity-marker {
          transform-style: preserve-3d;
          will-change: transform;
          backface-visibility: hidden;
        }
        
        /* Estilos customizados para o controle de zoom */
        .leaflet-control-zoom {
          margin-left: 15px !important;
          margin-bottom: 80px !important;
          border: 1px solid rgba(8, 145, 178, 0.5) !important;
          box-shadow: 0 0 10px rgba(8, 145, 178, 0.3) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        
        .leaflet-control-zoom a {
          background-color: rgba(0, 0, 0, 0.7) !important;
          color: #0ea5e9 !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 18px !important;
          font-weight: bold !important;
          transition: all 0.2s ease;
        }
        
        .leaflet-control-zoom a:hover {
          background-color: rgba(8, 145, 178, 0.3) !important;
          color: white !important;
        }
        
        .leaflet-control-zoom-in {
          border-bottom: 1px solid rgba(8, 145, 178, 0.5) !important;
        }
        
        /* Hide scrollbar for all browsers */
        ::-webkit-scrollbar {
          display: none;
        }
        
        html {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        body {
          overflow: hidden;
        }
        
        /* Scanline animation effect */
        @keyframes scanlineAnimation {
          0% {
            transform: translateY(0);
            opacity: 0.03;
          }
          50% {
            opacity: 0.04;
          }
          100% {
            transform: translateY(20px);
            opacity: 0.03;
          }
        }
        
        .scanline-effect {
          animation: scanlineAnimation 8s linear infinite;
          will-change: transform, opacity;
        }
        
        /* Grid overlay subtle pulse */
        @keyframes gridPulse {
          0% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.35;
          }
          100% {
            opacity: 0.3;
          }
        }
        
        .grid-effect {
          animation: gridPulse 15s ease-in-out infinite;
          will-change: opacity;
        }
        
        /* Disable console debug logging */
        .leaflet-debug {
          display: none !important;
        }
      `}</style>
      
      <div className="absolute inset-0 z-10">
        <MapContainer
          key={mapKey} /* Add key to control remounting */
          center={[20, 0]}
          zoom={2.5}
          className="w-full h-full"
          zoomControl={false}
          attributionControl={false}
          fadeAnimation={true}
          markerZoomAnimation={true}
        >
          {/* Background escuro para quando o mapa é arrastado além dos limites */}
          <div 
            style={{
              position: 'absolute',
              top: '-1000%',
              left: '-1000%',
              width: '3000%',
              height: '3000%',
              zIndex: -1,
              backgroundColor: '#121212',
              pointerEvents: 'none'
            }}
          />
          
          <TileLayer
            url={tileLayerUrl}
            attribution={tileAttribution}
          />
          <ZoomControl position="bottomleft" zoomInTitle="Zoom In" zoomOutTitle="Zoom Out" />
          <MapController />
          <MapOverlays />
          
          {/* Renderiza as atividades */}
          {filteredActivities.map((activity) => (
            <ActivityNode key={activity.id} activity={activity} />
          ))}
          
          {/* Conectar as atividades com linhas */}
          <ConnectionLines activities={filteredActivities.map(activity => {
            try {
              return convertToBaseActivity(activity);
            } catch (error) {
              console.error("Error converting activity for ConnectionLines:", error, activity);
              // Return a minimal valid BaseActivity to prevent rendering errors
              return {
                id: activity.id,
                lat: activity.lat,
                lng: activity.lng,
                type: activity.type,
                title: activity.title,
                photos: []
              };
            }
          })} />
          
          {/* Efeito de partículas */}
          <ParticleEffect activities={filteredActivities.map(activity => {
            try {
              return convertToBaseActivity(activity);
            } catch (error) {
              console.error("Error converting activity for ParticleEffect:", error, activity);
              // Return a minimal valid BaseActivity to prevent rendering errors
              return {
                id: activity.id,
                lat: activity.lat,
                lng: activity.lng,
                type: activity.type,
                title: activity.title,
                photos: []
              };
            }
          })} />
        </MapContainer>
      </div>
    </div>
  )
}

