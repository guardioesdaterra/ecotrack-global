import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Activity } from "@/types/supabase"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertToMapActivity(activity: Activity): {
  id: string
  lat: number
  lng: number
  country?: string
  city?: string
  address?: string
  type: string
  title: string
  responsible?: string
  description?: string
  photos?: string | null
  created_at?: string
} {
  // Parse photos string into array if it exists and then convert back to string if needed
  let parsedPhotos: string | null = null;
  if (activity.photos) {
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(activity.photos);
      
      if (Array.isArray(parsed)) {
        // Convert array back to string for compatibility
        parsedPhotos = JSON.stringify(parsed);
      } else if (typeof parsed === 'string') {
        // It's already a string inside JSON
        parsedPhotos = parsed;
      } else {
        // Use the original string
        parsedPhotos = activity.photos;
      }
    } catch (e) {
      // If parsing fails, use the original string
      parsedPhotos = activity.photos;
    }
  }

  return {
    id: activity.id,
    lat: activity.latitude || 0,
    lng: activity.longitude || 0,
    country: activity.country || undefined,
    city: activity.city || undefined,
    address: activity.street || undefined,
    type: activity.type,
    title: activity.title,
    responsible: activity.user_id || 'System',
    description: activity.description || undefined,
    photos: parsedPhotos,
    created_at: activity.created_at || undefined
  }
}
