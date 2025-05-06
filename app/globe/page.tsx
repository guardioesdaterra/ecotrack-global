"use client"

import MapClient from "@/components/MapClient"
import { useEffect, useState } from "react"

export default function GlobePage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  
  // Get the API key from environment or create one
  useEffect(() => {
    // For development, you can use environment variables
    // In production, you'd use domain-based authentication
    setApiKey(process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY || 'your-stadia-maps-api-key')
  }, [])
  
  return (
    <div className="w-full h-screen">
      <MapClient 
        activities={[]}
        stadiaApiKey={apiKey}
      />
    </div>
  )
} 