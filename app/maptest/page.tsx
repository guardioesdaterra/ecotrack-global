"use client"

import { useEffect, useState } from "react"
import dynamic from 'next/dynamic'
import { Activity } from "@/components/map-component"
import { supabase } from "@/lib/supabaseClient"

// Dynamically import with no SSR
const MapClientNoSSR = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="h-16 w-16 rounded-full bg-cyan-500 animate-pulse shadow-lg"></div>
    </div>
  )
})

export default function MapTestPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true)
        // Fetch from Supabase instead of using mock data
        console.log('Fetching activities from Supabase in MapTestPage...');
        const { data, error: supabaseError } = await supabase
          .from('activities')
          .select('*')
        
        if (supabaseError) {
          console.error('Supabase error:', supabaseError);
          throw supabaseError;
        }
          
        if (!data || data.length === 0) {
          const noDataError = 'No activities found. Please run the seed script first.';
          console.error(noDataError);
          setError(noDataError);
          setLoading(false);
          return;
        }
        
        console.log(`Fetched ${data.length} activities from Supabase`);
        setActivities(data as Activity[]);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-cyan-500 animate-pulse shadow-lg"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return <MapClientNoSSR activities={activities} />
}