"use client"

import { useEffect, useState } from "react"
import dynamic from 'next/dynamic'
import type { Activity } from "@/types/supabase"
import { getSupabaseBrowserClient } from "@/lib/supabaseClient"
import { convertToMapActivity } from "@/lib/utils"

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
  const [activities, setActivities] = useState<ReturnType<typeof convertToMapActivity>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Skip in SSR
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    const fetchActivities = async () => {
      try {
        setLoading(true)
        // Fetch from Supabase instead of using mock data
        console.log('Fetching activities from Supabase in MapTestPage...');
        
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }

        const { data, error: supabaseError } = await supabase
          .from('ecotrack')
          .select('*')
         
        if (supabaseError) {
          console.error('Supabase error:', supabaseError);
          throw supabaseError;
        }
          
        if (!data || data.length === 0) {
          const noDataError = 'No activities found in the database.';
          console.error(noDataError);
          setError(noDataError);
          setLoading(false);
          return;
        }
        
        console.log(`Fetched ${data.length} activities from Supabase`);
        setActivities(data.map(convertToMapActivity));
        
        // Cache data in localStorage
        try {
          localStorage.setItem('maptest_activities', JSON.stringify(data));
          localStorage.setItem('maptest_timestamp', Date.now().toString());
        } catch (e) {
          console.warn('Failed to cache maptest data:', e);
        }
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Try to load from localStorage as a fallback
        try {
          const cachedData = localStorage.getItem('maptest_activities');
          if (cachedData) {
            console.log('Using cached maptest activities');
            const data = JSON.parse(cachedData);
            setActivities(data.map(convertToMapActivity));
          }
        } catch (cacheErr) {
          console.error('Failed to load cached maptest data:', cacheErr);
        }
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