"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Globe as GlobeIcon, 
  Users, 
  Leaf, 
  Award, 
  ArrowRight,  
  Sparkles, 
  PlusCircle, 
  Wind, 
  Battery, 
  BarChart2, 
  Zap, 
  Cpu, 
  Eye, 
  Radar, 
  Shield, 
  Hexagon, 
  Activity 
} from "lucide-react"
import { InitiativesCount, CountriesCount } from "@/components/InitiativesCount"
import { useEffect, useState, useRef, useMemo, Suspense } from "react"
import * as React from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useOverlay } from "@/contexts/overlay-context"
import { fetchActivities, getSupabaseBrowserClient } from "@/lib/supabaseClient"
import { Activity as ActivityType } from "@/components/map-component"
import dynamic from "next/dynamic"
import { usePerformanceMode } from "@/hooks/use-performance-mode"

// Lazy load with priority for critical components
const BackgroundBeams = dynamic(
  () => import("@/components/ui/background-beams").then((mod) => mod.BackgroundBeams),
  { ssr: false, loading: () => null }
)

// Globe is extremely heavy - defer loading with increased priority
const GlobeDemo = dynamic(
  () => import("@/components/globe-demo").then((mod) => mod.GlobeDemo),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
      </div>
    )
  }
)

export default function Home() {
  const { showOverlay } = useOverlay()
  const heroRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isVisible, setIsVisible] = useState(true)
  const [activities, setActivities] = useState<ActivityType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lowPerformance, setLowPerformance] = useState(false)
  const [globeLoaded, setGlobeLoaded] = useState(false)
  const { performanceMode } = usePerformanceMode()
  const [error, setError] = useState<string | null>(null)
  
  // Prefetch profile page to make future navigation faster
  useEffect(() => {
    if (typeof window !== 'undefined' && !isMobile && performanceMode !== 'low') {
      // Prefetch the profile page after the home page is interactive
      const timer = setTimeout(() => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = '/profile'
        link.as = 'document'
        document.head.appendChild(link)
      }, 5000) // Delay to prioritize current page interactivity
      
      return () => clearTimeout(timer)
    }
  }, [isMobile, performanceMode])
  
  // Detect low performance devices - improved
  useEffect(() => {
    const detectPerformance = () => {
      const memory = (navigator as any).deviceMemory
      const cores = navigator.hardwareConcurrency || 0
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // FPS evaluation
      let lowFPS = false
      let lastTime = performance.now()
      let frames = 0
      
      const checkFPS = () => {
        frames++
        const currentTime = performance.now()
        if (currentTime > lastTime + 1000) {
          const fps = Math.round(frames * 1000 / (currentTime - lastTime))
          lowFPS = fps < 30
          frames = 0
          lastTime = currentTime
        }
        
        if (frames < 5) {
          requestAnimationFrame(checkFPS)
        }
      }
      
      requestAnimationFrame(checkFPS)
      
      // Consider device low performance if any condition is true
      return (memory !== undefined && memory < 4) || cores < 4 || isMobileDevice || lowFPS
    }
    
    // Show globe with increased delay on slow devices
    const isSlowDevice = detectPerformance()
    setLowPerformance(isSlowDevice)
    
    const delayTime = isSlowDevice ? 2000 : 800
    const timer = setTimeout(() => {
      setGlobeLoaded(true)
    }, delayTime)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Simplified scroll handler with better performance
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        requestAnimationFrame(() => {
          const heroHeight = heroRef.current?.offsetHeight || 0
          setIsVisible(window.scrollY < heroHeight - 100)
        })
      }
    }
    
    // Use passive event listeners for better scrolling performance
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])
  
  // Fetch activities data with caching and persistence
  useEffect(() => {
    async function loadActivities() {
      if (!isLoading) return
      
      try {
        // Skip data fetching during SSR
        if (typeof window === 'undefined') {
          setActivities([]);
          setIsLoading(false);
          return;
        }
        
        console.log("Loading activities from Supabase...");
        
        try {
          // Use the fetchActivities function with the browser client
        const data = await fetchActivities(performanceMode === 'low' ? 20 : 50);
        
        // Transform database data to match activity interface
          const activitiesData = data.map((item: any) => {
          // Convert database schema to Activity type
          const activity: ActivityType = {
            id: item.id,
            title: item.title,
            type: item.type,
            description: item.description || '',
            lat: item.latitude || 0,
            lng: item.longitude || 0,
            country: item.country || 'Unknown',
            adress: item.city ? `${item.city}, ${item.country || ''}` : undefined,
            responsible: item.responsible || 'Unknown',
            photos: item.photos === null ? undefined : item.photos
          };
          return activity;
        });
        
        setActivities(activitiesData);
          setIsLoading(false);
          
          // Save to localStorage as a client-side cache
          try {
            localStorage.setItem('mapActivities', JSON.stringify(activitiesData));
            localStorage.setItem('mapActivitiesTimestamp', Date.now().toString());
          } catch (e) {
            console.warn('Failed to save activities to localStorage:', e);
          }
        } catch (err) {
          console.error("Error loading activities:", err);
          setError(`Failed to load activities: ${err instanceof Error ? err.message : String(err)}`);
          
          // Try to load from localStorage as a fallback
          try {
            const cachedData = localStorage.getItem('mapActivities');
            if (cachedData) {
              console.log("Using cached activities from localStorage");
              const parsedData = JSON.parse(cachedData);
              const activitiesData = parsedData.map((item: any) => ({
                id: item.id,
                title: item.title,
                type: item.type,
                description: item.description || '',
                lat: item.lat || 0,
                lng: item.lng || 0,
                country: item.country || 'Unknown',
                adress: item.adress,
                responsible: item.responsible || 'Unknown',
                photos: item.photos === null ? undefined : item.photos
              }));
              setActivities(activitiesData);
            }
          } catch (cacheErr) {
            console.error("Failed to load cached activities:", cacheErr);
          }
          
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Unhandled error in loadActivities:", error);
        setError(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
        setIsLoading(false);
      }
    }
    
    loadActivities();
  }, [isLoading, performanceMode]);
  
  // Generate circuit pattern data lines - optimized and memoized
  const circuitLines = useMemo(() => {
    // Reduce quantity on low performance devices
    const positions = [10, 25, 40, 55, 70, 85, 97]
    const lengths = [8, 12, 15, 18, 10, 14]
    const colors = [
      'rgba(6, 182, 212, 0.5)',
      'rgba(139, 92, 246, 0.5)',
      'rgba(6, 182, 212, 0.5)',
    ]
    
    // Dynamically adjust based on performance
    const count = lowPerformance ? 2 : performanceMode === 'low' ? 3 : performanceMode === 'medium' ? 4 : 6
    
    return Array.from({ length: count }).map((_, i) => {
      const isVertical = i % 2 === 0
      const position = positions[i % positions.length]
      const length = lengths[i % lengths.length]
      const thickness = 1 // Always use thickness 1 for better performance
      const delay = lowPerformance ? i * 1 : i * 0.5
      const duration = lowPerformance ? 5 : 1.5 + (i * 0.2)
      const color = colors[i % colors.length]
      
      return { isVertical, position, length, thickness, delay, duration, color }
    })
  }, [lowPerformance, performanceMode])
  
  // Generate particles com otimização
  useEffect(() => {
    const container = document.getElementById('particles-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const particlePositions = [
      { top: 15, left: 25 },
      { top: 35, left: 75 },
      { top: 65, left: 10 },
      { top: 85, left: 60 },
    ];
    
    // Reduzir ainda mais em dispositivos lentos
    const particleCount = lowPerformance ? 2 : (isMobile ? 3 : 4);
    
    Array.from({ length: particleCount }).forEach((_, i) => {
      const particle = document.createElement('div');
      particle.className = 'absolute rounded-full opacity-40 pointer-events-none';
      
      const width = 4 + (i % 2) * 2;
      const height = 4 + (i % 2) * 2;
      const isEven = i % 2 === 0;
      const color = isEven ? '#06b6d4' : '#8b5cf6';
      const top = particlePositions[i % particlePositions.length].top;
      const left = particlePositions[i % particlePositions.length].left;
      const duration = lowPerformance ? 30 + i * 5 : 20 + i * 2;
      const delay = i * 1;
      
      Object.assign(particle.style, {
        width: `${width}px`,
        height: `${height}px`,
        background: color,
        boxShadow: lowPerformance ? 'none' : `0 0 8px ${color}`,
        top: `${top}%`,
        left: `${left}%`,
        animation: `float ${duration}s linear infinite`,
        animationDelay: `-${delay}s`,
      });
      
      container.appendChild(particle);
    });
  }, [lowPerformance, isMobile]);
  
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Circuit lines animation - otimizado */}
      <div className="fixed inset-0 pointer-events-none z-[4] overflow-hidden opacity-20">
        {circuitLines.map((line, index) => (
          <motion.div
            key={index}
            className="absolute bg-gradient-to-r will-change-[opacity]"
            style={{
              position: 'absolute',
              left: line.isVertical ? `${line.position}%` : 0,
              top: line.isVertical ? 0 : `${line.position}%`,
              width: line.isVertical ? `${line.thickness}px` : `${line.length}%`,
              height: line.isVertical ? `${line.length}%` : `${line.thickness}px`,
              background: line.color,
              boxShadow: lowPerformance ? 'none' : `0 0 6px ${line.color}`,
            }}
            animate={{
              opacity: lowPerformance ? [0.3, 0.5, 0.3] : [0.3, 0.9, 0.3],
            }}
            transition={{
              duration: line.duration,
              repeat: Infinity,
              delay: line.delay,
              ease: "linear" // Substitui easeInOut por linear para melhor desempenho
            }}
          />
        ))}
      </div>
      
      {/* Background overlays - simplificadas para melhor desempenho */}
      {!lowPerformance && (
        <div 
          className="fixed inset-0 z-[6] pointer-events-none opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l5.373 5.627V54.373L54.627 60H5.373L0 54.373V5.627L5.373 0h49.254zM56 2H4v56h52V2z' fill='%2306b6d4' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }}
        ></div>
      )}
      
      {/* Gradient overlay for readability - simplificado */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60 z-[6] pointer-events-none"></div>
      
      {/* Scanning effect - mostrar apenas em dispositivos potentes */}
      {!lowPerformance && !isMobile && (
        <div 
          className="fixed inset-0 z-[7] pointer-events-none opacity-15"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.15), transparent)',
            backgroundSize: '100% 200px',
            animation: 'scanner 15s ease-in-out infinite',
          }}
        ></div>
      )}
      
      {/* Background Beams - apenas em dispositivos potentes */}
      {isVisible && !lowPerformance && !isMobile && (
        <BackgroundBeams className="opacity-50" />
      )}
      
      {/* Main Content */}
      <div className="relative z-[15] min-h-screen pointer-events-none">
        {/* Hero Section */}
        <div 
          ref={heroRef}
          className="relative min-h-screen w-full overflow-visible"
            style={{
            perspective: "1200px"
          }}
        >
          {/* Digital circuit pattern - subtle background */}
          <div className="absolute inset-0 z-[1] opacity-5 pointer-events-none" 
            style={{
              backgroundImage: `radial-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px), 
                               radial-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
              backgroundSize: '40px 40px, 60px 60px',
              backgroundPosition: '0 0, 20px 20px'
            }}
          ></div>
          
          {/* Animated background elements - reduced for performance */}
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-cyan-500/5 animate-blob blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-purple-500/5 animate-blob animation-delay-2000 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 left-1/3 w-96 h-96 rounded-full bg-emerald-500/5 animate-blob animation-delay-4000 blur-3xl pointer-events-none"></div>
          
          {/* Main hero content container - adjusted position */}
          <div className="container mx-auto px-4 h-full flex flex-col md:flex-row justify-center md:justify-between items-center relative z-10 overflow-visible pt-8 md:pt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-xl w-full md:w-[52%] md:mr-0 pointer-events-auto py-10 md:py-0 text-center md:text-left pt-16 md:pt-16"
            >
              {/* System badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-1.5 md:gap-2 mb-2 md:mb-4 px-2 py-1 md:px-4 md:py-2 rounded-md bg-gradient-to-r from-cyan-900/40 to-purple-900/40 backdrop-blur-md border border-cyan-500/30 mx-auto md:mx-0"
              >
                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-[10px] md:text-sm font-medium text-cyan-300 tracking-wide font-mono">ECOTRACK SYSTEM v1.9</span>
              </motion.div>
              
              {/* Main heading with smaller size */}
              <motion.h1 
                className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-8 leading-tight tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="relative">
                  <div className="relative whitespace-nowrap mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 [text-shadow:0_0_20px_rgba(6,182,212,0.5)] mr-3">
                      SOCIO·ENVIRONMENTAL
                    </span>
                  </div>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 [text-shadow:0_0_20px_rgba(168,85,247,0.5)]">
                      MONITORING
                    </span>
                  <div className="relative text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 [text-shadow:0_0_20px_rgba(16,185,129,0.5)]">
                    GLOBAL NETWORK
                  </div>
                </div>
              </motion.h1>
              
              {/* Description panel - smaller text */}
              <motion.div 
                className="text-sm md:text-lg text-gray-200 mb-8 md:mb-10 max-w-2xl backdrop-blur-md bg-black/30 p-4 md:p-6 rounded-md border border-white/10 border-l-cyan-500/50 border-t-purple-500/50 relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.2)] z-30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="absolute -top-px left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent"></div>
                <div className="absolute -left-px top-0 bottom-0 w-[1px] bg-gradient-to-b from-cyan-500/70 via-purple-500/40 to-transparent"></div>
                <div className="absolute -right-px top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-transparent to-cyan-500/30"></div>
                <div className="absolute -bottom-px left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
                
                <div className="flex flex-col gap-2 md:gap-3">
                  <p className="text-xs md:text-base">
                    <span className="text-cyan-300 font-semibold">EcoTrack Global</span> is an advanced platform for monitoring and analyzing environmental initiatives worldwide with high-precision data visualization.
                  </p>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-emerald-400/90 mt-1 bg-emerald-950/30 px-2 py-1.5 md:px-3 md:py-2 rounded border border-emerald-500/20 relative">
                    <Radar className="h-3 w-3 md:h-4 md:w-4 animate-pulse" />
                    <span>Network of {activities.length} active environmental monitoring stations</span>

                  </div>
                </div>
              </motion.div>
              
              {/* Action buttons - smaller size */}
              <motion.div 
                className="flex flex-wrap gap-5 md:gap-6 justify-center md:justify-start relative z-30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                style={{
                  marginBottom: isMobile ? "0px" : undefined,
                  position: "relative",
                  zIndex: 35
                }}
              >
                <button 
                  onClick={() => showOverlay('submit')}
                  className="h-8 md:h-9 px-4 md:px-6 text-xs rounded-md flex items-center justify-center bg-gradient-to-r from-cyan-600 to-purple-700 hover:from-cyan-500 hover:to-purple-600 text-white font-medium tracking-wide relative z-35"
                >
                  <PlusCircle className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1.5 md:mr-2" />
                  SUBMIT ACTIVITY
                </button>
                <Link 
                  href="/map"
                  className="h-8 md:h-9 px-4 md:px-6 text-xs rounded-md flex items-center justify-center bg-gradient-to-r from-emerald-600 to-cyan-700 hover:from-emerald-500 hover:to-cyan-600 text-white font-medium tracking-wide relative z-35"
                >
                  <GlobeIcon className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1.5 md:mr-2" />
                  EXPLORE MAP
                </Link>
              </motion.div>
              
              {/* Desktop Globe - ensure z-index for interactivity */}
              {!isMobile && (
                <motion.div 
                  className="hidden md:flex fixed top-0 bottom-0 items-center w-full h-full overflow-visible"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.8 }}
                  style={{ zIndex: 10, left: "60%" }}
                >
                  {globeLoaded && (
                    <div className="w-[640px] h-[640px] flex items-center justify-center">
                      <GlobeDemo />
                    </div>
                  )}
                </motion.div>
              )}

              {/* Mobile Globe - ensure z-index for interactivity */}
              {isMobile && (
                <motion.div 
                  className="fixed top-0 bottom-0 flex items-center z-[10]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.8 }}
                  style={{ zIndex: 999, left: "40%", right: 0 }}
                >
                  {globeLoaded && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-[112%] h-[112%]">
                        <GlobeDemo />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Scroll to explore text */}
              <motion.div
                className="fixed bottom-16 md:bottom-16 left-0 w-full flex justify-center items-center flex-col gap-1.5 text-center z-30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <div className="text-[10px] font-mono text-cyan-500/70 tracking-wider">
                  SCROLL TO EXPLORE
                </div>
                <motion.div
                  className="h-5 w-[1px] bg-cyan-500/40"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Features Gallery -  refined and professional */}
      <div className="photo gallery">
       
      </div>
      
      {/* Call-to-Action Section - optimized with cleaner design */}
      <div className="relative z-20 bg-gradient-to-t from-black to-gray-950 py-20 pointer-events-auto overflow-hidden">
        {/* Data grid background - simplified */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-8"
            style={{
              backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
                               linear-gradient(to right, rgba(6, 182, 212, 0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          ></div>
          
          {/* Animated energy pulse - simplified */}
          <motion.div 
            className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full -translate-x-1/2 -translate-y-1/2 opacity-15 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, rgba(139, 92, 246, 0.15) 40%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <motion.div 
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-10">
              <motion.div 
                className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 backdrop-blur-md border border-emerald-500/30"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-300 tracking-wide font-mono">ACCESS ENABLED</span>
              </motion.div>
              
              <motion.h2 
                className="text-2xl md:text-4xl font-bold mb-5 bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-purple-400 tracking-tight"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                JOIN THE GLOBAL NETWORK
              </motion.h2>
              
              <motion.p 
                className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                Submit environmental initiatives to our global monitoring system or explore current projects through our interactive visualization platform.
              </motion.p>
            </div>
            
            <motion.div 
              className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="bg-gradient-to-br from-cyan-900/15 to-black/40 backdrop-blur-lg rounded-lg p-6 border border-cyan-500/15 group hover:border-cyan-500/30 transition-all duration-300 hover:shadow-md hover:shadow-cyan-950/20">
                <div className="w-12 h-12 rounded-lg bg-cyan-900/30 flex items-center justify-center mb-4 group-hover:bg-cyan-900/50 transition-colors duration-300">
                  <PlusCircle className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-cyan-300">Submit Activity</h3>
                <p className="text-gray-400 mb-4 text-sm">Register your environmental initiative and connect with the global monitoring network.</p>
              <Button 
                onClick={() => showOverlay('submit')}
                  className="w-full bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50 border border-cyan-700/30 transition-all duration-300"
              >
                  Submit Data <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/15 to-black/40 backdrop-blur-lg rounded-lg p-6 border border-purple-500/15 group hover:border-purple-500/30 transition-all duration-300 hover:shadow-md hover:shadow-purple-950/20">
                <div className="w-12 h-12 rounded-lg bg-purple-900/30 flex items-center justify-center mb-4 group-hover:bg-purple-900/50 transition-colors duration-300">
                  <BarChart2 className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-purple-300">Access Analytics</h3>
                <p className="text-gray-400 mb-4 text-sm">Explore our interactive dashboard displaying real-time global environmental data.</p>
              <Button 
                asChild
                  className="w-full bg-purple-900/40 text-purple-300 hover:bg-purple-800/50 border border-purple-700/30 transition-all duration-300"
              >
                <Link href="/monitor">
                    View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer - clean professional design */}
      <footer className="relative z-20 bg-black py-10 overflow-hidden pointer-events-auto">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Glitch line - subtle */}
          <div 
            className="absolute -top-px left-0 right-0 h-[1px] opacity-60"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.4) 50%, transparent 100%)'
            }}
          ></div>
          
          {/* Circuit pattern - subtle */}
          <div 
            className="absolute inset-0 opacity-3"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z' fill='%2306b6d4' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Logo and tagline */}
            <div className="flex items-center group relative">
              <div className="h-10 w-10 rounded-md bg-gradient-to-r from-cyan-600 to-purple-700 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300">
                <GlobeIcon className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <div className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 tracking-wide">
                  ECOTRACK GLOBAL
                </div>
                <div className="text-[10px] text-gray-500 font-mono tracking-wide">MONITORING SYSTEM v1.9</div>
              </div>
            </div>
            
            {/* Quick links */}
            <div className="flex gap-5 flex-wrap justify-center">
              <Link href="/map" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors pointer-events-auto relative group">
                MAP
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-cyan-500/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <Link href="/monitor" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors pointer-events-auto relative group">
                DASHBOARD
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-cyan-500/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <Link href="/profile" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors pointer-events-auto relative group">
                PROFILE
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-cyan-500/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </Link>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  showOverlay('submit');
                }}
                className="text-sm text-gray-400 hover:text-cyan-400 transition-colors pointer-events-auto relative group"
              >
                SUBMIT
                <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-cyan-500/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </a>
            </div>
            
            {/* Copyright - simplified */}
            <div className="flex items-center gap-3 text-xs text-gray-600 font-mono">
              <span>&copy; {new Date().getFullYear()} ECOTRACK</span>
              <div className="h-1 w-1 rounded-full bg-cyan-500/40"></div>
              <span className="text-gray-700">ID:78EF92A1</span>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Cyberpunk animation keyframes - simplified */}
      <style jsx global>{`
        @keyframes cyberscan {
          0% { background-position: 0 0; }
          100% { background-position: 0 100vh; }
        }
        
        @keyframes scanner {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-blob {
          animation: blob 10s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(20px, -15px) scale(1.1); }
          66% { transform: translate(-15px, 15px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
    </div>
  )
}

// Enhanced Cyberpunk StatCard component - optimized
function CyberpunkStatCard({ 
  title, 
  icon, 
  counter, 
  delay = 0,
  color = "cyan" 
}: { 
  title: string 
  icon: React.ReactNode 
  counter: React.ReactNode 
  delay?: number 
  color?: "cyan" | "purple" | "emerald" | "amber"
}) {
  const colors = {
    cyan: {
      text: "text-cyan-300",
      textShadow: "[text-shadow:0_0_15px_rgba(6,182,212,0.5)]",
      bg: "bg-cyan-950/40", 
      border: "border-cyan-500/30",
      borderGlow: "shadow-[0_0_10px_rgba(6,182,212,0.15)]",
      hoverBorder: "group-hover:border-cyan-500/50",
      hoverGlow: "group-hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]",
      gradient: "from-cyan-500/10 to-transparent"
    },
    purple: {
      text: "text-purple-300",
      textShadow: "[text-shadow:0_0_15px_rgba(168,85,247,0.5)]",
      bg: "bg-purple-950/40",
      border: "border-purple-500/30",
      borderGlow: "shadow-[0_0_10px_rgba(168,85,247,0.15)]",
      hoverBorder: "group-hover:border-purple-500/50",
      hoverGlow: "group-hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]",
      gradient: "from-purple-500/10 to-transparent"
    },
    emerald: {
      text: "text-emerald-300",
      textShadow: "[text-shadow:0_0_15px_rgba(16,185,129,0.5)]",
      bg: "bg-emerald-950/40", 
      border: "border-emerald-500/30",
      borderGlow: "shadow-[0_0_10px_rgba(16,185,129,0.15)]",
      hoverBorder: "group-hover:border-emerald-500/50",
      hoverGlow: "group-hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]",
      gradient: "from-emerald-500/10 to-transparent"
    },
    amber: {
      text: "text-amber-300",
      textShadow: "[text-shadow:0_0_15px_rgba(251,191,36,0.5)]",
      bg: "bg-amber-950/40",
      border: "border-amber-500/30",
      borderGlow: "shadow-[0_0_10px_rgba(251,191,36,0.15)]",
      hoverBorder: "group-hover:border-amber-500/50",
      hoverGlow: "group-hover:shadow-[0_0_15px_rgba(251,191,36,0.25)]",
      gradient: "from-amber-500/10 to-transparent"
    }
  }
  
  const colorConfig = colors[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay }}
    >
      <div 
        className={`
          relative bg-black/70 backdrop-blur-md border ${colorConfig.border} ${colorConfig.hoverBorder} 
          rounded-md p-3.5 group transition-all duration-300 
          ${colorConfig.borderGlow} ${colorConfig.hoverGlow}
          hover:bg-black/80 overflow-hidden
        `}
      >
        {/* Diagonal glowing line */}
        <div className={`absolute h-px bg-gradient-to-r ${colorConfig.gradient} w-full -top-[1px] -left-[1px] right-0`}></div>
        <div className={`absolute w-px bg-gradient-to-b ${colorConfig.gradient} h-full -left-[1px] -top-[1px] bottom-0`}></div>
        
        {/* Background glow effect */}
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-black via-black to-black/0 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`p-1.5 rounded-md ${colorConfig.bg} ${colorConfig.text} group-hover:scale-105 transition-transform`}>
              {icon}
            </div>
            <h3 className="text-xs font-mono tracking-wider text-gray-400 uppercase">{title}</h3>
          </div>
          <div className={`text-xl md:text-2xl font-bold ${colorConfig.text} ${colorConfig.textShadow} transition-all group-hover:scale-105 origin-left`}>
            {counter}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Cyberpunk Feature Card component - optimized
function CyberpunkFeatureCard({ 
  icon, 
  title, 
  description, 
  color = "cyan",
  index = 0
}: { 
  icon: React.ReactNode 
  title: string 
  description: string 
  color?: "cyan" | "purple" | "emerald" | "amber"
  index?: number
}) {
  const colors = {
    cyan: {
      bgLight: "bg-black/70",
      border: "border-cyan-500/30",
      borderHover: "group-hover:border-cyan-500/50", 
      text: "text-cyan-400",
      glow: "shadow-[0_0_15px_rgba(6,182,212,0.15)]",
      hoverGlow: "group-hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]",
      iconBg: "bg-cyan-950/80",
      iconBorder: "border-cyan-500/40",
      textShadow: "[text-shadow:0_0_15px_rgba(6,182,212,0.4)]",
      gradient: "from-cyan-500/10 to-transparent"
    },
    purple: {
      bgLight: "bg-black/70",
      border: "border-purple-500/30",
      borderHover: "group-hover:border-purple-500/50",
      text: "text-purple-400",
      glow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
      hoverGlow: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]",
      iconBg: "bg-purple-950/80",
      iconBorder: "border-purple-500/40",
      textShadow: "[text-shadow:0_0_15px_rgba(168,85,247,0.4)]",
      gradient: "from-purple-500/10 to-transparent"
    },
    emerald: {
      bgLight: "bg-black/70",
      border: "border-emerald-500/30", 
      borderHover: "group-hover:border-emerald-500/50",
      text: "text-emerald-400",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
      hoverGlow: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]",
      iconBg: "bg-emerald-950/80",
      iconBorder: "border-emerald-500/40",
      textShadow: "[text-shadow:0_0_15px_rgba(16,185,129,0.4)]",
      gradient: "from-emerald-500/10 to-transparent"
    },
    amber: {
      bgLight: "bg-black/70",
      border: "border-amber-500/30",
      borderHover: "group-hover:border-amber-500/50",
      text: "text-amber-400",
      glow: "shadow-[0_0_15px_rgba(251,191,36,0.15)]",
      hoverGlow: "group-hover:shadow-[0_0_20px_rgba(251,191,36,0.25)]",
      iconBg: "bg-amber-950/80",
      iconBorder: "border-amber-500/40",
      textShadow: "[text-shadow:0_0_15px_rgba(251,191,36,0.4)]",
      gradient: "from-amber-500/10 to-transparent"
    }
  }
  
  const colorConfig = colors[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <div 
        className={`
          relative h-full flex flex-col gap-4 
          ${colorConfig.bgLight} backdrop-blur-md p-5 
          rounded-lg border ${colorConfig.border} ${colorConfig.borderHover} 
          transition-all duration-300 ${colorConfig.glow} ${colorConfig.hoverGlow}
          hover:translate-y-[-2px] overflow-hidden
        `}
      >
        {/* Border glow effects */}
        <div className={`absolute h-px bg-gradient-to-r ${colorConfig.gradient} w-full -top-[1px] -left-[1px] right-0`}></div>
        <div className={`absolute w-px bg-gradient-to-b ${colorConfig.gradient} h-full -left-[1px] -top-[1px] bottom-0`}></div>
        
        {/* Angled corner accent */}
        <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden">
          <div className={`absolute -top-4 -right-4 w-8 h-8 rotate-45 bg-gradient-to-br ${colorConfig.gradient}`}></div>
        </div>
        
        {/* Icon */}
        <div 
          className={`
            w-12 h-12 ${colorConfig.iconBg} rounded-md 
            flex items-center justify-center ${colorConfig.text} 
            border ${colorConfig.iconBorder} relative 
            group-hover:scale-105 transition-transform duration-300
            shadow-lg shadow-black/50
          `}
        >
          <div className="relative z-10">
            {icon}
          </div>
          <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${colorConfig.gradient}`}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col">
          <h3 className={`text-lg font-medium ${colorConfig.text} ${colorConfig.textShadow} mb-2`}>{title}</h3>
          <p className="text-gray-400 text-sm flex-1">{description}</p>
        </div>
        
        {/* Action */}
        <div className="relative z-10">
          <Button 
            asChild
            variant="link" 
            className={`px-0 py-0 ${colorConfig.text} hover:text-white text-sm flex items-center gap-1 font-medium group-hover:translate-x-1 transition-transform`}
          >
            <Link href="/map">
              <span>Details</span>
              <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
