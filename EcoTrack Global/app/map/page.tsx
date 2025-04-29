"use client"

import { useEffect, useState } from "react"
import dynamic from 'next/dynamic'
import { supabase } from "@/lib/supabase"
import { Activity } from "@/components/map-component"

// Dynamically import MapClient with no SSR
const MapClientNoSSR = dynamic(
  () => import('@/components/MapClient'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen bg-gradient-to-b from-black via-black/90 to-black/80 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
          <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse flex items-center justify-center relative">
            <div className="h-8 w-8 text-white animate-spin-slow"></div>
          </div>
        </div>
      </div>
    )
  }
)

export default function MapPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('ecotrack')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error

        // Transformar os dados para o formato esperado pelo componente de mapa
        const transformedData = data?.map(item => ({
          id: item.id,
          lat: item.latitude || 0,
          lng: item.longitude || 0,
          country: item.country,
          adress: item.city ? `${item.street || ''}, ${item.city}` : item.street,
          type: item.type,
          title: item.title,
          responsible: item.responsible,
          photos: item.photos ? JSON.parse(item.photos) : undefined,
          direct_benefited: item.direct_benefited,
          indirect_benefited: item.indirect_benefited
        })) || [];

        setActivities(transformedData)
      } catch (error) {
        console.error("Error fetching activities:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [])

  return (
    <div className="w-full h-screen relative">
      {/* Full-screen map without any overlays */}
      <MapClientNoSSR activities={activities} />
    </div>
  )
} 