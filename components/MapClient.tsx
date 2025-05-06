"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import React from "react"
import { MapContainer, TileLayer, useMap, ZoomControl, Marker, Popup } from "react-leaflet"
import { Badge } from "@/components/ui/badge"
import { ParticleEffect } from "@/components/particle-effect"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Zap, Leaf, Droplets, BookOpen, Shield, Globe, Wind } from "lucide-react"
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
      `}</style>
    </div>
  );
}

// MapController with simplified functionality
function MapController() {
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
    map.options.minZoom = 2;  // Prevent zooming out too far
    map.options.maxZoom = 5; // Prevent zooming in too close

    // Set initial view with appropriate zoom levels for mobile and desktop
    if (isMobile) {
      map.setView([0, 0], Math.max(2, 1.8), { animate: true, duration: 1 });
    } else {
      map.setView([0, 0], Math.max(2, 2.5), { animate: true, duration: 1 });
    }

    const handleResize = () => {
      if (window.innerWidth <= 768) {
        map.setView([0, 0], Math.max(2, 1.8), { animate: true, duration: 0.5 });
      } else {
        map.setView([0, 0], Math.max(2, 2.5), { animate: true, duration: 0.5 });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map, isMobile, resolvedTheme]);
  
  return <MapEffects />;
}

function ActivityNode({ activity }: { activity: Activity }) {
  const { resolvedTheme } = useTheme();
  const color = getActivityColor(activity.type);
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
        z-index: 99999;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
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
          z-index: 3;
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
                  ${activity.originalLat !== undefined ? `
                    <div style="margin-bottom: 0.75rem; padding: 0.5rem; border-radius: 0.375rem; background-color: rgba(${color.startsWith('#') ? parseInt(color.slice(1, 3), 16) : 0}, ${color.startsWith('#') ? parseInt(color.slice(3, 5), 16) : 0}, ${color.startsWith('#') ? parseInt(color.slice(5, 7), 16) : 0}, 0.1); border: 1px dashed ${color}40;">
                      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: rgba(255, 255, 255, 0.9);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
                          <circle cx="12" cy="9" r="3"></circle>
                        </svg>
                        <span>Multiple activities in this location - markers are slightly spread out for visibility</span>
                      </div>
                    </div>
                  ` : ''}
                  
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
    photos
  };
};

// Add this MapPaneCreator component after the other component definitions, before the main MapClient component
function MapPaneCreator() {
  const map = useMap();
  
  useEffect(() => {
    // Run once after map is mounted and fully initialized
    // Use a slight delay to ensure the map is ready
    const timer = setTimeout(() => {
      if (!map) return;
      
      try {
        // Create a custom pane for labels if it doesn't exist yet
        if (!map.getPane('labelsPane')) {
          console.log('Creating labels pane for map');
          map.createPane('labelsPane');
          
          const pane = map.getPane('labelsPane');
          if (pane) {
            pane.style.zIndex = '650';
            pane.style.pointerEvents = 'none';
            pane.className += ' leaflet-labels-pane';
          } else {
            console.error('Failed to get labelsPane after creation');
          }
        }
      } catch (error) {
        console.error('Error creating map pane:', error);
      }
    }, 100); // Small delay to ensure map is initialized
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
}

// MapReady component to ensure children are only rendered after map is fully initialized
function MapReady({ children }: { children: React.ReactNode }) {
  const map = useMap();
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (!map) return;
    
    let isMounted = true;
    
    // Try multiple approaches to ensure map is ready
    
    // 1. Check if already loaded
    if ((map as any)._loaded) {
      setReady(true);
      return;
    }
    
    // 2. Use whenReady event
    const handleMapReady = () => {
      if (isMounted) setReady(true);
    };
    
    try {
      map.whenReady(handleMapReady);
    } catch (e) {
      console.warn("Error using whenReady:", e);
    }
    
    // 3. Fallback with timeout
    const fallbackTimer = setTimeout(() => {
      if (isMounted && !ready) {
        console.log("Using fallback timer for map ready");
        setReady(true);
      }
    }, 2000);
    
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      setReady(false);
    };
  }, [map, ready]);
  
  return ready ? <>{children}</> : null;
}

// DelayedMapContent component ensures DOM is fully ready before rendering layers
function DelayedMapContent({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    let mounted = true;
    
    // Try multiple approaches for reliable initialization
    
    // 1. If the map is already loaded, proceed immediately
    if ((map as any)._loaded) {
      setIsReady(true);
      return;
    }
    
    // 2. Use the whenReady event - most reliable approach
    try {
      map.whenReady(() => {
        if (mounted) {
          console.log("Map is ready in DelayedMapContent");
          // Add a small additional delay to ensure DOM is fully established
          setTimeout(() => {
            if (mounted) setIsReady(true);
          }, 100);
        }
      });
    } catch (e) {
      console.warn("Error in map.whenReady:", e);
    }
    
    // 3. Fallback with a timeout as last resort
    const fallbackTimer = setTimeout(() => {
      if (mounted && !isReady) {
        console.log("Using fallback timer in DelayedMapContent");
        setIsReady(true);
      }
    }, 1000);
    
    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [map, isReady]);
  
  return isReady ? <>{children}</> : null;
}

// SafeTileLayer wraps TileLayer with error handling
function SafeTileLayer({ url, attribution, pane, className, opacity }: { 
  url: string, 
  attribution: string,
  pane?: string,
  className?: string,
  opacity?: number
}) {
  const [hasError, setHasError] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const map = useMap();
  
  useEffect(() => {
    // Only proceed when the map is fully initialized
    if (!map) return;
    
    try {
      // Check if map is fully initialized with a safer approach
      if ((map as any)._loaded) {
        // If the pane is specified, make sure it exists
        if (pane && !map.getPane(pane)) {
          console.log(`Creating pane ${pane} that doesn't exist yet`);
          map.createPane(pane);
        }
        
        setIsMapReady(true);
      } else {
        // Use whenReady as a fallback
        map.whenReady(() => {
          setIsMapReady(true);
        });
      }
    } catch (error) {
      console.error("Error initializing SafeTileLayer:", error);
      setHasError(true);
    }
  }, [map, pane]);
  
  // If there was an error rendering, return null
  if (hasError) {
    console.warn(`TileLayer with URL ${url} failed to load`);
    return null;
  }
  
  // Only render the TileLayer when the map is ready
  if (!isMapReady) return null;
  
  return (
    <ErrorBoundary onError={() => setHasError(true)}>
      <TileLayer
        url={url}
        attribution={attribution}
        pane={pane}
        className={className}
        opacity={opacity}
      />
    </ErrorBoundary>
  );
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

