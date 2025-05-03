"use client"

import React, { useEffect, useRef, useState } from "react"
import { animate, createScope, createSpring } from "animejs"
import { ArrowRight, Calendar, BarChart3, Globe, Leaf, MapPin, Plus, Shield, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"
import { useRouter } from "next/navigation"
import { useOverlay } from "@/contexts/overlay-context"
import { useAuth } from "@/contexts/auth-context"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"

interface UserActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  country: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  user_id?: string;
  city?: string;
  photos?: string;
  direct_benefited?: number;
  indirect_benefited?: number;
  email?: string;
  street?: string;
  hyperlink?: string;
}

interface StatsType {
  totalActivities: number;
  countries: number;
  recentActivity: string;
  totalBeneficiaries: number;
}

export default function MonitorPage() {
  const supabase = createClientComponentClient<Database>()
  const { user } = useAuth() 
  const { showOverlay } = useOverlay()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [stats, setStats] = useState<StatsType>({ 
    totalActivities: 0,
    countries: 0,
    recentActivity: '—',
    totalBeneficiaries: 0
  })
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  
  const router = useRouter()
  
  // Refs for animation targets
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const statsGridRef = useRef<HTMLDivElement>(null)
  const activitiesRef = useRef<HTMLDivElement>(null)
  const animationScope = useRef<any>(null)

  // Filter activities based on active filter and search term
  const filteredActivities = activities
    .filter(activity => !activeFilter || activity.type === activeFilter)
    .filter(activity => 
      !searchTerm || 
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.country.toLowerCase().includes(searchTerm.toLowerCase())
    )

  useEffect(() => {
    // Fetch activities
    fetchActivities()
    
    // Initialize animations with anime.js v4 createScope pattern
    if (!pageContainerRef.current) return;
    
    animationScope.current = createScope({
      root: pageContainerRef.current
    }).add(self => {
      // Header animation
      if (headerRef.current) {
        animate(headerRef.current, {
          opacity: [0, 1],
          translateY: [-20, 0],
          duration: 1000,
          ease: 'outExpo'
        });
      }
      
      // Stats grid animation
      if (statsGridRef.current) {
        const statItems = statsGridRef.current.querySelectorAll('.stat-item');
        animate(statItems, {
          opacity: [0, 1],
          translateY: [20, 0],
          scale: [0.9, 1],
          delay: function(el, i) { return i * 120; },
          duration: 800,
          ease: 'outExpo'
        });
      }
      
      // Activity cards animation
      if (activitiesRef.current) {
        const cards = activitiesRef.current.querySelectorAll('.activity-card');
        animate(cards, {
          opacity: [0, 1],
          translateY: [30, 0],
          delay: function(el, i) { return 500 + i * 80; },
          duration: 800,
          ease: createSpring({ stiffness: 80, damping: 10 })
        });
      }
      
      // Floating animation for glow elements
      if (glowRef.current) {
        animate(glowRef.current, {
          translateY: [-15, 15],
          translateX: [-15, 15],
          duration: 8000,
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine'
        });
      }
      
      // Animate stat numbers
      const statNumbers = document.querySelectorAll('.stat-number');
      statNumbers.forEach(el => {
        const target = parseInt(el.textContent || '0', 10);
        if (!isNaN(target) && target > 0) {
          let obj = { count: 0 };
          animate(obj, {
            count: target,
            duration: 2000,
            easing: 'easeOutExpo',
            update: function() {
              el.textContent = Math.floor(obj.count).toString();
            }
          });
        }
      });
    });
    
    // Cleanup animations on component unmount
    return () => {
      if (animationScope.current) {
        animationScope.current.revert();
      }
    };
  }, []);
  
  // Animate when filtered activities change
  useEffect(() => {
    if (!activitiesRef.current || isLoading) return;
    
    const cards = activitiesRef.current.querySelectorAll('.activity-card');
    
    animate(cards, {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: function(el, i) { return i * 60; },
      duration: 600,
      ease: 'outQuad'
    });
  }, [filteredActivities, isLoading]);
  
  const fetchActivities = async () => {
    if (!user) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('ecotrack')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw new Error(error.message)

      const activities = data || []
      setActivities(activities)
      
      // Calculate stats
      const uniqueCountries = new Set(activities.map(a => a.country).filter(Boolean))
      const lastActivity = activities[0]?.created_at ? formatDate(activities[0].created_at) : '—'
      const totalBeneficiaries = activities.reduce((sum, activity) => {
        return sum + (activity.direct_benefited || 0) + (activity.indirect_benefited || 0)
      }, 0)
      
      setStats({
        totalActivities: activities.length,
        countries: uniqueCountries.size,
        recentActivity: lastActivity,
        totalBeneficiaries
      })
      
    } catch (err: any) {
      console.error("Error fetching activities:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Helper function to format dates
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date)
    } catch (e) {
      return "Unknown date"
    }
  }
  
  // Get color theme for activity type
  const getActivityTheme = (type: string) => {
    switch (type) {
      case "reforestation":
        return {
          bg: "bg-gradient-to-br from-green-950/40 to-green-900/10",
          border: "border-green-500/20",
          text: "text-green-400",
          icon: <Leaf className="h-4 w-4" />,
          glow: "shadow-[0_0_15px_rgba(34,197,94,0.2)]",
          indicator: "bg-green-500"
        }
      case "clean-up":
        return {
          bg: "bg-gradient-to-br from-blue-950/40 to-blue-900/10",
          border: "border-blue-500/20",
          text: "text-blue-400",
          icon: <Shield className="h-4 w-4" />,
          glow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]",
          indicator: "bg-blue-500"
        }
      case "education":
        return {
          bg: "bg-gradient-to-br from-amber-950/40 to-amber-900/10",
          border: "border-amber-500/20",
          text: "text-amber-400",
          icon: <Globe className="h-4 w-4" />,
          glow: "shadow-[0_0_15px_rgba(251,191,36,0.2)]",
          indicator: "bg-amber-500"
        }
      case "renewable":
        return {
          bg: "bg-gradient-to-br from-purple-950/40 to-purple-900/10",
          border: "border-purple-500/20",
          text: "text-purple-400",
          icon: <Sparkles className="h-4 w-4" />,
          glow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]",
          indicator: "bg-purple-500"
        }
      default:
        return {
          bg: "bg-gradient-to-br from-cyan-950/40 to-cyan-900/10",
          border: "border-cyan-500/20",
          text: "text-cyan-400",
          icon: <Globe className="h-4 w-4" />,
          glow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]",
          indicator: "bg-cyan-500"
        }
    }
  }
  
  // Parse photos from the activity
  const getActivityPhotos = (activity: UserActivity): string[] => {
    if (!activity.photos) return []
    
    try {
      const photos = JSON.parse(activity.photos)
      return Array.isArray(photos) ? photos : []
    } catch (e) {
      console.error("Error parsing photos:", e)
      return []
    }
  }
  
  // Handle viewing activity details
  const handleViewActivity = (id: string) => {
    console.log("View activity triggered with ID:", id)
    if (!id) {
      console.error("No activity ID provided to handleViewActivity")
      return
    }
    
    // Ensure the ID is a string
    const activityId = String(id)
    console.log("Calling showOverlay with activityId:", activityId)
    showOverlay("view", activityId)
  }
  
  return (
    <div ref={pageContainerRef} className="relative min-h-screen flex flex-col">
      {/* Background glow effects */}
      <div ref={glowRef} className="absolute top-1/4 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
      
      {/* Page content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 flex-grow">
        {/* Header section */}
        <div ref={headerRef} className="mb-16">
          <motion.div 
            className="text-center mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 inline-block">
              Environmental Monitor
            </h1>
            
            <div className="mt-3 max-w-2xl mx-auto">
              <p className="text-gray-400">
                Track and visualize your environmental impact across the globe
              </p>
            </div>
          </motion.div>
          
          {/* Add activity button */}
          <motion.div 
            className="mx-auto w-fit mt-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Button
              onClick={() => showOverlay("submit")}
              className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_25px_rgba(8,145,178,0.5)] transition-all duration-300 px-6 py-6 rounded-xl group"
              size="lg"
            >
              <div className="flex items-center">
                <span className="relative flex h-7 w-7 mr-3 rounded-full bg-white/20 items-center justify-center">
                  <Plus className="h-4 w-4 text-white" />
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/30 opacity-75"></span>
                </span>
                <span className="font-semibold">Add New Environmental Activity</span>
              </div>
            </Button>
          </motion.div>
        </div>
        
        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            onClick={() => setActiveFilter(null)}
            variant="outline"
            className={`rounded-full py-1 h-auto text-sm ${!activeFilter ? 'bg-white/10 border-cyan-500/60 text-cyan-400' : 'bg-black/20 border-white/5 text-gray-400 hover:text-white'}`}
          >
            All Activities
          </Button>
          
          <Button
            onClick={() => setActiveFilter("reforestation")}
            variant="outline"
            className={`rounded-full py-1 h-auto text-sm ${activeFilter === "reforestation" ? 'bg-green-950/40 border-green-500/60 text-green-400' : 'bg-black/20 border-white/5 text-gray-400 hover:text-white'}`}
          >
            <Leaf className="h-3 w-3 mr-1.5" />
            Reforestation
          </Button>
          
          <Button
            onClick={() => setActiveFilter("clean-up")}
            variant="outline" 
            className={`rounded-full py-1 h-auto text-sm ${activeFilter === "clean-up" ? 'bg-blue-950/40 border-blue-500/60 text-blue-400' : 'bg-black/20 border-white/5 text-gray-400 hover:text-white'}`}
          >
            <Shield className="h-3 w-3 mr-1.5" />
            Clean-up
          </Button>
          
          <Button
            onClick={() => setActiveFilter("education")}
            variant="outline"
            className={`rounded-full py-1 h-auto text-sm ${activeFilter === "education" ? 'bg-amber-950/40 border-amber-500/60 text-amber-400' : 'bg-black/20 border-white/5 text-gray-400 hover:text-white'}`}
          >
            <Globe className="h-3 w-3 mr-1.5" />
            Education
          </Button>
          
          <Button
            onClick={() => setActiveFilter("renewable")}
            variant="outline"
            className={`rounded-full py-1 h-auto text-sm ${activeFilter === "renewable" ? 'bg-purple-950/40 border-purple-500/60 text-purple-400' : 'bg-black/20 border-white/5 text-gray-400 hover:text-white'}`}
          >
            <Sparkles className="h-3 w-3 mr-1.5" />
            Renewable Energy
          </Button>
        </div>
        
        {/* Activities Grid */}
        <div ref={activitiesRef} className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            {activeFilter ? (
              <span className="capitalize">{activeFilter.replace('-', ' ')} Activities</span>
            ) : (
              "Your Activities"
            )}
            <span className="text-gray-500 text-lg ml-2">({filteredActivities.length})</span>
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 rounded-xl animate-pulse bg-cyan-950/20 border border-cyan-500/10"></div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-12 rounded-xl backdrop-blur-md bg-black/20 border border-white/5 flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-gray-900/70 flex items-center justify-center mb-4">
                {activeFilter ? getActivityTheme(activeFilter).icon : <Globe className="h-8 w-8 text-gray-600" />}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Activities Found</h3>
              <p className="text-gray-400 mb-6 text-center max-w-md">
                {activeFilter 
                  ? `You haven't added any ${activeFilter.replace('-', ' ')} activities yet.`
                  : "You haven't added any environmental activities yet."}
              </p>
              <Button
                onClick={() => showOverlay("submit")}
                className="bg-black/30 border border-cyan-900/30 hover:bg-black/40 text-cyan-400"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredActivities.map((activity) => {
                const theme = getActivityTheme(activity.type);
                const photos = getActivityPhotos(activity);
                
                return (
                  <motion.div
                    key={activity.id}
                    className={`activity-card rounded-xl overflow-hidden backdrop-blur-sm ${theme.bg} ${theme.border} ${theme.glow} transition-all duration-300 hover:translate-y-[-5px] group`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative">
                      {photos.length > 0 ? (
                        <div className="h-48 relative overflow-hidden">
                          <Image
                            src={photos[0]}
                            alt={activity.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                        </div>
                      ) : (
                        <div className={`h-48 ${theme.bg} flex items-center justify-center`}>
                          <div className={`h-24 w-24 rounded-full flex items-center justify-center opacity-30 ${theme.text}`}>
                            {theme.icon}
                          </div>
                        </div>
                      )}
                      
                      {/* Type badge */}
                      <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md flex items-center space-x-1.5 border border-white/10">
                        <span className={`h-2 w-2 rounded-full ${theme.indicator}`}></span>
                        <span className={`text-xs font-medium capitalize ${theme.text}`}>
                          {activity.type.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{activity.title}</h3>
                      
                      <div className="flex items-center text-xs text-gray-400 mb-3">
                        <MapPin className="h-3 w-3 mr-1.5 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {[activity.city, activity.country].filter(Boolean).join(", ") || "Location unavailable"}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-300 line-clamp-2 mb-4">{activity.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {formatDate(activity.created_at)}
                        </div>
                        
                        <Button
                          onClick={() => handleViewActivity(activity.id)}
                          className="bg-black/30 hover:bg-black/50 text-cyan-400 border border-cyan-900/30 h-8 px-3"
                          size="sm"
                        >
                          <span>View Details</span>
                          <ArrowRight className="ml-1.5 h-3 w-3 opacity-70 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* World impact link - Footer positioning fixed */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 mb-12">
          <motion.div
            className="rounded-xl p-8 backdrop-blur-md bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/20 shadow-[0_0_25px_rgba(6,182,212,0.15)] text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-4">
              View Your Global Impact
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto mb-6">
              Explore your environmental activities on an interactive world map and see your global footprint.
            </p>
            <Link href="/map">
              <Button className="bg-gradient-to-r from-cyan-600/80 to-purple-600/80 hover:from-cyan-500/80 hover:to-purple-500/80 text-white px-6 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Globe className="mr-2 h-4 w-4" />
                Open World Map
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}