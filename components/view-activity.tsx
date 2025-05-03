"use client"

import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useOverlay } from "@/contexts/overlay-context"
import { Globe, AlertCircle, MapPin, Calendar, User, Link2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Image from "next/image"
import { animate, createScope } from "animejs"

interface ViewActivityProps {
  activityId: string;
}

interface Activity {
  id: string;
  title: string;
  type: string;
  description: string;
  country: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  user_id?: string;
  city?: string;
  photos?: string[];
  direct_benefited?: number;
  indirect_benefited?: number;
  email?: string;
  street?: string;
  hyperlink?: string;
  updated_at?: string;
}

export default function ViewActivity({ activityId }: ViewActivityProps) {
  const { hideOverlay, showOverlay } = useOverlay()
  const { user } = useAuth()
  const supabase = createClientComponentClient<Database>()
  const containerRef = useRef<HTMLDivElement>(null)
  const animationScope = useRef<any>(null)
  
  const [activity, setActivity] = useState<Activity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  console.log("ViewActivity mounted with activityId:", activityId)
  
  // Separate the animation initialization into its own effect that runs after render
  useEffect(() => {
    // We'll set a small timeout to ensure the DOM is fully rendered
    const animationTimeout = setTimeout(() => {
      if (containerRef.current) {
        try {
          animationScope.current = createScope({
            root: containerRef.current
          }).add(self => {
            animate(containerRef.current!, {
              opacity: [0, 1],
              translateY: [20, 0],
              duration: 600,
              easing: 'outQuad'
            });
          });
        } catch (error) {
          console.error("Animation error:", error);
        }
      }
    }, 100);
    
    return () => {
      clearTimeout(animationTimeout);
      if (animationScope.current) {
        animationScope.current.revert();
      }
    };
  }, [isLoading]); // Only run this effect when loading state changes
  
  // Keep the data fetching in a separate effect
  useEffect(() => {
    // Fetch activity data
    const fetchActivity = async () => {
      if (!activityId) {
        setError("Missing activity ID");
        setIsLoading(false);
        return;
      }
      
      try {
        console.log("Fetching activity details for ID:", activityId);
        
        const { data, error } = await supabase
          .from('ecotrack')
          .select('*')
          .eq('id', activityId)
          .single();
        
        if (error) {
          console.error("Error fetching activity:", error);
          throw new Error(error.message);
        }
        
        if (!data) {
          throw new Error("Activity not found");
        }
        
        // Parse photos if they exist
        let photosArray: string[] = [];
        if (data.photos) {
          try {
            photosArray = JSON.parse(data.photos);
            if (!Array.isArray(photosArray)) photosArray = [];
          } catch (e) {
            console.error("Error parsing photos:", e);
          }
        }
        
        // Convert the activity data to our format
        const activity: Activity = {
          ...data,
          photos: photosArray
        };
        
        console.log("Activity loaded successfully:", activity.title);
        setActivity(activity);
        
      } catch (err: any) {
        console.error("Error loading activity:", err);
        setError(err.message || "Failed to load activity details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActivity();
  }, [activityId, supabase]);
  
  const handleEdit = () => {
    hideOverlay();
    // Short delay to ensure overlay is completely closed
    setTimeout(() => {
      showOverlay("edit", activityId);
    }, 100);
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return "Unknown date";
    }
  };
  
  // Get color theme based on activity type
  const getActivityTheme = (type: string) => {
    switch (type) {
      case "reforestation":
        return {
          bg: "bg-gradient-to-br from-green-950/40 to-green-900/10",
          border: "border-green-500/20",
          text: "text-green-400",
          icon: <Globe className="h-5 w-5 text-green-400" />,
          glow: "shadow-[0_0_15px_rgba(34,197,94,0.2)]",
          indicator: "bg-green-500"
        };
      case "clean-up":
        return {
          bg: "bg-gradient-to-br from-blue-950/40 to-blue-900/10",
          border: "border-blue-500/20",
          text: "text-blue-400",
          icon: <Globe className="h-5 w-5 text-blue-400" />,
          glow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]",
          indicator: "bg-blue-500"
        };
      case "education":
        return {
          bg: "bg-gradient-to-br from-amber-950/40 to-amber-900/10",
          border: "border-amber-500/20",
          text: "text-amber-400",
          icon: <Globe className="h-5 w-5 text-amber-400" />,
          glow: "shadow-[0_0_15px_rgba(251,191,36,0.2)]",
          indicator: "bg-amber-500"
        };
      case "renewable":
        return {
          bg: "bg-gradient-to-br from-purple-950/40 to-purple-900/10",
          border: "border-purple-500/20",
          text: "text-purple-400",
          icon: <Globe className="h-5 w-5 text-purple-400" />,
          glow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]",
          indicator: "bg-purple-500"
        };
      default:
        return {
          bg: "bg-gradient-to-br from-cyan-950/40 to-cyan-900/10",
          border: "border-cyan-500/20",
          text: "text-cyan-400",
          icon: <Globe className="h-5 w-5 text-cyan-400" />,
          glow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]",
          indicator: "bg-cyan-500"
        };
    }
  };
  
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center py-10">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-xl"></div>
          <div className="h-16 w-16 rounded-full border-4 border-t-transparent border-cyan-500/50 animate-spin shadow-[0_0_15px_rgba(6,182,212,0.3)]"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-10 space-y-6 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)]">
          <AlertCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-500">
          Error Loading Activity
        </h2>
        <p className="text-gray-300 max-w-md">
          {error}
        </p>
        <Button className="bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40" onClick={hideOverlay}>
          Close
        </Button>
      </div>
    );
  }
  
  if (!activity) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-10 space-y-6 text-center">
        <h2 className="text-2xl font-bold text-gray-400">
          Activity Not Found
        </h2>
        <Button className="bg-cyan-900/20 hover:bg-cyan-900/30 text-cyan-400 border border-cyan-900/40" onClick={hideOverlay}>
          Close
        </Button>
      </div>
    );
  }
  
  const theme = getActivityTheme(activity.type);
  
  return (
    <div className="h-full flex flex-col" ref={containerRef}>
      {/* Header section */}
      <div className="px-6 py-5 border-b border-cyan-900/30 relative">
        <div className="absolute left-0 right-0 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${theme.indicator} mr-2.5`}>
              {theme.icon}
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {activity.title}
            </h2>
          </div>
          <p className="text-sm text-gray-400">
            <span className="capitalize">{activity.type.replace('-', ' ')}</span> Activity
          </p>
        </div>
      </div>

      {/* Content section */}
      <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
        {/* Photos section */}
        {activity.photos && activity.photos.length > 0 && (
          <div className="mb-8">
            <div className="relative h-64 w-full rounded-xl overflow-hidden">
              <Image 
                src={activity.photos[0]} 
                alt={activity.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            </div>
            
            {activity.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {activity.photos.slice(1, 5).map((photo, index) => (
                  <div key={index} className="relative h-20 rounded-md overflow-hidden">
                    <Image 
                      src={photo} 
                      alt={`${activity.title} ${index + 2}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
                {activity.photos.length > 5 && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    +{activity.photos.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Description */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
            Description
          </h3>
          <p className="text-gray-300 whitespace-pre-line">{activity.description}</p>
        </div>
        
        {/* Location information */}
        <div className="p-4 rounded-lg mb-6 backdrop-blur-sm bg-cyan-950/10 border border-cyan-900/30">
          <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-3 flex items-center">
            <MapPin className="mr-2 h-4 w-4 text-cyan-400" />
            Location
          </h3>
          
          <div className="space-y-2">
            {activity.street && (
              <p className="text-gray-300">{activity.street}</p>
            )}
            <p className="text-gray-300">
              {[activity.city, activity.country].filter(Boolean).join(", ")}
            </p>
            
            {(activity.latitude && activity.longitude) && (
              <p className="text-gray-400 text-sm mt-2">
                Coordinates: {activity.latitude.toFixed(4)}, {activity.longitude.toFixed(4)}
              </p>
            )}
          </div>
        </div>
        
        {/* Additional details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Created at */}
          <div className="p-4 rounded-lg backdrop-blur-sm bg-gray-900/50 border border-gray-800">
            <div className="flex items-center text-gray-400 mb-1">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="text-xs uppercase">Created</span>
            </div>
            <p className="text-gray-200">{formatDate(activity.created_at)}</p>
          </div>
          
          {/* Updated at (if available) */}
          {activity.updated_at && activity.updated_at !== activity.created_at && (
            <div className="p-4 rounded-lg backdrop-blur-sm bg-gray-900/50 border border-gray-800">
              <div className="flex items-center text-gray-400 mb-1">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="text-xs uppercase">Last updated</span>
              </div>
              <p className="text-gray-200">{formatDate(activity.updated_at)}</p>
            </div>
          )}
          
          {/* Contact email */}
          {activity.email && (
            <div className="p-4 rounded-lg backdrop-blur-sm bg-gray-900/50 border border-gray-800">
              <div className="flex items-center text-gray-400 mb-1">
                <User className="h-4 w-4 mr-2" />
                <span className="text-xs uppercase">Contact</span>
              </div>
              <p className="text-gray-200 break-all">{activity.email}</p>
            </div>
          )}
          
          {/* External link */}
          {activity.hyperlink && (
            <div className="p-4 rounded-lg backdrop-blur-sm bg-gray-900/50 border border-gray-800">
              <div className="flex items-center text-gray-400 mb-1">
                <Link2 className="h-4 w-4 mr-2" />
                <span className="text-xs uppercase">Website</span>
              </div>
              <a 
                href={activity.hyperlink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 hover:underline break-all"
              >
                {activity.hyperlink}
              </a>
            </div>
          )}
        </div>
        
        {/* Beneficiaries section */}
        {(activity.direct_benefited || activity.indirect_benefited) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-3 flex items-center">
              <Users className="mr-2 h-4 w-4 text-cyan-400" />
              Beneficiaries
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {activity.direct_benefited !== undefined && activity.direct_benefited > 0 && (
                <div className="p-4 rounded-lg backdrop-blur-sm bg-gray-900/50 border border-gray-800">
                  <p className="text-xs text-gray-400 mb-1">Direct Beneficiaries</p>
                  <p className="text-xl font-semibold text-white">{activity.direct_benefited.toLocaleString()}</p>
                </div>
              )}
              
              {activity.indirect_benefited !== undefined && activity.indirect_benefited > 0 && (
                <div className="p-4 rounded-lg backdrop-blur-sm bg-gray-900/50 border border-gray-800">
                  <p className="text-xs text-gray-400 mb-1">Indirect Beneficiaries</p>
                  <p className="text-xl font-semibold text-white">{activity.indirect_benefited.toLocaleString()}</p>
                </div>
              )}
              
              {activity.direct_benefited && activity.indirect_benefited && (
                <div className="col-span-2 p-4 rounded-lg backdrop-blur-sm bg-gray-900/50 border border-gray-800">
                  <p className="text-xs text-gray-400 mb-1">Total Impact</p>
                  <p className="text-xl font-semibold text-white">
                    {(activity.direct_benefited + activity.indirect_benefited).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer with actions */}
      <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={hideOverlay}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Close
          </Button>
          
          {user && activity.user_id === user.id && (
            <Button
              onClick={handleEdit}
              className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
            >
              Edit Activity
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 