"use client"

import React, { useEffect, useState, useRef } from "react"
import dynamic from 'next/dynamic'
import { getSupabaseBrowserClient, fetchActivities } from "@/lib/supabaseClient"
import { Globe, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "next/navigation"
import { OverlayProvider } from "@/contexts/overlay-context"
import { Overlay } from "@/components/overlay"
import { Activity } from "@/components/map/types" // Use our new types file
import { parseActivityPhotos } from "@/components/map/utils" // Import the safer photo parsing utility
import { LeafletProvider } from "@/contexts/leaflet-context" // Import the LeafletProvider

// Simple error boundary class component
class MapErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Map error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
          <div className="max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">Map Error</h2>
            <p className="mb-6 text-gray-300">Sorry, there was an error loading the map: {this.state.error?.message}</p>
            <Button 
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }} 
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Ensure dynamic import has correct options for client-side only component
const MapClient = dynamic(
  () => import('@/components/map/MapClient'), // Updated path
  { 
    ssr: false, 
    loading: () => <MapLoading /> 
  }
)

// Simple loading component
function MapLoading() {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-black via-black/90 to-black/80 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse flex items-center justify-center relative">
          <div className="h-8 w-8 text-white animate-spin border-2 border-white border-t-transparent rounded-full"></div>
        </div>
      </div>
      <p className="mt-4 text-white/80">Loading map...</p>
    </div>
  )
}

// Animated loading screen component
function LoadingScreen() {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const pinsRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Create simple animations without animejs dependency
    if (containerRef.current) {
      containerRef.current.style.opacity = '0';
      setTimeout(() => {
        if (containerRef.current) containerRef.current.style.opacity = '1';
      }, 100);
    }
    
    if (globeRef.current) {
      globeRef.current.style.transform = 'scale(0.5)';
      globeRef.current.style.opacity = '0';
      setTimeout(() => {
        if (globeRef.current) {
          globeRef.current.style.transform = 'scale(1)';
          globeRef.current.style.opacity = '1';
          globeRef.current.style.transition = 'transform 1.2s, opacity 1.2s';
        }
      }, 400);
    }
    
    if (textRef.current) {
      textRef.current.style.transform = 'translateY(30px)';
      textRef.current.style.opacity = '0';
      setTimeout(() => {
        if (textRef.current) {
          textRef.current.style.transform = 'translateY(0)';
          textRef.current.style.opacity = '1';
          textRef.current.style.transition = 'transform 0.8s, opacity 0.8s';
        }
      }, 400);
    }
    
    // Animate pins with stagger effect
    if (pinsRef.current) {
      const pins = pinsRef.current.querySelectorAll('.map-pin');
      pins.forEach((pin, i) => {
        (pin as HTMLElement).style.transform = 'scale(0)';
        (pin as HTMLElement).style.opacity = '0';
        setTimeout(() => {
          (pin as HTMLElement).style.transform = 'scale(1)';
          (pin as HTMLElement).style.opacity = '1';
          (pin as HTMLElement).style.transition = 'transform 0.6s, opacity 0.6s';
        }, i * 100 + 800);
      });
    }
  }, []);
  
  return (
    <div className="w-full h-screen bg-gradient-to-b from-black via-gray-900/90 to-gray-900/80 flex flex-col items-center justify-center" ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
        <div ref={globeRef} className="h-20 w-20 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center relative">
          <Globe className="h-10 w-10 text-white animate-spin-slow" />
          
          {/* Animated map pins */}
          <div ref={pinsRef} className="absolute">
            <MapPin className="map-pin absolute top-0 left-2 h-3 w-3 text-red-400" />
            <MapPin className="map-pin absolute -top-4 -right-1 h-3 w-3 text-green-400" />
            <MapPin className="map-pin absolute -bottom-2 -right-4 h-3 w-3 text-blue-400" />
            <MapPin className="map-pin absolute -bottom-4 left-1 h-3 w-3 text-yellow-400" />
            <MapPin className="map-pin absolute top-1 -right-6 h-3 w-3 text-purple-400" />
          </div>
        </div>
      </div>
      <div ref={textRef} className="mt-8 text-center">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
          Loading Global Activity Map
        </h2>
        <p className="text-gray-400 text-sm max-w-md">
          Visualizing environmental initiatives from around the world
        </p>
      </div>
    </div>
  )
}

