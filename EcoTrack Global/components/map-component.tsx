"use client"

// Define the standard Activity interface used across all components
export interface Activity {
  id: number
  lat: number
  lng: number
  country?: string
  adress?: string
  type: string
  title: string
  responsible?: string
  photos?: string[]
  direct_benefited?: number
  indirect_benefited?: number
  description?: string
}

export interface MapComponentProps {
  activities: Activity[]
}

// Utility function to get color based on activity type
export function getActivityColor(type: string) {
  switch (type) {
    case "reforestation":
      return "#00fff7"
    case "clean-up":
      return "#ff00ea"
    case "education":
      return "#ffe600"
    case "conservation":
      return "#00ff85"
    case "renewable":
      return "#64ff00"
    default:
      return "#ff007a"
  }
}

// This file now just exports the Activity type
// The actual map is imported directly in the page file
