"use client"

import MapClient from "@/components/MapClient"
import { useEffect, useState } from "react"

export default function GlobePage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  
  // Get the API key from environment or create one
  useEffect(() => {
    // We're using Cooper Hewitt's watercolor maps which don't require an API key
    // Explicitly set to null to choose watercolor maps instead of Stadia Maps
    setApiKey(null)
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