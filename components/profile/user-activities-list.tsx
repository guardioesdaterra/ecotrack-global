import React, { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Globe, Pencil, Camera } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

// Define Activity interface
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

interface UserActivitiesListProps {
  activities: Activity[]
  showOverlay: (type: string, activityId?: string) => void
}

// Memoized functional component to prevent unnecessary re-renders
const UserActivitiesList = memo(function UserActivitiesList({
  activities,
  showOverlay
}: UserActivitiesListProps) {
  return (
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
            <div className="flex items-center justify-between mb-4">
              <span className="bg-cyan-900/30 text-cyan-300 text-xs px-2 py-1 rounded">
                {activity.type}
              </span>
              {activity.photos && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Camera className="h-3.5 w-3.5 flex-shrink-0 text-purple-400" />
                  <span>{getPhotoCount(activity.photos)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => showOverlay('edit', activity.id)}
                  className="h-8 text-xs border-amber-900/50 text-amber-400 hover:bg-amber-900/30"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})

// Helper function for photo count
function getPhotoCount(photoString?: string): string {
  if (!photoString) return "0 photos"
  
  try {
    const photos = JSON.parse(photoString)
    if (!Array.isArray(photos)) return "0 photos"
    return `${photos.length} photo${photos.length !== 1 ? 's' : ''}`
  } catch {
    return "0 photos"
  }
}

export default UserActivitiesList 