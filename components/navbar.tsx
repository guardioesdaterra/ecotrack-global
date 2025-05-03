"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GradientButton } from "@/components/ui/gradient-button"
import { 
  MapPin, 
  BarChart2, 
  PlusSquare, 
  Globe, 
  Menu, 
  X,
  User,
  Search,
  ChevronDown,
  Layers,
  LogOut,
  LayoutDashboard,
  Leaf,
  Droplets,
  BookOpen,
  Shield,
  Zap,
  Plus,
  Clock,
  Sparkles,
  Filter
} from "lucide-react"
import { AuthButtons } from "@/components/auth-buttons"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { useOverlay } from "@/contexts/overlay-context"
import { useGeolocation } from "@/lib/hooks/useGeolocation"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabaseClient"
import OptimizedLink from "@/components/ui/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Helper function to get user initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showActivities, setShowActivities] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [filteredActivities, setFilteredActivities] = useState<any[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [glitchEffect, setGlitchEffect] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const { showOverlay } = useOverlay()
  const { geocode } = useGeolocation()
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)

  // Helper function to get the icon for an activity type
  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'reforestation':
        return <Leaf className="h-4 w-4 text-green-400" />;
      case 'clean-up':
        return <Droplets className="h-4 w-4 text-blue-400" />;
      case 'education':
        return <BookOpen className="h-4 w-4 text-amber-400" />;
      case 'conservation':
        return <Shield className="h-4 w-4 text-amber-400" />;
      case 'renewable':
        return <Zap className="h-4 w-4 text-pink-400" />;
      default:
        return <Globe className="h-4 w-4 text-gray-400" />;
    }
  };

  // Style for cyberpunk animations
  const cyberpunkStylesRef = useRef<HTMLStyleElement | null>(null)

  // Add cyberpunk animations styles
  useEffect(() => {
    if (typeof window !== 'undefined' && !cyberpunkStylesRef.current) {
      const styleEl = document.createElement('style')
      styleEl.textContent = `
        @keyframes cyberscan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        
        @keyframes cyberpulse {
          0% {
            opacity: 0.1;
            transform: scale(1);
          }
          50% {
            opacity: 0.2;
            transform: scale(1.05);
          }
          100% {
            opacity: 0.1;
            transform: scale(1);
          }
        }
        
        @keyframes text-glitch {
          0% {
            text-shadow: 0.05em 0 0 rgba(6, 182, 212, 0.75), -0.05em -0.025em 0 rgba(124, 58, 237, 0.75);
          }
          14% {
            text-shadow: 0.05em 0 0 rgba(6, 182, 212, 0.75), -0.05em -0.025em 0 rgba(124, 58, 237, 0.75);
          }
          15% {
            text-shadow: -0.05em -0.025em 0 rgba(6, 182, 212, 0.75), 0.025em 0.025em 0 rgba(124, 58, 237, 0.75);
          }
          49% {
            text-shadow: -0.05em -0.025em 0 rgba(6, 182, 212, 0.75), 0.025em 0.025em 0 rgba(124, 58, 237, 0.75);
          }
          50% {
            text-shadow: 0.025em 0.05em 0 rgba(6, 182, 212, 0.75), 0.05em 0 0 rgba(124, 58, 237, 0.75);
          }
          99% {
            text-shadow: 0.025em 0.05em 0 rgba(6, 182, 212, 0.75), 0.05em 0 0 rgba(124, 58, 237, 0.75);
          }
          100% {
            text-shadow: -0.025em 0 0 rgba(6, 182, 212, 0.75), -0.025em -0.025em 0 rgba(124, 58, 237, 0.75);
          }
        }
        
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        @keyframes scanning {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 100% 100%;
          }
        }
        
        @keyframes flicker {
          0% {
            opacity: 1;
          }
          10% {
            opacity: 0.8;
          }
          12% {
            opacity: 1;
          }
          30% {
            opacity: 1;
          }
          31% {
            opacity: 0.6;
          }
          32% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          71% {
            opacity: 0.8;
          }
          72% {
            opacity: 1;
          }
          100% {
            opacity: 1;
          }
        }
        
        /* Cyberpunk scrollbar styling */
        .cyberpunk-scrollbar::-webkit-scrollbar {
          width: 6px;
          background-color: rgba(0, 0, 0, 0.3);
        }
        
        .cyberpunk-scrollbar::-webkit-scrollbar-track {
          background: linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%);
          border-radius: 3px;
        }
        
        .cyberpunk-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(6, 182, 212, 0.7) 0%, rgba(124, 58, 237, 0.7) 100%);
          border-radius: 3px;
          border: 1px solid rgba(6, 182, 212, 0.3);
          box-shadow: 0 0 5px rgba(6, 182, 212, 0.5);
        }
        
        .cyberpunk-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(6, 182, 212, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
        }
        
        .glitch-text {
          animation: text-glitch 3s infinite;
          animation-delay: calc(var(--delay) * 1s);
        }
        
        .animate-marquee {
          animation: marquee 12s linear infinite;
          display: inline-block;
          white-space: nowrap;
          width: max-content;
        }
        
        .scanning-effect {
          background: linear-gradient(45deg, transparent 65%, rgba(6, 182, 212, 0.3) 70%, transparent 75%);
          background-size: 200% 200%;
          animation: scanning 3s ease-in-out infinite;
        }
        
        .flicker-effect {
          animation: flicker 5s linear infinite;
        }
      `
      document.head.appendChild(styleEl)
      cyberpunkStylesRef.current = styleEl
    }
    
    return () => {
      if (cyberpunkStylesRef.current) {
        cyberpunkStylesRef.current.remove()
        cyberpunkStylesRef.current = null
      }
    }
  }, [])

  // Activity types for filtering
  const activityTypes = [
    { value: 'reforestation', label: 'Reforestation', color: '#10b981' },
    { value: 'clean-up', label: 'Clean-up', color: '#0ea5e9' },
    { value: 'education', label: 'Education', color: '#8b5cf6' },
    { value: 'conservation', label: 'Conservation', color: '#f59e0b' },
    { value: 'renewable', label: 'Renewable', color: '#ec4899' },
    { value: 'other', label: 'Other', color: '#6b7280' },
  ]

  // Trigger glitch effect on route change
  useEffect(() => {
    setGlitchEffect(true);
    const timer = setTimeout(() => setGlitchEffect(false), 600);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Fetch activities for the dropdown AND mobile search
  useEffect(() => {
    const fetchActivities = async () => {
      if (!showActivities && !showSearch) return;
      
      setIsLoadingActivities(true);
      try {
        // Fetch real data from Supabase
        const { data, error } = await supabase
          .from('ecotrack')
          .select('*');
          
        if (error) throw error;
        
        if (data) {
          // Transform database data to match our activity interface
          const activitiesData = data.map(item => ({
            id: item.id ? parseInt(item.id.toString()) : Math.random() * 10000,
            title: item.title || 'Untitled Activity',
            type: item.type || 'other',
            location: item.city ? `${item.city}, ${item.country || ''}` : (item.country || 'Unknown'),
            description: item.description || '',
            lat: item.latitude || item.lat || 0,
            lng: item.longitude || item.lng || 0,
            responsible: item.responsible || 'Unknown'
          }));
          
          setActivities(activitiesData);
          setFilteredActivities(activitiesData);
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
        // Fallback to empty array
        setActivities([]);
        setFilteredActivities([]);
      } finally {
        setIsLoadingActivities(false);
      }
    };
    
    fetchActivities();
  }, [showActivities, showSearch]);

  // Filter activities based on selected types and search query
  useEffect(() => {
    if (activities.length === 0) return;
    
    let filtered = [...activities];
    
    // Filter by selected types
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(activity => selectedTypes.includes(activity.type));
    }
    
    // Filter by search query
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.title.toLowerCase().includes(searchLower) ||
        activity.location.toLowerCase().includes(searchLower) ||
        activity.description.toLowerCase().includes(searchLower) ||
        activity.type.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredActivities(filtered);
  }, [selectedTypes, searchValue, activities]);

  // Toggle activity type filter
  const toggleActivityType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  // Handle scroll event
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    
    window.addEventListener('scroll', handleScroll)
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Handle search submission
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      performSearch();
    }
  }

  // Separate search function that can be called from multiple places
  const performSearch = async () => {
    if (!searchValue.trim()) return;
    
    setIsSearching(true)
    setSearchResults([]);
    
    try {
      console.log("Searching for:", searchValue);
      // Use the geocode function to search for the location
      const result = await geocode(searchValue);
      console.log("Search result:", result);
      
      if (result && result.latitude && result.longitude) {
        // Navigate to the map with the coordinates
        router.push(`/map?lat=${result.latitude}&lng=${result.longitude}&q=${encodeURIComponent(searchValue)}`);
        setSearchValue("");
        setShowActivities(false);
      } else {
        setSearchResults([{ error: "No results found. Try a different search term." }]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([{ error: "An error occurred during search. Please try again." }]);
    } finally {
      setIsSearching(false);
    }
  }

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowActivities(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  // Handle search results for map links
  const handleSearchResultClick = (result: any) => {
    if (result && result.latitude && result.longitude) {
      // Handle coordinates for map links
      const lat = result.latitude !== undefined && result.latitude !== null ? result.latitude : (result.lat || 0);
      const lng = result.longitude !== undefined && result.longitude !== null ? result.longitude : (result.lng || 0);
      
      // Only proceed if we have valid coordinates
      if (lat && lng) {
        router.push(`/map?lat=${lat}&lng=${lng}&q=${encodeURIComponent(searchValue)}`);
        setShowSearch(false);
      } else {
        // If no coordinates, just go to the map page with search term
        router.push(`/map?q=${encodeURIComponent(searchValue)}`);
        setShowSearch(false);
      }
    } else {
      // No result with coordinates, just go to the map page with search term
      router.push(`/map?q=${encodeURIComponent(searchValue)}`);
      setShowSearch(false);
    }
  };

  return (
    <>
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 w-full z-[50] transition-all duration-300",
          isScrolled 
            ? "bg-black/80 backdrop-blur-md border-b border-cyan-900/40 shadow-[0_4px_20px_rgba(6,182,212,0.15)]" 
            : "bg-gradient-to-b from-black/90 to-transparent"
        )}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          {glitchEffect && (
            <div className="absolute inset-0 opacity-20 animate-pulse" 
              style={{
                backgroundImage: `
                  linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.1) 5%, transparent 5.1%, transparent 10%, rgba(124, 58, 237, 0.1) 10.1%, transparent 10.2%, transparent 20%, rgba(6, 182, 212, 0.1) 20.1%, transparent 20.2%),
                  linear-gradient(0deg, transparent 0%, rgba(6, 182, 212, 0.1) 5%, transparent 5.1%)
                `,
                backgroundSize: '100% 8px',
              }}
            ></div>
          )}
        </div>
        <div className="max-w-screen-xl mx-auto px-4 relative">
          <div className="h-14 flex items-center justify-between">
            {/* Logo with enhanced cyberpunk effect */}
            <Link href="/" className="flex items-center group relative z-10">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="absolute -inset-3 bg-black rounded-full opacity-0 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"></div>
              <div className="relative h-8 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all duration-300">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse opacity-0 group-hover:opacity-60 blur-sm"></div>
                <Layers className="h-4 w-4 text-white relative" />
              </div>
              <div className="ml-2 relative">
                <span 
                  className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 tracking-wider group-hover:from-cyan-300 group-hover:to-purple-500 transition-all duration-300 ${glitchEffect ? 'glitch-text' : ''}`}
                  style={{ '--delay': '0' } as React.CSSProperties}
                >
                  Eco
              </span>
                <span 
                  className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-400 tracking-wider group-hover:from-purple-400 group-hover:to-cyan-300 transition-all duration-300 ${glitchEffect ? 'glitch-text' : ''}`}
                  style={{ '--delay': '0.05' } as React.CSSProperties}
                >
                  Track
                </span>
                <div className="absolute -bottom-1 left-0 right-0 h-[1px] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 bg-gradient-to-r from-cyan-500 to-transparent"></div>
                
                {/* Hidden data-like text that appears on hover */}
                <div className="absolute -bottom-1 left-0 opacity-0 group-hover:opacity-100 transition-opacity text-[6px] tracking-wider text-cyan-500/70 overflow-hidden whitespace-nowrap">
                  <span className="inline-block animate-marquee">SYSTEM.ACTIVE // MONITORING.ENABLED // ECO.TRACKING.V2.141 //</span>
                </div>
              </div>
            </Link>
          
            {/* Remove Main Navigation - Desktop */}
            {/* Right side controls */}
            <div className="flex items-center gap-3 ml-auto">
              {/* Desktop Search Input - Now first */}
              <div ref={searchRef} className="hidden md:flex relative items-center z-[51]">
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative"
                >
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <motion.div 
                      className="relative h-10 w-72 bg-gray-900/65 border border-cyan-900/50 rounded-full overflow-hidden group transition-all duration-300 hover:w-80 focus-within:w-80 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.3)] focus-within:border-cyan-500/70 hover:border-cyan-500/50 flex items-center"
                      whileHover={{ boxShadow: "0 0 15px rgba(6, 182, 212, 0.25)" }}
                      animate={{ 
                        boxShadow: searchValue ? "0 0 15px rgba(6, 182, 212, 0.2)" : "none"
                      }}
                    >
                      {/* Efeito de brilho interior com opacity 65% */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/5 via-purple-900/10 to-cyan-900/5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                      
                      {/* Efeito de linha brilhante */}
                      <div className="absolute h-[1px] left-0 right-0 top-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none"></div>
                      <div className="absolute h-[1px] left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none"></div>
                      
                      {/* Efeito de escaneamento diagonal */}
                      <div className="absolute inset-0 scanning-effect opacity-0 group-hover:opacity-100 pointer-events-none"></div>
                      
                      {/* Data text overlay */}
                      <div className="absolute -bottom-0 left-0 right-0 h-4 overflow-hidden opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none">
                        <div className="text-[5px] font-mono text-cyan-500 whitespace-nowrap animate-marquee w-max">
                          SEARCH.SYSTEM.ACTIVE // DATABASE.CONNECTED // GEO.LOC.TRACKING.V1.232 // SATELLITE.UPLINK.ENABLED //
                        </div>
                      </div>
                      
                      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${isSearching ? 'text-cyan-400 animate-pulse' : 'text-gray-400'} group-hover:text-cyan-400 group-focus-within:text-cyan-500 transition-colors pointer-events-none`} />
                      <Input 
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search locations, activities..." 
                        className="h-full w-full border-none bg-transparent px-12 py-0 text-sm text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 flex items-center"
                        onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                        onFocus={() => setShowActivities(true)}
                        onClick={() => setShowActivities(true)}
                        style={{ lineHeight: 'normal' }}
                      />
                      <div 
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-1"
                      >
                      {searchValue && (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchValue("");
                            }}
                            className="h-6 w-6 flex items-center justify-center rounded-full bg-gray-800/70 text-gray-400 hover:text-cyan-400 hover:bg-gray-800/90 transition-colors z-[2] group/clear relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-900/0 opacity-0 group-hover/clear:opacity-100 transition-opacity"></div>
                          <X className="h-3.5 w-3.5 relative z-10" />
                        </motion.button>
                      )}
                      </div>
                    </motion.div>
                  </form>
                </motion.div>
                
                {/* Indicador visual futurístico */}
                <motion.div 
                  className="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${isSearching ? 'bg-purple-500' : 'bg-cyan-500/70'} ${isSearching ? 'animate-ping' : 'flicker-effect'}`}></div>
                </motion.div>

                {/* Activities Dropdown */}
                <AnimatePresence>
                  {showActivities && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: 10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 10 }}
                      transition={{ 
                        duration: 0.3, 
                        ease: "easeInOut",
                        height: { duration: 0.4 }
                      }}
                      className="absolute top-full right-0 mt-2 w-96 bg-black/90 backdrop-blur-md border border-cyan-900/50 rounded-lg shadow-[0_5px_30px_rgba(0,0,0,0.5)] z-[52] overflow-hidden"
                    >
                      {/* Cyber effects overlay */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-purple-500/30 to-transparent"></div>
                        
                        {/* Diagonal scan line animation */}
                        <div className="absolute inset-0 overflow-hidden">
                          <div 
                            className="absolute inset-0 opacity-5" 
                            style={{
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(6, 182, 212, 0.5) 20px, rgba(6, 182, 212, 0.5) 21px)',
                              animation: 'cyberscan 15s linear infinite',
                            }}
                          ></div>
                        </div>
                        
                        {/* Grid pattern overlay */}
                        <div
                          className="absolute inset-0 opacity-5"
                          style={{
                            backgroundImage: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 1px, transparent 1px)',
                            backgroundSize: '15px 15px',
                          }}
                        ></div>
                      </div>
                      
                      <div className="p-4 space-y-4 relative">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-cyan-400 group relative inline-flex items-center">
                            <span className="inline-block">Explore Activities</span>
                            <span className="absolute -bottom-0.5 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500 to-transparent"></span>
                            <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                          </h3>
                              <button
                            onClick={() => setShowActivities(false)}
                            className="text-gray-400 hover:text-cyan-400 transition-colors relative group"
                          >
                            <X className="h-4 w-4" />
                            <span className="absolute inset-0 rounded-full bg-cyan-500/0 group-hover:bg-cyan-500/20 transition-colors"></span>
                          </button>
                        </div>
                        
                        {/* Activity Type Filters */}
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-gray-400 mb-2 px-1 flex items-center">
                            <Filter className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                            FILTER BY TYPE
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {activityTypes.map(type => (
                              <button
                                key={type.value}
                                onClick={() => toggleActivityType(type.value)}
                                className={`text-xs px-2.5 py-1.5 rounded-full border transition-all duration-300 relative overflow-hidden ${
                                  selectedTypes.includes(type.value)
                                    ? 'bg-opacity-20 border-opacity-70 text-opacity-90 shadow-[0_0_8px_rgba(0,0,0,0.3)]'
                                    : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:text-gray-300'
                                }`}
                                style={{
                                  backgroundColor: selectedTypes.includes(type.value) ? `${type.color}20` : undefined,
                                  borderColor: selectedTypes.includes(type.value) ? type.color : undefined,
                                  color: selectedTypes.includes(type.value) ? type.color : undefined,
                                  boxShadow: selectedTypes.includes(type.value) ? `0 0 10px ${type.color}40` : undefined
                                }}
                              >
                                {selectedTypes.includes(type.value) && (
                                  <span 
                                    className="absolute inset-0 opacity-20" 
                                    style={{
                                      background: `radial-gradient(circle, ${type.color} 0%, transparent 70%)`
                                    }}
                                  ></span>
                                )}
                                {type.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Activities List */}
                        <div className="relative">
                          {isLoadingActivities ? (
                            <div className="py-8 flex justify-center">
                              <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></div>
                                <div className="h-6 w-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin relative" />
                              </div>
                            </div>
                          ) : filteredActivities.length > 0 ? (
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 cyberpunk-scrollbar" 
                              style={{ 
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(8, 145, 178, 0.3) rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              {filteredActivities.map(activity => (
                                <motion.div
                                  key={activity.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="group relative rounded-lg overflow-hidden border border-gray-800 hover:border-cyan-900 transition-colors bg-black/80"
                                  whileHover={{ 
                                    boxShadow: `0 0 15px rgba(8, 145, 178, 0.2)`,
                                    y: -2,
                                    transition: { duration: 0.2 } 
                                  }}
                                >
                                  {/* Hover border glow effect */}
                                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                    <div className="absolute -inset-px rounded-lg bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  </div>
                                  
                                  <div className="flex">
                                    <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center overflow-hidden relative group-hover:scale-105 transition-transform">
                                      <div className="absolute inset-0 bg-gray-900/90"></div>
                                      <div 
                                        className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity" 
                                        style={{ background: `radial-gradient(circle, ${activityTypes.find(t => t.value === activity.type)?.color || '#6b7280'} 0%, transparent 70%)` }}
                                      ></div>
                                      
                                      {/* Animated cyberpunk background for the icon */}
                                      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <div className="absolute inset-0" 
                                          style={{ 
                                            backgroundImage: `radial-gradient(circle, ${activityTypes.find(t => t.value === activity.type)?.color || '#6b7280'}20 1px, transparent 1px)`,
                                            backgroundSize: '6px 6px',
                                            animation: 'cyberpulse 4s ease infinite'
                                          }}
                                        ></div>
                                      </div>
                                      
                                      {activity.type === "reforestation" && (
                                        <Leaf className="h-8 w-8 relative z-10" style={{ color: activityTypes.find(t => t.value === "reforestation")?.color }} />
                                      )}
                                      {activity.type === "clean-up" && (
                                        <Droplets className="h-8 w-8 relative z-10" style={{ color: activityTypes.find(t => t.value === "clean-up")?.color }} />
                                      )}
                                      {activity.type === "education" && (
                                        <BookOpen className="h-8 w-8 relative z-10" style={{ color: activityTypes.find(t => t.value === "education")?.color }} />
                                      )}
                                      {activity.type === "conservation" && (
                                        <Shield className="h-8 w-8 relative z-10" style={{ color: activityTypes.find(t => t.value === "conservation")?.color }} />
                                      )}
                                      {activity.type === "renewable" && (
                                        <Zap className="h-8 w-8 relative z-10" style={{ color: activityTypes.find(t => t.value === "renewable")?.color }} />
                                      )}
                                      {(activity.type === "other" || !activity.type) && (
                                        <Globe className="h-8 w-8 relative z-10" style={{ color: activityTypes.find(t => t.value === "other")?.color }} />
                                      )}
                                    </div>
                                    <div className="p-3 flex-1">
                                      <div className="flex items-start justify-between">
                                <div>
                                          <h3 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors line-clamp-1 relative inline-block">
                                            {activity.title}
                                            <span className="absolute -bottom-0.5 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left bg-gradient-to-r from-cyan-500 to-transparent"></span>
                                          </h3>
                                          <p className="text-xs text-gray-400 mt-0.5 flex items-center">
                                            <MapPin className="h-3 w-3 mr-0.5 text-gray-500" />
                                            {activity.location}
                                          </p>
                                </div>
                                        <span 
                                          className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                                          style={{ 
                                            backgroundColor: `${activityTypes.find(t => t.value === activity.type)?.color}20`,
                                            color: activityTypes.find(t => t.value === activity.type)?.color,
                                            borderWidth: 1,
                                            borderColor: `${activityTypes.find(t => t.value === activity.type)?.color}40`,
                                          }}
                                        >
                                          {activity.type}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{activity.description}</p>
                                    </div>
                                  </div>
                                  <div 
                                    className="absolute inset-0 cursor-pointer"
                                    onClick={() => {
                                      router.push(`/map?lat=${activity.lat}&lng=${activity.lng}&id=${activity.id}`);
                                      setShowActivities(false);
                                    }}
                                  ></div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-6 text-center">
                              <div className="inline-flex justify-center items-center rounded-full bg-gray-800/50 p-3 mb-2">
                                <Search className="h-5 w-5 text-gray-500" />
                              </div>
                              <p className="text-sm text-gray-400">No activities found matching your criteria</p>
                              <button 
                                onClick={() => setSelectedTypes([])} 
                                className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 relative inline-block"
                              >
                                Clear filters
                                <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-cyan-500 to-transparent scale-x-0 hover:scale-x-100 transition-transform origin-left duration-300"></span>
                              </button>
                            </div>
                            )}
                          </div>
                        
                        {/* Footer */}
                        <div className="pt-2 border-t border-gray-800 relative">
                          <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                          <button
                            onClick={() => router.push('/map')}
                            className="w-full py-2 text-xs text-center bg-gradient-to-r from-cyan-500/10 to-purple-600/10 hover:from-cyan-500/20 hover:to-purple-600/20 text-cyan-400 rounded-md transition-colors relative group overflow-hidden"
                          >
                            <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-600/0 opacity-0 group-hover:opacity-100 transform translate-y-full group-hover:translate-y-0 transition-all duration-500"></span>
                            View All Activities on Map
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Mobile Search Button */}
              <GradientButton 
                variant="default" 
                size="sm"
                className="md:hidden rounded-full"
                icon={<Search className="h-4 w-4" />}
                onClick={() => setShowSearch(!showSearch)}
              />
              
              {/* User menu or auth buttons - Now on the far right */}
              <div className="ml-auto z-[51]">
                {user ? (
                  <UserMenu user={user} />
                ) : (
                  <AuthButtons />
                )}
              </div>
              
              {/* Mobile menu button removed per user request */}
            </div>
          </div>
        </div>
        
        {/* Mobile Search overlay */}
        <AnimatePresence>
          {showSearch && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[70] bg-gradient-to-b from-black/95 to-gray-900/95 backdrop-blur-lg"
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -left-20 w-72 h-72 bg-cyan-500/10 rounded-full filter blur-3xl opacity-70"></div>
                <div className="absolute top-40 -right-20 w-80 h-80 bg-purple-500/10 rounded-full filter blur-3xl opacity-70"></div>
                <div className="absolute -bottom-20 left-1/4 w-60 h-60 bg-blue-500/10 rounded-full filter blur-3xl opacity-70"></div>
                <div className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                ></div>
              </div>

              <div className="max-w-screen-xl mx-auto py-5 px-4 h-full flex flex-col">
                {/* Header with close button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
                    Search
                  </h2>
                  <GradientButton 
                    variant="default" 
                    size="sm"
                    className="rounded-full"
                    icon={<X className="h-5 w-5" />}
                    onClick={() => setShowSearch(false)}
                  />
                </div>

                <form onSubmit={handleSearchSubmit} className="relative">
                  <div className="relative">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${isSearching ? 'text-cyan-400 animate-pulse' : 'text-cyan-400'}`} />
                  <Input 
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search locations, activities..." 
                      className="h-14 pl-12 pr-12 w-full bg-black/60 border-cyan-900/50 focus-visible:ring-cyan-500 text-white text-lg rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    autoFocus
                  />
                  <GradientButton
                    type="button"
                    variant="variant"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-cyan-400 rounded-full"
                    onClick={isSearching ? undefined : searchValue ? () => performSearch() : undefined}
                  >
                    {isSearching ? (
                        <div className="h-5 w-5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                    ) : searchValue ? (
                        <X className="h-5 w-5" onClick={(e) => {
                        e.stopPropagation();
                        setSearchValue("");
                      }} />
                    ) : (
                        <Search className="h-5 w-5" />
                    )}
                  </GradientButton>
                  </div>

                  {/* Search status line with cyberpunk styling */}
                  <div className="mt-2 px-2 flex items-center justify-between text-xs text-cyan-500/70">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${isSearching ? 'bg-purple-500 animate-pulse' : 'bg-cyan-500'}`}></div>
                      <span>{isSearching ? 'SEARCHING' : 'READY'}</span>
                    </div>
                    <span className="font-mono text-[10px] opacity-70">
                      ECO::TRACK::GLOBAL::v1.0
                    </span>
                  </div>
                </form>

                {/* Search Results - Full height scrollable area */}
                <div className="flex-1 mt-5 overflow-y-auto">
                  {/* Activity Type Filters */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-2 px-1 flex items-center">
                      <Filter className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                      FILTER BY TYPE
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {activityTypes.map(type => (
                        <button
                          key={type.value}
                          onClick={() => toggleActivityType(type.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-full border transition-all duration-300 relative overflow-hidden ${
                            selectedTypes.includes(type.value)
                              ? 'bg-opacity-20 border-opacity-70 text-opacity-90 shadow-[0_0_8px_rgba(0,0,0,0.3)]'
                              : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:text-gray-300'
                          }`}
                          style={{
                            backgroundColor: selectedTypes.includes(type.value) ? `${type.color}20` : undefined,
                            borderColor: selectedTypes.includes(type.value) ? type.color : undefined,
                            color: selectedTypes.includes(type.value) ? type.color : undefined,
                            boxShadow: selectedTypes.includes(type.value) ? `0 0 10px ${type.color}40` : undefined
                          }}
                        >
                          {selectedTypes.includes(type.value) && (
                            <span 
                              className="absolute inset-0 opacity-20" 
                              style={{
                                background: `radial-gradient(circle, ${type.color} 0%, transparent 70%)`
                              }}
                            ></span>
                          )}
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent and submitted activities section */}
                  {!searchResults.length && !isLoadingActivities && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-400 mb-2 px-1 flex items-center">
                        <Globe className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                        ALL ACTIVITIES
                      </h3>
                      
                      {isLoadingActivities ? (
                        <div className="py-4 flex justify-center">
                          <div className="h-8 w-8 rounded-full border-2 border-t-transparent border-cyan-500 animate-spin"></div>
                        </div>
                      ) : filteredActivities.length > 0 ? (
                        <div className="space-y-2">
                          {filteredActivities.slice(0, 10).map((activity) => (
                            <button
                              key={activity.id}
                              onClick={() => {
                                router.push(`/map?activity=${activity.id}`);
                                setShowSearch(false);
                              }}
                              className="w-full bg-black/60 backdrop-blur-sm border border-cyan-900/30 rounded-lg p-3 text-left hover:bg-cyan-900/20 transition-colors flex items-start gap-3"
                            >
                              <div className={`p-2 rounded-full flex-shrink-0 ${activity.type === 'reforestation' ? 'bg-green-900/20' : activity.type === 'clean-up' ? 'bg-blue-900/20' : 'bg-amber-900/20'}`}>
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">{activity.title}</p>
                                <p className="text-gray-400 text-xs truncate">{activity.location || activity.country || "Unknown location"}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 px-2">
                          <p className="text-gray-400 text-sm">No activities found</p>
                          <button 
                            onClick={() => {
                              setShowSearch(false);
                              showOverlay('submit');
                            }}
                            className="mt-2 text-cyan-400 text-sm hover:text-cyan-300"
                          >
                            Create a new activity
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isLoadingActivities && !searchResults.length && (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-xl"></div>
                        <div className="h-10 w-10 rounded-full border-2 border-t-transparent border-cyan-500 animate-spin shadow-[0_0_10px_rgba(6,182,212,0.3)]"></div>
                      </div>
                      <p className="mt-4 text-cyan-400/80 text-sm animate-pulse">Loading activities...</p>
                    </div>
                  )}

                  {/* Search Results */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                        className="space-y-2"
                      >
                        <h3 className="text-sm font-semibold text-gray-400 mb-2 px-1 flex items-center">
                          <Search className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                          SEARCH RESULTS
                        </h3>
                        
                      {searchResults.map((result, index) => (
                          <div key={index} className="bg-black/60 backdrop-blur-sm border border-cyan-900/30 rounded-lg overflow-hidden">
                          {result.error ? (
                              <div className="p-4 text-center">
                            <p className="text-amber-400 text-sm">{result.error}</p>
                              </div>
                          ) : (
                            <button
                              onClick={() => {
                                  handleSearchResultClick(result);
                                }}
                                className="w-full py-3 px-4 text-left hover:bg-cyan-900/20 transition-colors flex items-start"
                              >
                                <MapPin className="h-5 w-5 text-cyan-400 mt-0.5 mr-3 flex-shrink-0" />
                              <div>
                                  <p className="text-white font-medium">{result.name || searchValue}</p>
                                  <p className="text-gray-400 text-sm">{result.address || "Location"}</p>
                              </div>
                            </button>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu panel */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-[60] w-64 md:hidden bg-gray-900/95 border-l border-cyan-900/50 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
            >
              <div className="flex flex-col h-full">
                {/* Header with close button */}
                <div className="h-14 flex items-center justify-between px-4 border-b border-cyan-900/30">
                  <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
                    Menu
                  </h2>
                  <GradientButton 
                    variant="default" 
                    size="sm"
                    className="rounded-full"
                    icon={<X className="h-4 w-4" />}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                </div>
                
                {/* Menu items */}
                <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
                  <MobileNavButton
                    href="/dashboard"
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    label="Dashboard"
                    isActive={pathname === "/dashboard"}
                  />
                  <MobileNavButton
                    onClick={() => showOverlay('submit')}
                    icon={<div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600"><Plus className="h-3 w-3 text-white" /></div>}
                    label="Submit"
                    isActive={pathname === "/submit"}
                  />
                  <MobileNavButton
                    href="/map"
                    icon={<MapPin className="h-4 w-4" />}
                    label="Map"
                    isActive={pathname === "/map"}
                  />
                  
                  {user && (
                    <>
                      <div className="h-px bg-cyan-900/30 my-2" />
                      
                      <MobileNavButton
                        href="/profile"
                        icon={<User className="h-5 w-5" />}
                        label="Profile"
                        isActive={pathname === "/profile"}
                      />
                    </>
                  )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-cyan-900/30 relative">
                  <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                  <p className="text-xs text-cyan-800 text-center">
                    EcoTrack Global &copy; {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Navigation button for desktop
function NavButton({ 
  href, 
  icon, 
  label, 
  isActive,
  onClick
}: { 
  href?: string; 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <OptimizedLink
        href={href}
        className={cn(
          "flex items-center gap-1.5 text-sm py-2 px-3 rounded-md transition-colors",
          isActive 
            ? "bg-gradient-to-r from-cyan-900/60 to-purple-900/60 text-white" 
            : "text-gray-400 hover:text-cyan-400"
        )}
      >
        {icon}
        <span>{label}</span>
      </OptimizedLink>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 text-sm py-2 px-3 rounded-md transition-colors",
        isActive 
          ? "bg-gradient-to-r from-cyan-900/60 to-purple-900/60 text-white" 
          : "text-gray-400 hover:text-cyan-400"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Navigation button for mobile
function MobileNavButton({ 
  href, 
  icon, 
  label, 
  isActive, 
  onClick 
}: { 
  href?: string; 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean; 
  onClick?: () => void;
}) {
  if (href) {
    return (
      <OptimizedLink
        href={href}
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-md transition-colors",
          isActive 
            ? "text-cyan-400" 
            : "text-gray-500 hover:text-gray-300"
        )}
      >
        {icon}
        <span className="text-xs">{label}</span>
      </OptimizedLink>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-md transition-colors",
        isActive 
          ? "text-cyan-400" 
          : "text-gray-500 hover:text-gray-300"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}

// User menu component
function UserMenu({ user }: { user: any }) {
  const router = useRouter();
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 rounded-full p-0 overflow-hidden border border-cyan-500/50 hover:bg-cyan-900/20">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={user.user_metadata?.avatar_url || ""} 
              alt={user.user_metadata?.full_name || "User"} 
            />
            <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs">
              {getInitials(user.user_metadata?.full_name || user.email || "User")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-gray-900/95 backdrop-blur-lg border-cyan-900/50 text-white">
        <div className="py-2 px-4 border-b border-gray-800">
          <p className="text-sm font-medium">{user.user_metadata?.full_name || "EcoTrack User"}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <DropdownMenuItem asChild>
          <OptimizedLink 
            href="/profile" 
            className="cursor-pointer focus:bg-cyan-900/30 focus:text-cyan-400"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </OptimizedLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <OptimizedLink 
            href="/monitor" 
            className="cursor-pointer focus:bg-cyan-900/30 focus:text-cyan-400"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </OptimizedLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-red-400 focus:bg-red-900/30 focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 