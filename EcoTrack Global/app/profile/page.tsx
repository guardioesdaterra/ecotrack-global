"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getUserActivities } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, List, Activity, Globe, Mail, ExternalLink, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useOverlay } from "@/contexts/overlay-context"

interface Activity {
  id: string
  title: string
  type: string
  description: string
  country: string
  city: string | null
  created_at: string
  latitude: number | null
  longitude: number | null
}

export default function ProfilePage() {
  const { user, isLoading, signOut } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const router = useRouter()
  const { showOverlay } = useOverlay()
  
  useEffect(() => {
    // Redirect if not logged in
    if (!isLoading && !user) {
      router.push("/")
      return
    }
    
    // Fetch user activities if logged in
    if (user?.id) {
      const fetchActivities = async () => {
        setIsLoadingActivities(true)
        try {
          const { data, error } = await getUserActivities(user.id)
          if (error) throw error
          setActivities(data || [])
        } catch (error) {
          console.error("Error fetching activities:", error)
        } finally {
          setIsLoadingActivities(false)
        }
      }
      
      fetchActivities()
    }
  }, [user, isLoading, router])
  
  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center items-center min-h-screen">
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse"></div>
      </div>
    )
  }
  
  if (!user) {
    return (
      <div className="container py-20 flex justify-center items-center min-h-screen">
        <Card className="bg-gray-900/50 border-cyan-900/50 backdrop-blur-sm max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-xl text-cyan-400">Not Logged In</CardTitle>
            <CardDescription className="text-gray-400">
              Please log in to view your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6 space-y-6">
            <AlertTriangle className="h-16 w-16 text-amber-400" />
            <p className="text-center text-gray-300">
              You need to be logged in to view your profile and activities.
            </p>
            <Button 
              asChild 
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container py-20 px-4">
      {/* Profile Header */}
      <Card className="bg-gray-900/50 border-cyan-900/50 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)] mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 border-2 border-cyan-500">
              <AvatarImage 
                src={user.user_metadata?.avatar_url || ""}
                alt={user.user_metadata?.full_name || "User"}
              />
              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xl">
                {getInitials(user.user_metadata?.full_name || user.email || "User")}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {user.user_metadata?.full_name || "EcoTrack User"}
                </h1>
                <p className="text-cyan-400 flex items-center justify-center md:justify-start gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <div className="bg-gray-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span>{activities.length} Activities</span>
                </div>
                <div className="bg-gray-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <span>Joined {formatDate(user.created_at)}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Button 
                  variant="outline" 
                  className="border-cyan-500 text-cyan-400 hover:bg-cyan-900/30"
                  onClick={() => showOverlay('submit')}
                >
                  Submit New Activity
                </Button>
                <Button 
                  variant="outline" 
                  onClick={signOut}
                  className="border-red-500 text-red-400 hover:bg-red-900/30"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Activities */}
      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
        Your Activities
      </h2>
      
      {isLoadingActivities ? (
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse"></div>
        </div>
      ) : activities.length === 0 ? (
        <Card className="bg-gray-900/30 border-cyan-900/30 backdrop-blur-sm p-6 text-center">
          <div className="py-12 flex flex-col items-center">
            <List className="h-16 w-16 text-gray-500 mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">No Activities Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              You haven't submitted any environmental activities yet. Start tracking your impact by adding your first activity.
            </p>
            <Button 
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
              onClick={() => showOverlay('submit')}
            >
              Submit Activity
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <Card 
              key={activity.id} 
              className="bg-gray-900/40 hover:bg-gray-900/60 border-cyan-900/30 hover:border-cyan-800/50 backdrop-blur-sm transition-all duration-300 overflow-hidden"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">{activity.title}</CardTitle>
                    <CardDescription className="text-cyan-400 flex items-center gap-1.5 mt-1">
                      <Globe className="h-3.5 w-3.5" />
                      {activity.city ? `${activity.city}, ${activity.country}` : activity.country}
                    </CardDescription>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                  {activity.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="bg-cyan-900/30 text-cyan-300 text-xs px-2 py-1 rounded">
                    {activity.type}
                  </span>
                  {activity.latitude && activity.longitude && (
                    <Button 
                      asChild
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-xs border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/30"
                    >
                      <Link 
                        href={`/monitor?lat=${activity.latitude}&lng=${activity.longitude}&id=${activity.id}`} 
                        className="flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        View on Map
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper functions
function formatDate(dateString?: string): string {
  if (!dateString) return "Recently"
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function getInitials(name: string): string {
  // For email addresses, just use the first letter
  if (name.includes('@')) {
    return name.charAt(0).toUpperCase()
  }
  
  // For names, get first letter of each word
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
} 