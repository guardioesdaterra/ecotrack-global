import type { Activity } from "@/types/supabase"

/**
 * Converts Supabase Activity type to a format suitable for map display
 */
export function convertToMapActivity(activity: Activity): {
  id: string
  lat: number
  lng: number
  country?: string
  city?: string
  type: string
  title: string
  responsible?: string
  description?: string
  photos?: string | null
  created_at?: string
} {
  return {
    id: activity.id,
    lat: activity.latitude || 0,
    lng: activity.longitude || 0,
    country: activity.country || undefined,
    city: activity.city || undefined,
    type: activity.type,
    title: activity.title,
    responsible: activity.user_id || 'System',
    description: activity.description || undefined,
    photos: activity.photos,
    created_at: activity.created_at || undefined
  }
} 