"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Globe, Users, Leaf, Award, DollarSign, ArrowRight, ChevronDown, Sparkles, Search, PlusCircle, ArrowDown, Wind, Battery, ExternalLink, BarChart2 } from "lucide-react"
import { InitiativesCount, CountriesCount, DirectBeneficiariesCount, IndirectBeneficiariesCount } from "@/components/InitiativesCount"
import dynamic from 'next/dynamic'
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useOverlay } from "@/contexts/overlay-context"
import { supabase } from "@/lib/supabaseClient"
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
            <Globe className="h-8 w-8 text-white animate-spin-slow" />
          </div>
        </div>
      </div>
    )
  }
)

export default function Home() {
  const { showOverlay } = useOverlay()
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [scrollY, setScrollY] = useState(0)
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, 300])
  const [isVisible, setIsVisible] = useState(true)
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Handle cursor position for desktop effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])
  
  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
      
      // Hide elements when scrolled past hero section
      if (heroRef.current) {
        const heroHeight = heroRef.current.offsetHeight
        setIsVisible(window.scrollY < heroHeight - 100)
      }
    }
    
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])
  
  // Fetch activities data for the map
  useEffect(() => {
    async function fetchActivities() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('ecotrack')
          .select('*')
          .limit(50) // Limit for better performance
        
        if (error) throw error
        
        if (data) {
          // Transform database data to match activity interface
          const activitiesData = data.map(item => ({
            id: item.id ? parseInt(item.id.toString()) : Math.floor(Math.random() * 10000),
            title: item.title || 'Untitled Activity',
            type: item.type || 'other',
            description: item.description || '',
            lat: item.latitude || item.lat || 0,
            lng: item.longitude || item.lng || 0,
            country: item.country || 'Unknown',
            adress: item.city ? `${item.city}, ${item.country || ''}` : undefined,
            responsible: item.responsible || 'Unknown'
          }))
          
          setActivities(activitiesData)
        }
      } catch (error) {
        console.error("Error fetching activities:", error)
        // Fallback to empty array
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchActivities()
  }, [])
  
  // Generate particles on client-side only
  useEffect(() => {
    const container = document.getElementById('particles-container');
    if (!container) return;
    
    // Clear any existing particles (for hot reloading)
    container.innerHTML = '';
    
    // Generate particles on client-side only
    Array.from({ length: 20 }).forEach((_, i) => {
      const particle = document.createElement('div');
      particle.className = 'absolute rounded-full opacity-40 pointer-events-none';
      
      const width = 4 + Math.random() * 6;
      const height = 4 + Math.random() * 6;
      const isEven = i % 2 === 0;
      const color = isEven ? '#06b6d4' : '#8b5cf6';
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const duration = 10 + Math.random() * 20;
      const delay = Math.random() * 10;
      
      Object.assign(particle.style, {
        width: `${width}px`,
        height: `${height}px`,
        background: color,
        boxShadow: `0 0 10px ${color}`,
        top: `${top}%`,
        left: `${left}%`,
        animation: `float ${duration}s linear infinite`,
        animationDelay: `-${delay}s`,
      });
      
      container.appendChild(particle);
    });
  }, []);
  
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Animated cursor glow effect (desktop only) */}
      {!isMobile && (
        <div 
          className="fixed w-[500px] h-[500px] rounded-full pointer-events-none z-10 opacity-40 hidden md:block"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.2) 0%, rgba(34,211,238,0) 70%)',
            transform: `translate(${cursorPosition.x - 250}px, ${cursorPosition.y - 250}px)`,
            transition: 'transform 0.15s ease-out'
          }}
        />
      )}
      
      {/* Map Layer */}
      <div className="fixed inset-0 w-full h-full z-[5]">
        <MapClientNoSSR activities={activities} />
      </div>
      
      {/* Black overlay for better readability - no pointer events */}
      <div className="fixed inset-0 bg-black/30 z-[6] pointer-events-none"></div>
      
      {/* Main Content */}
      <div className="relative z-[15] h-screen pointer-events-none">
        {/* Hero Section */}
        <div 
          ref={heroRef}
          className="relative h-screen w-full overflow-hidden"
          style={{
            perspective: "1000px"
          }}
        >
          {/* Decorative grid lines */}
          <div className="absolute inset-0 z-[1] opacity-20 pointer-events-none" 
            style={{
              backgroundImage: 'linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px'
            }}
          ></div>
          
          {/* Animated glowing shapes */}
          <div className="absolute top-1/6 left-1/4 w-64 h-64 rounded-full bg-cyan-500/10 animate-blob blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-purple-500/10 animate-blob animation-delay-2000 blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-emerald-500/10 animate-blob animation-delay-4000 blur-3xl pointer-events-none"></div>

          {/* Cyberpunk scan line effect */}
          <div 
            className="absolute inset-0 z-[2] pointer-events-none opacity-5"
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent 0px, transparent 1px, rgba(6, 182, 212, 0.2) 2px, transparent 3px, transparent 9px)',
              backgroundSize: '100% 10px',
              animation: 'cyberscan 15s linear infinite',
            }}
          ></div>
          
          {/* Main hero content container */}
          <div className="container mx-auto px-4 h-full flex flex-col justify-start items-start pt-20 md:pt-28 pb-20 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-3xl pointer-events-auto"
              style={{
                transform: `translateY(${Math.min(scrollY * 0.2, 30)}px)`
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="inline-block mb-2 md:mb-3 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-gradient-to-r from-cyan-900/40 to-purple-900/40 backdrop-blur-md border border-cyan-500/30"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
                  <span className="text-[10px] md:text-xs font-medium text-cyan-300">Global Eco-Monitoring Platform</span>
                </div>
              </motion.div>
              
              <motion.h1 
                className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                <div className="relative">
                  <span className="absolute -inset-1 blur-lg bg-gradient-to-r from-cyan-500/20 to-purple-600/20 opacity-70"></span>
                  <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-600">
                    Track Environmental
                  </span>
                </div>
                <div className="relative mt-1">
                  <span className="absolute -inset-1 blur-lg bg-gradient-to-r from-cyan-500/20 to-purple-600/20 opacity-70"></span>
                  <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                    Initiatives Worldwide
                  </span>
                </div>
              </motion.h1>
              
              <motion.div 
                className="text-base md:text-lg lg:text-xl text-gray-200 mb-6 md:mb-8 max-w-2xl backdrop-blur-sm bg-black/10 p-3 md:p-4 rounded-lg border border-white/5 relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.6 }}
              >
                <div className="absolute -top-px left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                <div className="absolute -bottom-px left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                
                <p>
                Join the global movement to monitor, support, and participate in 
                <span className="text-cyan-300 font-medium"> environmental conservation </span> 
                efforts across our planet.
                  <span className="block mt-2 text-sm text-cyan-400/80">Click on any marker to explore environmental initiatives.</span>
                </p>
              </motion.div>
              
              <motion.div 
                className="flex flex-wrap gap-3 md:gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.8 }}
              >
                <Button 
                  onClick={() => showOverlay('submit')}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-full relative group overflow-hidden pointer-events-auto"
                  size="lg"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-30 group-active:opacity-50 transition-opacity"></span>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Submit Activity
                </Button>
                
                <Button
                  asChild
                  variant="outline" 
                  className="text-cyan-300 border-cyan-800/60 bg-cyan-950/20 hover:bg-cyan-900/30 hover:text-cyan-200 rounded-full backdrop-blur-md pointer-events-auto"
                  size="lg"
                >
                  <Link href="/map">
                    <Globe className="mr-2 h-4 w-4" />
                    Explore Map
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
            
            {/* Interactive scroll indicator */}
            <motion.div 
              className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: isVisible ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.span 
                className="text-xs text-cyan-400/70"
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                Scroll to explore
              </motion.span>
              <motion.div 
                className="w-6 h-10 border border-cyan-500/50 rounded-full flex justify-center items-start p-1"
                animate={{ boxShadow: ['0 0 0px rgba(6, 182, 212, 0.2)', '0 0 10px rgba(6, 182, 212, 0.4)', '0 0 0px rgba(6, 182, 212, 0.2)'] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <motion.div 
                  className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                  animate={{ y: [0, 14, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </motion.div>
            </motion.div>
            
            {/* Stats Cards */}
            <motion.div 
              className="absolute bottom-24 sm:bottom-16 left-0 right-0 z-20 pointer-events-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.2 }}
            >
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  <StatCard 
                    title="Initiatives" 
                    icon={<Award className="w-5 h-5 text-cyan-400" />}
                    counter={<InitiativesCount />}
                    delay={0}
                  />
                  <StatCard 
                    title="Countries" 
                    icon={<Globe className="w-5 h-5 text-purple-400" />}
                    counter={<CountriesCount />}
                    delay={0.1}
                  />
                  <StatCard 
                    title="Direct Impact" 
                    icon={<Users className="w-5 h-5 text-emerald-400" />}
                    counter={<DirectBeneficiariesCount />}
                    delay={0.2}
                  />
                  <StatCard 
                    title="Indirect Impact" 
                    icon={<Sparkles className="w-5 h-5 text-amber-400" />}
                    counter={<IndirectBeneficiariesCount />}
                    delay={0.3}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Features Sections with Cyberpunk Style */}
      <div className="relative z-20 bg-gradient-to-b from-black via-gray-900/95 to-black pointer-events-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-1 left-0 right-0 h-[1px] opacity-80 z-10"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.8) 50%, transparent 100%)'
            }}
          ></div>
          
          {/* Decorative grid pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          ></div>
          
          {/* Floating digital particles */}
          <div id="particles-container" className="absolute inset-0 overflow-hidden pointer-events-none"></div>
        </div>
        
        <div className="container mx-auto py-24 md:py-32 px-4">
          <motion.div 
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500">
                How EcoTrack Works
              </span>
              <div className="absolute -bottom-2 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500 via-purple-500 to-transparent"></div>
            </h2>
            <p className="text-gray-300 text-lg">
              Our platform connects environmental initiatives worldwide through advanced monitoring and real-time data visualization
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-10 md:gap-8">
            <FeatureCard 
              icon={<Globe className="h-8 w-8" />} 
              title="Global Tracking" 
              description="Monitor environmental initiatives across the globe with real-time mapping and comprehensive data visualization."
              color="cyan"
              index={0}
            />
            <FeatureCard 
              icon={<Battery className="h-8 w-8" />} 
              title="Resource Monitoring" 
              description="Track resource allocation, impact measurements, and project outcomes with advanced analytics."
              color="purple"
              index={1}
            />
            <FeatureCard 
              icon={<Wind className="h-8 w-8" />} 
              title="Impact Visualization" 
              description="See the direct and indirect effects of environmental initiatives through dynamic visualization tools."
              color="emerald"
              index={2}
            />
          </div>
        </div>
      </div>
      
      {/* Call-to-Action Section */}
      <div className="relative z-20 bg-gradient-to-t from-black to-gray-900/80 py-16 md:py-24 pointer-events-auto">
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center justify-center p-1 rounded-full bg-gradient-to-r from-cyan-700/20 to-purple-700/20 mb-5 border border-cyan-800/30">
              <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full px-4 py-1">
                <span className="text-sm text-cyan-400 font-medium">Ready to make an impact?</span>
              </div>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
              Join the Global Environmental Movement
            </h2>
            
            <p className="text-gray-300 text-lg mb-10 max-w-2xl mx-auto">
              Contribute to environmental conservation efforts by submitting your initiatives, tracking global projects, or connecting with organizations worldwide.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                onClick={() => showOverlay('submit')}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-full relative group overflow-hidden pointer-events-auto"
                size="lg"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-30 group-active:opacity-50 transition-opacity"></span>
                <PlusCircle className="mr-2 h-4 w-4" />
                Submit Activity
              </Button>
              
              <Button 
                asChild
                variant="outline" 
                className="text-cyan-300 border-cyan-800/60 bg-cyan-950/20 hover:bg-cyan-900/30 hover:text-cyan-200 rounded-full backdrop-blur-md pointer-events-auto"
                size="lg"
              >
                <Link href="/monitor">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  View Dashboard
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer with Cyberpunk style */}
      <footer className="relative z-20 bg-black py-12 overflow-hidden pointer-events-auto">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute -top-1 left-0 right-0 h-[1px] opacity-80"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.5) 50%, transparent 100%)'
            }}
          ></div>
          
          {/* Digital circuit pattern */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(6, 182, 212, 0.3) 25%, rgba(6, 182, 212, 0.3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.3) 75%, rgba(6, 182, 212, 0.3) 76%, transparent 77%, transparent), 
                               linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, 0.3) 25%, rgba(6, 182, 212, 0.3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.3) 75%, rgba(6, 182, 212, 0.3) 76%, transparent 77%, transparent)`,
              backgroundSize: '50px 50px',
            }}
          ></div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Logo and tagline */}
            <div className="flex items-center group relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all duration-300">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse opacity-0 group-hover:opacity-60 blur-sm"></div>
                <Globe className="h-5 w-5 text-white relative" />
              </div>
              <div className="ml-3">
                <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 tracking-wider group-hover:from-cyan-300 group-hover:to-purple-500 transition-all duration-300">
                  EcoTrack Global
                </div>
                <div className="text-xs text-gray-500">Environmental Monitoring Platform</div>
              </div>
            </div>
            
            {/* Quick links */}
            <div className="flex gap-6 flex-wrap justify-center">
              <Link href="/map" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors pointer-events-auto">Map</Link>
              <Link href="/monitor" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors pointer-events-auto">Dashboard</Link>
              <Link href="/profile" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors pointer-events-auto">Profile</Link>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  showOverlay('submit');
                }}
                className="text-sm text-gray-400 hover:text-cyan-400 transition-colors pointer-events-auto"
              >
                Submit Activity
              </a>
            </div>
            
            {/* Copyright */}
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 opacity-50"></div>
              <span>&copy; {new Date().getFullYear()} EcoTrack Global</span>
              <div className="h-1.5 w-1.5 rounded-full bg-purple-500 opacity-50"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Improved StatCard component
function StatCard({ 
  title, 
  icon, 
  counter, 
  delay = 0 
}: { 
  title: string 
  icon: React.ReactNode 
  counter: React.ReactNode 
  delay?: number 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay + 1 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200"></div>
      <div className="relative bg-black/60 backdrop-blur-xl border border-cyan-900/50 rounded-lg p-4 flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-gray-800/50 text-white">
            {icon}
          </div>
          <h3 className="text-sm font-medium text-gray-300">{title}</h3>
        </div>
        <div className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          {counter}
        </div>
      </div>
    </motion.div>
  )
}

// Feature card component with cyberpunk styling
function FeatureCard({ 
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
      bgLight: "bg-cyan-500/10",
      bgDark: "bg-cyan-900/20",
      border: "border-cyan-800/50",
      text: "text-cyan-400",
      shadow: "shadow-cyan-400/20",
      glow: "from-cyan-400/20 to-cyan-600/5"
    },
    purple: {
      bgLight: "bg-purple-500/10",
      bgDark: "bg-purple-900/20",
      border: "border-purple-800/50",
      text: "text-purple-400",
      shadow: "shadow-purple-400/20",
      glow: "from-purple-400/20 to-purple-600/5"
    },
    emerald: {
      bgLight: "bg-emerald-500/10",
      bgDark: "bg-emerald-900/20",
      border: "border-emerald-800/50",
      text: "text-emerald-400",
      shadow: "shadow-emerald-400/20",
      glow: "from-emerald-400/20 to-emerald-600/5"
    },
    amber: {
      bgLight: "bg-amber-500/10",
      bgDark: "bg-amber-900/20",
      border: "border-amber-800/50",
      text: "text-amber-400",
      shadow: "shadow-amber-400/20",
      glow: "from-amber-400/20 to-amber-600/5"
    }
  }
  
  const colorSet = colors[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="relative group"
    >
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${colorSet.glow} rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200`}></div>
      <div className="relative flex flex-col gap-4 bg-black/60 backdrop-blur-xl p-6 rounded-lg shadow-lg border border-gray-800/70 group-hover:border-gray-700/80 transition-all duration-300">
        {/* Icon */}
        <div className={`w-14 h-14 ${colorSet.bgDark} rounded-lg flex items-center justify-center ${colorSet.text} ${colorSet.border} border shadow-sm relative overflow-hidden group-hover:scale-105 transition-transform duration-300`}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div 
              className="absolute inset-0 opacity-40" 
              style={{
                background: `radial-gradient(circle at center, ${colorSet.text}30 0%, transparent 70%)`
              }}
            ></div>
            <div className="absolute -inset-1 opacity-30 blur-md" 
              style={{
                background: `radial-gradient(circle at center, ${colorSet.text}20 0%, transparent 70%)`
              }}
            ></div>
          </div>
          <div className="relative z-10">
            {icon}
          </div>
        </div>
        
        {/* Title */}
        <h3 className={`text-xl font-bold ${colorSet.text}`}>{title}</h3>
        
        {/* Description */}
        <p className="text-gray-400">{description}</p>
        
        {/* Action */}
        <div className="mt-3">
          <Button 
            asChild
            variant="link" 
            className={`px-0 py-0 ${colorSet.text} hover:text-white text-sm flex items-center gap-1`}
          >
            <Link href="/map">
              <span>Learn more</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