// Add this MapInitializer component to handle map initialization
function MapInitializer() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Execute once map is ready
    map.whenReady(() => {
      console.log("Map is fully initialized in MapInitializer");
      
      // Ensure all panes exist
      if (!map.getPane('labelsPane')) {
        try {
          map.createPane('labelsPane');
          const pane = map.getPane('labelsPane');
          if (pane) {
            pane.style.zIndex = '650';
            pane.style.pointerEvents = 'none';
            pane.className += ' leaflet-labels-pane';
          }
        } catch (e) {
          console.error("Error creating labelsPane:", e);
        }
      }
    });
  }, [map]);

  return null;
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

// Static Map with extremely simplified initialization
function StaticMap({ activities }: { activities?: Activity[] }) {
  const [mapReady, setMapReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { resolvedTheme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [processedActivities, setProcessedActivities] = useState<Activity[]>([]);

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
      setProcessedActivities(activities);
    }
  }, [activities]);
  
  // Create and position markers when map and activities are ready
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !processedActivities || processedActivities.length === 0) {
      return;
    }
    
    console.log(`Creating ${processedActivities.length} markers on map`);
    
    // Clear any existing markers
    document.querySelectorAll('.activity-marker-custom').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    // Create markers for each activity
    processedActivities.forEach((activity) => {
      try {
        // Create marker element
        const markerDiv = document.createElement('div');
        markerDiv.className = 'activity-marker-custom';
        markerDiv.id = `marker-${activity.id}`;
        markerDiv.style.cssText = `
          width: 30px;
          height: 30px;
          background-color: ${getActivityColor(activity.type)};
          border-radius: 50%;
          border: 2px solid white;
          position: absolute;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 15px ${getActivityColor(activity.type)}, 0 0 30px ${getActivityColor(activity.type)};
          z-index: 99999;
          pointer-events: all;
          cursor: pointer;
        `;
        
        // Add marker to the DOM (map container's parent for z-index)
        const mapContainer = mapInstanceRef.current.getContainer();
        if (mapContainer && mapContainer.parentNode) {
          mapContainer.parentNode.appendChild(markerDiv);
        } else {
          document.body.appendChild(markerDiv);
        }
        
        // Add click handler
        markerDiv.addEventListener('click', () => {
          console.log("Marker clicked:", activity);
          
          // Show activity details
          alert(`Activity: ${activity.title} (${activity.type})`);
        });
        
        // Position update function
        const updatePosition = () => {
          try {
            if (!mapInstanceRef.current) return;
            const map = mapInstanceRef.current;
            const point = map.latLngToContainerPoint([activity.lat, activity.lng]);
            
            // Apply position
            markerDiv.style.left = `${point.x}px`;
            markerDiv.style.top = `${point.y}px`;
          } catch (e) {
            console.error("Error positioning marker:", e);
          }
        };
        
        // Update position immediately and on map events
        updatePosition();
        
        // Listen for map movement and update marker positions
        if (mapInstanceRef.current) {
          mapInstanceRef.current.on('move', updatePosition);
          mapInstanceRef.current.on('zoom', updatePosition);
          mapInstanceRef.current.on('resize', updatePosition);
        }
      } catch (e) {
        console.error("Error creating marker:", e, activity);
      }
    });
    
    // Cleanup function to remove markers when component unmounts
    return () => {
      document.querySelectorAll('.activity-marker-custom').forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    };
  }, [mapReady, processedActivities, mapInstanceRef.current]);

  // Initialize map on first render with no layers
  useEffect(() => {
    if (typeof window === 'undefined' || !L || !mapContainerRef.current) return;
    
    try {
      console.log("Creating map instance...");
      
      // Create a map with no layers
      const mapInstance = L.map(mapContainerRef.current, {
        center: [0, 0],
        zoom: 2.5,
        minZoom: 2,
        maxZoom: 16,
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        markerZoomAnimation: true,
        preferCanvas: true,
      });
      
      // Store reference
      mapInstanceRef.current = mapInstance;
      
      // Apply styles to container
      const container = mapInstance.getContainer();
      if (container) {
        if (resolvedTheme === 'dark') {
          container.classList.add("dark-map");
          container.classList.remove("light-map");
        } else {
          container.classList.add("light-map");
          container.classList.remove("dark-map");
        }
        container.style.backgroundColor = '#0a2342'; // Deep blue background
      }
      
      // Create a background div to control the map's background color
      mapInstance.getContainer().style.background = '#0a2342';
      
      // Set boundaries
      const southWest = L.latLng(-90, -200);
      const northEast = L.latLng(90, 200);
      const bounds = L.latLngBounds(southWest, northEast);
      mapInstance.setMaxBounds(bounds);
      mapInstance.options.maxBoundsViscosity = 1.0;
      
      // Add zoom control manually
      L.control.zoom({
        position: 'bottomleft',
        zoomInTitle: 'Zoom In',
        zoomOutTitle: 'Zoom Out'
      }).addTo(mapInstance);
      
      // Set initial view
      if (isMobile) {
        mapInstance.setView([0, 0], 1.8, { animate: false });
      } else {
        mapInstance.setView([0, 0], 2.5, { animate: false });
      }
      
      // Create panes that layers might need
      mapInstance.createPane('labelsPane');
      const pane = mapInstance.getPane('labelsPane');
      if (pane) {
        pane.style.zIndex = '650';
        pane.style.pointerEvents = 'none';
        pane.className += ' leaflet-labels-pane';
      }
      
      // Ensure proper z-index for all panes
      const ensureCorrectZIndex = () => {
        // Key map panes that need specific z-index values
        const mapPanes = mapInstance.getPanes();
        
        // Configure z-index for standard panes
        if (mapPanes.tilePane) mapPanes.tilePane.style.zIndex = '200';
        if (mapPanes.overlayPane) mapPanes.overlayPane.style.zIndex = '1300';
        if (mapPanes.shadowPane) mapPanes.shadowPane.style.zIndex = '1400';
        if (mapPanes.markerPane) mapPanes.markerPane.style.zIndex = '99999';
        if (mapPanes.tooltipPane) mapPanes.tooltipPane.style.zIndex = '99999';
        if (mapPanes.popupPane) mapPanes.popupPane.style.zIndex = '99999';
        
        console.log("Z-index values configured for map panes");
      };
      
      // Run z-index configuration after map is ready
      ensureCorrectZIndex();
      
      // Signal that map is ready
      setTimeout(() => {
        console.log("Map is fully initialized - setting mapReady state");
        setMapReady(true);
        
        // Force a map update to ensure all calculations are correct
        mapInstance.invalidateSize();
      }, 100);
      
      // Add base and layers with a delay to ensure proper initialization
      setTimeout(() => {
        try {
          if (!L || !mapInstance) return;
          
          console.log("Adding base tile layer...");
          // Change to a more transparent/dark base layer
          const tileLayerUrl = "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png";
          const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
          
          L.tileLayer(tileLayerUrl, {
            attribution: tileAttribution,
            opacity: 0.4, // Increased from 0.2 to make it more visible
          }).addTo(mapInstance);
          
          // Add labels layer
          console.log("Adding labels layer...");
          // Use a layer that shows only labels, roads, and water/forest features
          const labelsLayerUrl = "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png";
          const labelsAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
          
          L.tileLayer(labelsLayerUrl, {
            attribution: labelsAttribution,
            pane: 'labelsPane',
            opacity: 1.0, // Full opacity for labels
            className: 'labels-layer'
          }).addTo(mapInstance);
          
          // Add a third layer just for water and natural features with higher opacity
          const naturesLayerUrl = "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg";
          const naturesAttribution = '&copy; <a href="https://stamen.com">Stamen Design</a>';
          
          L.tileLayer(naturesLayerUrl, {
            attribution: naturesAttribution,
            opacity: 0.7, // Increased from 0.5 to make natural features more vibrant
            pane: 'overlayPane',
          }).addTo(mapInstance);
          
          // Signal that layers are ready
          setLayersReady(true);
          
          // Force map update again to ensure all layers render correctly
          mapInstance.invalidateSize();
        } catch (error) {
          console.error("Error adding layers:", error);
        }
      }, 500); // Increased delay for better stability
      
      // Return cleanup function
      return () => {
        console.log("Cleaning up map instance");
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }, [resolvedTheme, isMobile]);
  
  // Add layers only after map is fully initialized and with a significant delay
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !L) return;
    
    console.log("Map is ready, adding layers after delay...");
    
    // Add significant delay to ensure map DOM is fully established
    const timer = setTimeout(() => {
      try {
        const mapInstance = mapInstanceRef.current;
        if (!mapInstance || !L) return;
        
        console.log("Adding base tile layer...");
        // Change to a more transparent/dark base layer
        const tileLayerUrl = "https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png";
        const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
        
        L.tileLayer(tileLayerUrl, {
          attribution: tileAttribution,
          opacity: 0.4, // Increased from 0.2 to make it more visible
        }).addTo(mapInstance);
        
        // Add labels layer
        console.log("Adding labels layer...");
        // Use a layer that shows only labels, roads, and water/forest features
        const labelsLayerUrl = "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png";
        const labelsAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        
        L.tileLayer(labelsLayerUrl, {
          attribution: labelsAttribution,
          pane: 'labelsPane',
          opacity: 1.0, // Full opacity for labels
          className: 'labels-layer'
        }).addTo(mapInstance);
        
        // Add a third layer just for water and natural features with higher opacity
        const naturesLayerUrl = "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg";
        const naturesAttribution = '&copy; <a href="https://stamen.com">Stamen Design</a>';
        
        L.tileLayer(naturesLayerUrl, {
          attribution: naturesAttribution,
          opacity: 0.7, // Increased from 0.5 to make natural features more vibrant
          pane: 'overlayPane',
        }).addTo(mapInstance);
        
        // Signal that layers are ready
        setLayersReady(true);
      } catch (error) {
        console.error("Error adding layers:", error);
      }
    }, 2000); // 2-second delay for ensuring DOM is ready
    
    return () => clearTimeout(timer);
  }, [mapReady]);
  
  return (
    <div className="w-full h-full relative">
      {/* Map container div */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-10 dark-map"
      />
      
      {/* Dark background for map boundaries */}
      <div 
        className="absolute top-0 left-0 w-full h-full"
        style={{
          backgroundColor: '#0a2342',
          zIndex: -1,
          backgroundImage: 'radial-gradient(circle at center, rgba(30, 100, 170, 0.3) 0%, rgba(10, 35, 66, 0.1) 50%, rgba(10, 35, 66, 0) 100%)',
        }}
      />
      
      {/* Map styles */}
      <style jsx global>{`
        .leaflet-container {
          background-color: #0a2342 !important;
        }
        
        /* Forcing markers and interactions to appear on top */
        .leaflet-marker-pane, 
        .leaflet-marker-icon,
        .leaflet-marker-shadow,
        .leaflet-marker-container {
          z-index: 99999 !important;
        }
        
        .activity-marker, 
        .activity-marker-container,
        div[class*='activity-marker'] {
          z-index: 99999 !important;
        }
        
        /* Particle layers need to be on top too */
        .particle-container,
        .leaflet-particle-layer,
        .connection-lines-container,
        canvas.leaflet-layer {
          z-index: 99999 !important;
        }
        
        /* Reset stacking context */
        .leaflet-map-pane {
          position: absolute !important;
          z-index: 0 !important;
          background-color: #0a2342;
        }
        
        .leaflet-tile-pane {
          z-index: 200 !important;
        }
        
        .leaflet-overlay-pane {
          z-index: 1300 !important;
          mix-blend-mode: color-dodge !important;
          filter: saturate(1.2) contrast(1.1) !important;
        }
        
        .leaflet-shadow-pane {
          z-index: 1400 !important;
        }
        
        .leaflet-marker-pane {
          z-index: 99999 !important;
        }
        
        .leaflet-tooltip-pane {
          z-index: 99999 !important;
        }
        
        .leaflet-popup-pane {
          z-index: 99999 !important;
        }
        
        /* Make sure particle layer is visible */
        .leaflet-particle-layer {
          z-index: 1300 !important;
          pointer-events: none !important;
        }
        
        /* Style for the labels layer */
        .labels-layer {
          mix-blend-mode: screen !important;
        }
        
        /* Ensure the pane has the right z-index and styles */
        .leaflet-labels-pane {
          z-index: 650 !important;
          pointer-events: none !important;
        }
        
        .dark-map .labels-layer {
          mix-blend-mode: screen !important;
        }
        
        /* Custom styles for zoom controls */
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
      `}</style>
      
      {/* Map overlays */}
      <MapOverlays />
      
      {/* Labels toggle button - just a placeholder for now */}
      <div className="absolute top-4 right-4 z-20">
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-cyan-500/30 text-white shadow-lg hover:bg-black/80 transition-all"
          title="Toggle Labels"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M6 9h6"></path>
            <path d="M4 14h8"></path>
            <path d="M16 4h2"></path>
            <path d="M21 4h1"></path>
            <path d="M21 9h-2.5"></path>
            <path d="M19 14h-2"></path>
            <path d="M14 20l1.5-8"></path>
            <path d="M9 18L5 6V4"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function MapClient({ activities: propActivities, initialSelectedActivity }: MapClientProps) {
  const [activities, setActivities] = useState<Activity[]>(propActivities || []);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    types: [],
    expanded: false
  });
  const isLeafletLoaded = useLeaflet();

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // If we already have activities from props, use them
        if (propActivities && propActivities.length > 0) {
          const spreadActivities = spreadOverlappingMarkers(propActivities);
          setActivities(spreadActivities);
          setFilteredActivities(spreadActivities);
          setLoading(false);
          setInitialLoadComplete(true);
          return;
        }

        // Otherwise fetch from Supabase
        const supabaseClient = getSupabaseBrowserClient();
        if (!supabaseClient) {
          throw new Error('Supabase client not initialized');
        }

        const { data, error: supabaseError } = await supabaseClient
          .from('ecotrack')
          .select('*');

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
          id: item.id ? item.id.toString() : `id-${Math.random().toString(36).substr(2, 9)}`,
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
          description: item.description || '',
        }));
        
        console.log(`Loaded ${activitiesData.length} activities from ecotrack table`);
        
        // Filter out activities with invalid coordinates
        const validActivities = activitiesData.filter(activity => 
          !(activity.lat === 0 && activity.lng === 0)
        );
        
        // Spread out overlapping markers
        const spreadActivities = spreadOverlappingMarkers(validActivities);
        
        setActivities(spreadActivities);
        setFilteredActivities(spreadActivities);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(err instanceof Error ? err.message : 'Unknown error fetching activities');
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    fetchActivities();
  }, [propActivities]);

  // Only show loading screen during initial load
  if (loading && !initialLoadComplete) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }
  
  // Don't render the map until Leaflet has loaded
  if (!isLeafletLoaded) {
    return <LoadingScreen />;
  }

  // Render the simplified static map
  return <StaticMap activities={filteredActivities.length > 0 ? filteredActivities : activities} />;
}

