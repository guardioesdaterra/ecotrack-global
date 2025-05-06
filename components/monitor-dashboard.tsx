"use client"

import { useState, useEffect, ReactNode, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, ArrowLeft, BarChart3, Clock, Globe, Leaf, PlusCircle, X, AlertCircle, Pencil, MapPin, Camera } from "lucide-react"
import { useOverlay } from "@/contexts/overlay-context"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import gsap from "gsap"

interface UserActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  country: string;
  adress?: string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  responsible?: string;
  created_at: string;
  user_id?: string;
  city?: string;
  photos?: string;
}

interface ImpactCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  unit?: string;
  description: string;
  color: string;
}

const ImpactCard = ({ title, value, icon, unit, description, color }: ImpactCardProps) => (
  <motion.div 
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="bg-black/50 rounded-lg border border-cyan-900/30 p-4 overflow-visible"
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs text-gray-400 mb-1">{title}</div>
        <div className="flex items-baseline gap-1">
          <motion.span 
            className="text-2xl font-bold text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {value.toLocaleString()}
          </motion.span>
          {unit && <span className="text-xs text-gray-400">{unit}</span>}
        </div>
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      </div>
      
      <motion.div 
        className={`p-2 rounded-full ${color.replace('bg-', 'bg-')}/20`}
        whileHover={{ rotate: 15, scale: 1.1 }}
        animate={{ 
          boxShadow: ['0 0 0px rgba(0,0,0,0)', '0 0 10px ' + color.replace('bg-', 'rgba(') + ',0.3)', '0 0 0px rgba(0,0,0,0)'] 
        }}
        transition={{ 
          boxShadow: { duration: 2, repeat: Infinity },
          rotate: { duration: 0.2 }
        }}
      >
        {icon}
      </motion.div>
    </div>
    
    <div className="mt-1 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
      <motion.div 
        className={`h-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ duration: 1, delay: 0.3 }}
      />
    </div>
  </motion.div>
)

function getActivityIcon(type: string) {
  switch (type) {
    case "reforestation":
      return <Leaf className="h-4 w-4 text-green-400" />;
    case "clean-up":
      return <Activity className="h-4 w-4 text-blue-400" />;
    case "education":
      return <Globe className="h-4 w-4 text-amber-400" />;
    default:
      return <Leaf className="h-4 w-4 text-cyan-400" />;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case "reforestation":
      return "bg-green-500";
    case "clean-up":
      return "bg-blue-500";
    case "education":
      return "bg-amber-500";
    default:
      return "bg-cyan-500";
  }
}

interface EmptyStateProps {
  onAddActivity: () => void;
}

function EmptyState({ onAddActivity }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/40 border border-cyan-900/30 rounded-lg p-8 text-center shadow-[0_0_20px_rgba(6,182,212,0.1)]"
    >
      <motion.div 
        className="mx-auto w-16 h-16 rounded-full bg-cyan-900/20 flex items-center justify-center mb-4"
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        >
          <Activity className="h-8 w-8 text-cyan-400" />
        </motion.div>
      </motion.div>
      
      <motion.h3 
        className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2"
        animate={{ 
          textShadow: ['0 0 5px rgba(6,182,212,0.3)', '0 0 15px rgba(168,85,247,0.5)', '0 0 5px rgba(6,182,212,0.3)']
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        No Activities Yet
      </motion.h3>
      
      <p className="text-gray-300 mb-6 max-w-md mx-auto">
        Start tracking your environmental impact by adding your first activity.
      </p>
      
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <Button 
          onClick={onAddActivity}
          className="bg-gradient-to-r from-cyan-900/50 to-purple-900/50 hover:from-cyan-800/50 hover:to-purple-800/50 text-cyan-300 border border-cyan-900/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-300 group"
        >
          <motion.div
            initial={{ rotate: 0 }}
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.3 }}
          >
            <PlusCircle className="mr-2 h-4 w-4 group-hover:text-white transition-colors" />
          </motion.div>
          Add Your First Activity
        </Button>
      </motion.div>
    </motion.div>
  )
}

export default function MonitorDashboard() {
  const { hideOverlay, showOverlay, overlayType } = useOverlay()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("activities")
  const [userActivities, setUserActivities] = useState<UserActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  
  // Refs for GSAP animations
  const headerRef = useRef(null)
  const tabsRef = useRef(null)
  const cardsRef = useRef(null)
  
  // Refresh activities when overlay closes after edit/submit
  useEffect(() => {
    if (!overlayType && user) {
      fetchUserActivities()
    }
  }, [overlayType, user])
  
  useEffect(() => {
    if (user) {
      fetchUserActivities()
    }
    
    // GSAP animations
    const tl = gsap.timeline()
    
    // Header animations
    tl.fromTo(
      headerRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    )
    
    // Tabs animations
    tl.fromTo(
      tabsRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      "-=0.3"
    )
    
    // Cards staggered animations
    tl.fromTo(
      ".activity-card",
      { opacity: 0, y: 30, scale: 0.95 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        stagger: 0.1,
        duration: 0.6, 
        ease: "power3.out"
      },
      "-=0.2"
    )
    
    // Hover animations for cards
    gsap.utils.toArray(".activity-card").forEach((card: any) => {
      card.addEventListener("mouseenter", () => {
        gsap.to(card, { 
          y: -5, 
          boxShadow: "0 10px 30px -10px rgba(6,182,212,0.2)",
          duration: 0.3,
          ease: "power2.out"
        })
        
        // Animate edit button
        const editBtn = card.querySelector(".edit-button")
        if (editBtn) {
          gsap.to(editBtn, {
            scale: 1.1,
            boxShadow: "0 0 15px rgba(251,189,35,0.3)",
            duration: 0.3
          })
        }
      })
      
      card.addEventListener("mouseleave", () => {
        gsap.to(card, { 
          y: 0, 
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          duration: 0.3,
          ease: "power2.out"
        })
        
        // Reset edit button
        const editBtn = card.querySelector(".edit-button")
        if (editBtn) {
          gsap.to(editBtn, {
            scale: 1,
            boxShadow: "none",
            duration: 0.3
          })
        }
      })
    })
    
    return () => {
      // Cleanup GSAP animations
      tl.kill()
      gsap.killTweensOf(".activity-card")
    }
  }, [user])
  
  const fetchUserActivities = async () => {
    if (!user || !supabase) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('ecotrack')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message)
      }
      
      if (!data) {
        setUserActivities([])
        return
      }
      
      console.log("Fetched user activities:", data.length)
      setUserActivities(data || [])
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError('Failed to load your activities. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleAddActivity = () => {
    hideOverlay()
    setTimeout(() => {
      showOverlay('submit')
    }, 300)
  }

  const handleEditActivity = (activityId: string) => {
    // Set the selected activity and show a brief highlight effect
    setSelectedActivity(activityId)
    
    // Highlight animation for selected card
    const selectedCard = document.querySelector(`[data-activity-id="${activityId}"]`)
    if (selectedCard) {
      gsap.to(selectedCard, {
        backgroundColor: "rgba(251,189,35,0.1)",
        borderColor: "rgba(251,189,35,0.5)",
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          // Open edit overlay after brief animation
          showOverlay('edit', activityId)
        }
      })
    } else {
      showOverlay('edit', activityId)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date"
    
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date)
    } catch (e) {
      return "Invalid date"
    }
  }

  const getPhotoCount = (photoString?: string): string => {
    if (!photoString) return "0 photos"
    
    try {
      const photos = JSON.parse(photoString)
      if (!Array.isArray(photos)) return "0 photos"
      return `${photos.length} photo${photos.length !== 1 ? 's' : ''}`
    } catch (e) {
      return "0 photos"
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-20 pb-16">
      <div ref={headerRef} className="flex justify-between items-center mb-8 animate-on-scroll">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
            Activity Dashboard
          </h1>
          <p className="text-gray-400">
            Track and monitor your environmental initiatives
          </p>
        </div>
        <Button
          onClick={() => {
            hideOverlay();
            window.location.href = '/';
          }}
          className="relative group overflow-visible bg-gradient-to-r from-cyan-950/60 to-purple-950/60 hover:from-cyan-900/60 hover:to-purple-900/60 text-cyan-400 border border-cyan-700/50 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:text-cyan-300"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 blur-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <motion.div
            initial={{ rotate: 0 }}
            whileHover={{ rotate: -10 }}
            transition={{ duration: 0.2 }}
            className="mr-2 h-4 w-4"
          >
            <ArrowLeft />
          </motion.div>
          Return to Map
        </Button>
      </div>

      <Tabs ref={tabsRef} defaultValue="activities" className="mb-6 animate-on-scroll">
        <TabsList className="bg-black/60 border border-cyan-900/30 p-1 rounded-full">
          <TabsTrigger 
            value="activities" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-900/40 data-[state=active]:to-purple-900/40 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_10px_rgba(6,182,212,0.25)] rounded-full transition-all duration-300"
          >
            My Activities
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="activities" className="mt-6">
          {isLoading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-xl"></div>
                <div className="h-16 w-16 rounded-full border-4 border-t-transparent border-cyan-500/50 animate-spin shadow-[0_0_15px_rgba(6,182,212,0.3)]"></div>
              </div>
              <p className="mt-6 text-cyan-400/80 text-sm animate-pulse">Loading your activities...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-black/40 border border-red-900/30 rounded-lg text-center shadow-[0_0_20px_rgba(220,38,38,0.1)] animate-on-scroll"
            >
              <div className="bg-red-900/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Error Loading Activities</h3>
              <p className="text-gray-300 mb-4 max-w-md mx-auto">{error}</p>
              <Button 
                onClick={() => fetchUserActivities()}
                size="sm"
                className="bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 transition-colors duration-300"
              >
                Try Again
              </Button>
            </motion.div>
          ) : userActivities.length === 0 ? (
            <EmptyState onAddActivity={handleAddActivity} />
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
              ref={cardsRef}
            >
              <div className="flex justify-between items-center mb-4 animate-on-scroll">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-cyan-300">
                    {userActivities.length} {userActivities.length === 1 ? 'Activity' : 'Activities'}
                  </h3>
                  <div className="ml-4 flex space-x-2">
                    <motion.div 
                      className="h-2 w-2 rounded-full bg-cyan-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    />
                    <motion.div 
                      className="h-2 w-2 rounded-full bg-purple-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeInOut" }}
                    />
                    <motion.div 
                      className="h-2 w-2 rounded-full bg-blue-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 1, ease: "easeInOut" }}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddActivity}
                  size="sm"
                  className="bg-black/60 border border-cyan-900/40 hover:bg-cyan-900/20 text-cyan-400 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.15)] overflow-visible group"
                >
                  <motion.div
                    initial={{ rotate: 0 }}
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5 group-hover:text-cyan-300 transition-colors" />
                  </motion.div>
                  Add Activity
                </Button>
              </div>
              
              {/* Impact stats cards - shown at the top instead of in a separate tab */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 animate-on-scroll"
              >
                <ImpactCard 
                  title="Total Activities" 
                  value={userActivities.length} 
                  icon={<Leaf className="h-4 w-4" />}
                  description="Your initiatives" 
                  color="bg-cyan-500"
                />
                <ImpactCard 
                  title="Countries" 
                  value={new Set(userActivities.map(a => a.country).filter(Boolean)).size} 
                  icon={<Globe className="h-4 w-4" />}
                  description="Locations" 
                  color="bg-purple-500"
                />
                <ImpactCard
                  title="Photos"
                  value={userActivities.filter(a => a.photos).length}
                  icon={<Camera className="h-4 w-4" />}
                  description="With photos"
                  color="bg-green-500"
                />
                <ImpactCard
                  title="Locations"
                  value={new Set(userActivities.map(a => a.country).filter(Boolean)).size}
                  icon={<MapPin className="h-4 w-4" />}
                  description="Unique countries"
                  color="bg-amber-500"
                />
              </motion.div>
              
              <div className="grid gap-4">
                {userActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    data-activity-id={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.5 }}
                    whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                    className="activity-card animate-on-scroll"
                  >
                    <Card className="bg-black/50 border-cyan-900/30 overflow-visible hover:border-cyan-900/50 hover:bg-black/70 transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.2)] relative">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${getActivityColor(activity.type)}`}></div>
                      <motion.div 
                        className="absolute -right-2 -top-2 h-4 w-4 rounded-full opacity-70"
                        style={{ background: getActivityColor(activity.type).replace('bg-', '') }}
                        animate={{ 
                          boxShadow: ['0 0 0px rgba(6,182,212,0)', '0 0 10px rgba(6,182,212,0.5)', '0 0 0px rgba(6,182,212,0)'] 
                        }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                      />
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <motion.div 
                                whileHover={{ rotate: 15, scale: 1.1 }} 
                                transition={{ duration: 0.2 }}
                                className={`p-1.5 rounded-full ${activity.type === 'reforestation' ? 'bg-green-900/20' : activity.type === 'clean-up' ? 'bg-blue-900/20' : 'bg-amber-900/20'}`}
                              >
                                {getActivityIcon(activity.type)}
                              </motion.div>
                              <CardTitle className="text-base text-white">{activity.title || 'Untitled Activity'}</CardTitle>
                            </div>
                            <CardDescription className="text-gray-400 mt-1">
                              {formatDate(activity.created_at)} • {activity.country || 'Unknown location'}
                            </CardDescription>
                          </div>
                          
                          {/* Enhanced Edit Button - Beautiful Animation */}
                          <div className="flex justify-end mt-4 gap-2">
                            <motion.button 
                              onClick={() => handleEditActivity(activity.id)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="edit-button relative group"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative flex items-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-amber-950/80 to-amber-900/80 hover:from-amber-900/80 hover:to-amber-800/80 rounded-full border border-amber-700/50 text-amber-400 text-xs transition-all duration-300 overflow-hidden shadow-[0_0_8px_rgba(251,191,36,0.1)] hover:shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                                <Pencil className="h-3 w-3" />
                                <span className="font-medium">Edit</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000"></div>
                              </div>
                            </motion.button>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              asChild 
                              className="h-8 w-8 text-gray-400 hover:text-cyan-400 hover:bg-cyan-900/20 rounded-full transition-colors duration-300 overflow-visible"
                            >
                            <Link href={`/?activity=${activity.id}`}>
                              <motion.div whileHover={{ rotate: 15 }} transition={{ duration: 0.2 }}>
                                <Globe className="h-4 w-4" />
                              </motion.div>
                            </Link>
                          </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-300 line-clamp-2">{activity.description || 'No description provided'}</p>
                        
                        {/* Meta information */}
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400" />
                            <span>
                              {activity.city && activity.country ? `${activity.city}, ${activity.country}` : 
                               activity.country ? activity.country :
                               activity.latitude !== undefined && activity.latitude !== null && activity.longitude !== undefined && activity.longitude !== null ? 
                                 `${activity.latitude.toFixed(4)}, ${activity.longitude.toFixed(4)}` :
                               activity.lat !== undefined && activity.lat !== null && activity.lng !== undefined && activity.lng !== null ? 
                                 `${activity.lat.toFixed(4)}, ${activity.lng.toFixed(4)}` :
                               'No location data'}
                            </span>
                          </div>
                          {activity.photos && (
                            <div className="flex items-center gap-1">
                              <Camera className="h-3.5 w-3.5 flex-shrink-0 text-purple-400" />
                              <span>{getPhotoCount(activity.photos)}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Dynamic blob background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-cyan-500/5 rounded-full filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-1/3 -right-20 w-72 h-72 bg-purple-500/5 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>
    </div>
  )
} 