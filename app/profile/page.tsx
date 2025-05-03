"use client"

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getUserActivities } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, List, Activity, Globe, Mail, ExternalLink, AlertTriangle, Pencil, Camera } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useOverlay } from "@/contexts/overlay-context"
import dynamic from "next/dynamic"

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
  photos?: string
}

// Lazy-loaded components for better initial load performance
const UserActivitiesList = dynamic(
  () => import("@/components/profile/user-activities-list").then(mod => mod.default), 
  { 
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(3).fill(0).map((_, index) => (
          <Card 
            key={index} 
            className="bg-gray-900/40 border-cyan-900/30 backdrop-blur-sm animate-pulse overflow-hidden"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="w-32 h-5 rounded bg-gray-800"></div>
                <div className="w-12 h-3 rounded bg-gray-800"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full h-10 mb-4 rounded bg-gray-800"></div>
              <div className="flex justify-between mb-4">
                <div className="w-16 h-5 rounded bg-gray-800"></div>
                <div className="w-8 h-5 rounded bg-gray-800"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
)

export default function ProfilePage() {
  const { user, isLoading, signOut } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const router = useRouter()
  const { showOverlay } = useOverlay()
  
  // Memoized fetch function to avoid recreation on renders
  const fetchActivities = useCallback(async (userId: string) => {
    setIsLoadingActivities(true)
    try {
      const { data, error } = await getUserActivities(userId)
      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setIsLoadingActivities(false)
    }
  }, [])
  
  // Auth check and data loading
  useEffect(() => {
    // Redirect if not logged in
    if (!isLoading && !user) {
      router.push("/")
      return
    }
    
    // Fetch user activities if logged in
    if (user?.id) {
      fetchActivities(user.id)
    }
  }, [user, isLoading, router, fetchActivities])
  
  // Loading state
  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center items-center min-h-screen">
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse"></div>
      </div>
    )
  }
  
  // Not logged in state
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
  
  // User profile name and initials - memoized 
  const userName = useMemo(() => 
    user.user_metadata?.full_name || "EcoTrack User", 
    [user.user_metadata?.full_name]
  )
  
  const userInitials = useMemo(() => 
    getInitials(user.user_metadata?.full_name || user.email || "User"),
    [user.user_metadata?.full_name, user.email]
  )
  
  return (
    <div className="container py-20 px-4">
      {/* Profile Header */}
      <Card className="bg-gray-900/50 border-cyan-900/50 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)] mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 border-2 border-cyan-500">
              <AvatarImage 
                src={user.user_metadata?.avatar_url || ""}
                alt={userName}
              />
              <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xl">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {userName}
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
      
      {/* Activities - with optimized rendering */}
      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
        Your Activities
      </h2>
      
      <Suspense fallback={
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse"></div>
        </div>
      }>
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
          // Dynamically imported component for better code splitting
          <UserActivitiesList 
            activities={activities} 
            showOverlay={showOverlay} 
          />
        )}
      </Suspense>
    </div>
  )
}

// Helper functions moved out of render cycle
function formatDate(dateString?: string): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  
  // Use built-in formatting for better performance
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getPhotoCount(photoString?: string): string {
  if (!photoString) return "0";
  try {
    const photos = JSON.parse(photoString);
    if (Array.isArray(photos)) {
      return photos.length.toString();
    }
    return "0";
  } catch {
    return "0";
  }
} 