// Main content component for the map page
function MapPageContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [retryCount, setRetryCount] = useState(0)
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  
  // Use a ref to track component mount state for proper cleanup
  const isMountedRef = useRef(true);
  const uniqueComponentId = useRef(`map-page-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const instanceIdRef = useRef<string>(`map-instance-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)
  
  // Use layout effect to clear the DOM on unmount
  // This ensures DOM cleanup happens synchronously before the next render
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;
  
  useIsomorphicLayoutEffect(() => {
    // On mount - do pre-emptive cleanup in case previous instance didn't clean up properly
    try {
      if (typeof window !== 'undefined') {
        // Clear global state
        window._leafletMapInstance = undefined; 
        window._leafletMapContainer = undefined;
        window._leafletInitInProgress = false;
        
        // Record that this specific component instance is mounted
        if (typeof document !== 'undefined') {
          // Create a tracking element if it doesn't exist
          let tracker = document.getElementById('map-component-tracker');
          if (!tracker) {
            tracker = document.createElement('div');
            tracker.id = 'map-component-tracker';
            tracker.style.display = 'none';
            document.body.appendChild(tracker);
          }
          
          // Store this instance ID in the tracker
          tracker.setAttribute('data-current-map-page', uniqueComponentId.current);
          tracker.setAttribute('data-mount-time', Date.now().toString());
        }
      }
    } catch (e) {
      console.warn('Error in map page pre-cleanup:', e);
    }
    
    return () => {
      isMountedRef.current = false;
      
      // Record component unmount
      try {
        if (typeof document !== 'undefined') {
          // Update tracker to indicate this instance is unmounting
          const tracker = document.getElementById('map-component-tracker');
          if (tracker && tracker.getAttribute('data-current-map-page') === uniqueComponentId.current) {
            tracker.setAttribute('data-unmounted', 'true');
            tracker.setAttribute('data-unmount-time', Date.now().toString());
          }
        }
      } catch (e) {
        console.warn('Error updating tracker:', e);
      }
      
      // When unmounting, clean up the map container to prevent reuse issues
      try {
        const mapContainer = document.getElementById('map');
        if (mapContainer && mapContainer.parentElement) {
          // First, completely remove the element
          mapContainer.parentElement.removeChild(mapContainer);
          
          // Then create a replacement with a different ID first
          const freshContainer = document.createElement('div');
          freshContainer.id = 'map-placeholder';  // Use a different ID briefly
          freshContainer.setAttribute('data-unmounted', 'true');
          freshContainer.setAttribute('data-unmount-time', Date.now().toString());
          freshContainer.style.cssText = 'height: 100%; width: 100%; position: relative;';
          mapContainer.parentElement.appendChild(freshContainer);
          
          // After a brief delay, rename to standard ID to handle potential race conditions
          setTimeout(() => {
            if (freshContainer && document.body.contains(freshContainer)) {
              freshContainer.id = 'map';
            }
          }, 100);
          
          console.log('MapPage unmounted: cleaned up map container');
        }
        
        // Also clear the registry 
        if (typeof window !== 'undefined') {
          window._leafletMapInstance = undefined;
          window._leafletMapContainer = undefined;
          window._leafletInitInProgress = false;
        }
      } catch (e) {
        console.warn('Error during map page cleanup:', e);
      }
    };
  }, []);
  
  // Fetch activities from Supabase
  useEffect(() => {
    const fetchMapActivities = async () => {
      try {
        setIsLoading(true)
        
        // Get Supabase client
        const supabase = getSupabaseBrowserClient()
        if (!supabase) {
          throw new Error("Unable to initialize Supabase client")
        }
        
        // Fetch activities - passing a limit instead of the supabase client
        const fetchedActivities = await fetchActivities(50)
        
        if (!fetchedActivities || fetchedActivities.length === 0) {
          // If no activities are returned but no error occurred, it might be an empty result or a problem
          console.warn("No activities were returned. This could be normal or indicate a problem.")
          
          // If this is a retry attempt, show a warning to the user
          if (retryCount > 0) {
            setError("Unable to load activities. Please check your network connection.")
          }
        } else {
          // Convert to the format our map component expects
          const mapActivities: Activity[] = fetchedActivities.map(activity => ({
            id: activity.id,
            title: activity.title,
            description: activity.description,
            lat: activity.latitude || 0,
            lng: activity.longitude || 0,
            type: activity.type?.toLowerCase() || 'other',
            country: activity.country,
            address: activity.location,
            responsible: activity.organizer,
            photos: parseActivityPhotos(activity.photos), // Use the safer parsing function
            createdAt: activity.created_at,
            updatedAt: activity.updated_at
          }))
          
          setActivities(mapActivities)
          setError(null) // Clear any previous errors
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching activities:", error)
        setError("Could not load map activities. Please try again later.")
        setIsLoading(false)
      }
    }
    
    fetchMapActivities()
  }, [retryCount])
  
  // Function to manually retry fetching if it fails
  const handleRetry = () => {
    // Generate a new instance ID to ensure a clean remount of the map
    instanceIdRef.current = `map-instance-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setRetryCount(prev => prev + 1)
  }
  
  // Handle map loading states
  if (isLoading) {
    return <LoadingScreen />
  }
  
  // Show error state with retry button
  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="max-w-md text-center px-4">
          <h2 className="text-2xl font-bold mb-4">Unable to Load Map Data</h2>
          <p className="mb-6 text-gray-300">{error}</p>
          <Button onClick={handleRetry} className="bg-cyan-600 hover:bg-cyan-700">
            Retry
          </Button>
        </div>
      </div>
    )
  }
  
  // Get Stadia Maps API key from environment
  const stadiaApiKey = process.env.NEXT_PUBLIC_STADIA_API_KEY || null
  
  return (
    <div className="h-screen w-full">
      <MapClient 
        key={instanceIdRef.current} // Add a unique key to force clean remount when needed
        activities={activities} 
        isLoading={isLoading}
        error={error}
        stadiaApiKey={stadiaApiKey}
      />
    </div>
  )
}

// Main map page component with overlay provider
export default function MapPage() {
  return (
    <MapErrorBoundary>
      <OverlayProvider>
        <LeafletProvider>
          <MapPageContent />
          <Overlay />
        </LeafletProvider>
      </OverlayProvider>
    </MapErrorBoundary>
  )
} 