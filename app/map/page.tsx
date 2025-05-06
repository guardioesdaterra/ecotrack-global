"use client"

import React, { useEffect, useState, useRef, Suspense } from "react"
import dynamic from 'next/dynamic'
import { getSupabaseBrowserClient, fetchActivities } from "@/lib/supabaseClient"
import { Activity as MapComponentActivity } from "@/components/map-component"
import { animate, createScope, createSpring } from "animejs"
import { Globe, Layers, Filter, ChevronDown, MapPin, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "next/navigation"
import { AnimationInstance } from "@/types/animations"
import MapClient from "@/components/MapClient"
import { convertToMapActivity } from "@/lib/utils"

// Define the Activity interface matching what MapClient expects
interface MapClientActivity {
  id: string
  lat: number
  lng: number
  country?: string
  adress?: string
  type: string
  title: string
  responsible?: string
  photos?: string | null
  description?: string
}

// Dynamically import MapClient with no SSR
const MapClientNoSSR = dynamic(
  () => import('@/components/MapClient'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-black">
        <LoadingScreen />
      </div>
    )
  }
)

// Animated loading screen component
function LoadingScreen() {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const pinsRef = useRef<HTMLDivElement>(null)
  const animationScope = useRef<any>(null)
  
  useEffect(() => {
    // Only initialize scope when container ref is available
    if (!containerRef.current) return;
    
    // Create animation scope for better organization and cleanup
    animationScope.current = createScope({ 
      root: containerRef.current 
    }).add(self => {
      // Only animate when targets are available
      if (containerRef.current) {
        animate(containerRef.current, {
          opacity: [0, 1],
          duration: 800,
          ease: 'outQuad'
        });
      }
      
      if (globeRef.current) {
        animate(globeRef.current, {
          scale: [0.5, 1],
          opacity: [0, 1], 
          duration: 1200,
          elasticity: 400,
          delay: 400
        });
      }
      
      if (textRef.current) {
        animate(textRef.current, {
          translateY: [30, 0],
          opacity: [0, 1],
          duration: 800,
          ease: 'outCubic',
          delay: 400
        });
      }
      
      // Animate the pins with stagger
      if (pinsRef.current) {
        const pins = pinsRef.current.querySelectorAll('.map-pin');
        animate(pins, {
          scale: [0, 1],
          opacity: [0, 1],
          duration: 600,
          delay: function(el, i) { return i * 100 + 800; }, // Manually create stagger effect
          ease: 'outBack'
        });
      }
      
      // Create pulsing effect on globe
      if (globeRef.current) {
        animate(globeRef.current, {
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)',
          duration: 2000,
          direction: 'alternate',
          ease: 'inOutSine',
          loop: true
        });
      }
    });
    
    // Proper cleanup when component unmounts
    return () => {
      if (animationScope.current) {
        animationScope.current.revert();
      }
    };
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

// Sidebar component with activity filters and controls
function MapSidebar({ 
  isVisible, 
  onToggle, 
  activities,
  onActivityClick
}: { 
  isVisible: boolean, 
  onToggle: () => void,
  activities: MapClientActivity[],
  onActivityClick: (id: string, lat: number, lng: number) => void
}) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  
  // Filter activities by type
  const filteredActivities = activeFilter 
    ? activities.filter(a => a.type === activeFilter)
    : activities
  
  // Group activities by type for summary statistics
  const activityStats = activities.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Get color for activity type
  const getTypeColor = (type: string) => {
    switch (type) {
      case "reforestation": return "bg-green-500"
      case "clean-up": return "bg-blue-500"
      case "education": return "bg-amber-500"
      case "conservation": return "bg-emerald-500"
      case "renewable": return "bg-cyan-500"
      default: return "bg-purple-500"
    }
  }
  
  // Get icon for activity type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "reforestation": return <div className="w-3 h-3 rounded-full bg-green-500"></div>
      case "clean-up": return <div className="w-3 h-3 rounded-full bg-blue-500"></div>
      case "education": return <div className="w-3 h-3 rounded-full bg-amber-500"></div>
      case "conservation": return <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
      case "renewable": return <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
      default: return <div className="w-3 h-3 rounded-full bg-purple-500"></div>
    }
  }
  
  return (
    <motion.div 
      className="fixed top-0 left-0 w-80 h-full bg-black/90 backdrop-blur-sm border-r border-white/10 z-20 overflow-hidden flex flex-col"
      initial={{ x: -320 }}
      animate={{ x: isVisible ? 0 : -320 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-cyan-400" />
          <h2 className="font-medium text-white">Activity Explorer</h2>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-gray-400 hover:text-white"
          onClick={onToggle}
        >
          <ChevronDown className="h-4 w-4 -rotate-90" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* Filter section */}
        <div className="sidebar-item">
          <h3 className="text-xs uppercase text-gray-500 font-medium mb-3">Filter by Type</h3>
          <div className="grid grid-cols-2 gap-2">
            {['reforestation', 'clean-up', 'education', 'conservation', 'renewable'].map(type => (
              <motion.button
                key={type}
                className={`text-xs rounded-full px-3 py-1.5 flex items-center justify-center space-x-1.5 transition-all ${
                  activeFilter === type 
                    ? 'bg-white/10 text-white' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {getTypeIcon(type)}
                <span className="capitalize">{type.replace('-', ' ')}</span>
              </motion.button>
            ))}
          </div>
        </div>
        
        {/* Activity Stats */}
        <div className="sidebar-item">
          <h3 className="text-xs uppercase text-gray-500 font-medium mb-3">Activity Summary</h3>
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">Total Activities</span>
              <span className="text-white font-medium">{activities.length}</span>
            </div>
            {Object.entries(activityStats).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {getTypeIcon(type)}
                  <span className="text-gray-400 text-xs capitalize">{type.replace('-', ' ')}</span>
                </div>
                <span className="text-gray-300 text-xs">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Activities list */}
        <div className="sidebar-item">
          <h3 className="text-xs uppercase text-gray-500 font-medium mb-3">
            Activities {activeFilter && `(${filteredActivities.length})`}
          </h3>
          
          <motion.div
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
          >
            {filteredActivities.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm italic">
                No activities found
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <motion.div
                  key={activity.id}
                  className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-all"
                  onClick={() => onActivityClick(activity.id, activity.lat, activity.lng)}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start space-x-2">
                    <div className={`w-2 h-2 mt-1 rounded-full ${getTypeColor(activity.type)}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium truncate">{activity.title}</h4>
                      <div className="flex items-center mt-1 text-xs text-gray-400">
                        <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                        <span className="truncate">
                          {activity.country || "Location unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

// Wrap the component that uses useSearchParams with Suspense
function MapPageContent() {
  const [activities, setActivities] = useState<MapClientActivity[]>([])
  const [mappedActivities, setMappedActivities] = useState<MapClientActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const [filteredCount, setFilteredCount] = useState<number>(0)
  const [showFilterNotice, setShowFilterNotice] = useState<boolean>(false)
  const mapPageRef = useRef<HTMLDivElement>(null)
  const animationScope = useRef<any>(null)
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  
  // Get activity ID from URL if present
  useEffect(() => {
    const activityId = searchParams.get('activity')
    if (activityId) {
      setSelectedActivity(activityId)
    }
  }, [searchParams])
  
  // Initialize animations
  useEffect(() => {
    // Only initialize scope when map page ref is available
    if (!mapPageRef.current) return;
    
    // Create animation scope for the page
    animationScope.current = createScope({
      root: mapPageRef.current
    }).add(self => {
      // Entry animation for the page
      if (mapPageRef.current) {
        animate(mapPageRef.current, {
          opacity: [0, 1],
          duration: 1000,
          ease: 'outQuad'
        });
      }
      
      // Add animations for UI controls with stagger
      const controls = document.querySelectorAll('.map-control');
      if (controls.length > 0) {
        animate(controls, {
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 600,
          delay: function(el, i) { return i * 100 + 800; }, // Manual stagger
          ease: 'outBack'
        });
      }
    });
    
    // Initialize Supabase
    const supabase = getSupabaseBrowserClient();
    if (!supabase && typeof window !== 'undefined') {
      setError('Unable to initialize Supabase client');
      setIsLoading(false);
      return;
    }
    
    // Skip initial fetch in server-side rendering
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // Fetch activity data
    const fetchMapActivities = async () => {
      try {
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }
        
        const { data, error } = await supabase
          .from('ecotrack')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        if (!data || data.length === 0) {
          console.warn('No data returned from Supabase');
          setActivities([]);
          setMappedActivities([]);
          setIsLoading(false);
          return;
        }
        
        // Transform data for map component
        const transformedData = data.map(item => ({
          id: item.id,
          lat: item.latitude || 0,
          lng: item.longitude || 0,
          country: item.country,
          adress: item.city ? `${item.city}, ${item.country || ''}` : '',
          type: item.type,
          title: item.title,
          responsible: item.responsible || 'System',
          photos: item.photos,
          description: item.description
        }));

        // Filter out invalid activities (those without lat/lng)
        const validActivities = transformedData.filter(a => 
          a.lat !== undefined && a.lat !== null && 
          a.lng !== undefined && a.lng !== null
        );

        setActivities(data);
        setMappedActivities(validActivities);
        
        // Cache the data in localStorage for offline usage
        try {
          localStorage.setItem('map_activities', JSON.stringify(data));
          localStorage.setItem('map_activities_timestamp', Date.now().toString());
        } catch (e) {
          console.warn('Failed to cache data in localStorage:', e);
        }
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(`Failed to load activities: ${err instanceof Error ? err.message : String(err)}`);
        
        // Try to load from localStorage as a degraded mode
        try {
          const cachedData = localStorage.getItem('map_activities');
          if (cachedData) {
            console.log('Using cached map activities from localStorage');
            const data = JSON.parse(cachedData);
            
            const transformedData = data.map((item: any) => ({
              id: item.id,
              lat: item.latitude || 0,
              lng: item.longitude || 0,
              country: item.country,
              adress: item.city ? `${item.city}, ${item.country || ''}` : '',
              type: item.type,
              title: item.title,
              responsible: item.responsible || 'System',
              photos: item.photos,
              description: item.description
            }));
            
            const validActivities = transformedData.filter((a: any) => 
              a.lat !== undefined && a.lat !== null && 
              a.lng !== undefined && a.lng !== null
            );
            
            setActivities(data);
            setMappedActivities(validActivities);
          }
        } catch (cacheErr) {
          console.error('Failed to load cached data:', cacheErr);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapActivities();
    
    // Set up Stadia Maps API key
    useEffect(() => {
      // Try to get the API key from environment variables
      const stadiaApiKey = process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY || null
      setApiKey(stadiaApiKey)
      
      if (!stadiaApiKey && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn("No Stadia Maps API key provided. Using domain-based authentication if configured or rate-limited access.")
      }
    }, [])
    
    // Proper cleanup
    return () => {
      if (animationScope.current) {
        animationScope.current.revert();
      }
    };
  }, []);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible)
  }
  
  // Handle clicking an activity in the sidebar
  const handleActivityClick = (id: string, lat: number, lng: number) => {
    setSelectedActivity(id)
    setIsSidebarVisible(false)
  }
  
  // Get color for activity type
  const getTypeColor = (type: string) => {
    switch (type) {
      case "reforestation": return "bg-green-500"
      case "clean-up": return "bg-blue-500"
      case "education": return "bg-amber-500"
      case "conservation": return "bg-emerald-500"
      case "renewable": return "bg-cyan-500"
      default: return "bg-purple-500"
    }
  }

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-black"
      ref={mapPageRef}
    >
      {/* Filter notice */}
      <AnimatePresence>
        {showFilterNotice && (
          <motion.div 
            className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 bg-black/80 backdrop-blur-sm border border-amber-500/30 rounded-lg px-4 py-2 text-amber-300 text-xs shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center">
              <Filter className="h-3 w-3 mr-1.5" />
              <span>{filteredCount} activities are not shown due to missing location data</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Map container */}
      <div className="w-full h-full absolute inset-0 overflow-hidden">
        <MapClient 
          activities={mappedActivities}
          stadiaApiKey={apiKey}
          initialSelectedActivity={selectedActivity}
        />
      </div>
      
      {/* Map controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="map-control h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm border-white/20 text-white hover:bg-black/70"
          onClick={toggleSidebar}
        >
          <Layers className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Sidebar */}
      <MapSidebar 
        isVisible={isSidebarVisible} 
        onToggle={toggleSidebar} 
        activities={mappedActivities}
        onActivityClick={handleActivityClick}
      />
      
      {/* Attribution */}
      <div className="absolute bottom-2 right-2 z-10 text-xs text-white/50 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
        <span>Powered by EcoTrack + Stamen Maps + OpenStreetMap</span>
      </div>
    </div>
  )
}

// Use Suspense boundary for the component that uses useSearchParams
export default function MapPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MapPageContent />
    </Suspense>
  )
} 