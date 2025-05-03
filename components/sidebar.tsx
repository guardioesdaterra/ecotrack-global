"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  MapPin, 
  BarChart2, 
  PlusSquare,
  Plus,
  Home,
  Layers
} from "lucide-react"
import { useOverlay } from "@/contexts/overlay-context"
import { motion } from "framer-motion"

export function Sidebar() {
  const pathname = usePathname()
  const { showOverlay } = useOverlay()
  const [glitchIndex, setGlitchIndex] = useState<number | null>(null)
  
  // Randomized glitch effect on hover
  useEffect(() => {
    if (glitchIndex !== null) {
      const timeout = setTimeout(() => {
        setGlitchIndex(null)
      }, 1000)
      
      return () => clearTimeout(timeout)
    }
  }, [glitchIndex])
  
  return (
    <>
      {/* Mobile Sidebar - Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden">
        <div className="relative">
          {/* Decorative tech pattern */}
          <div 
            className="absolute -top-6 left-0 right-0 h-6 opacity-30"
            style={{
              backgroundImage: `
                repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(6,182,212,0.5) 20px, rgba(6,182,212,0.5) 21px),
                repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(147,51,234,0.5) 40px, rgba(147,51,234,0.5) 41px)
              `,
              backgroundSize: '100% 3px',
              backgroundRepeat: 'repeat-x'
            }}
          />
          
          {/* Glowing top border effect */}
          <div className="absolute -top-px left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent"></div>
          
          {/* Main sidebar content */}
          <div className="bg-black/95 backdrop-blur-xl border-t border-cyan-500/30 shadow-[0_-5px_20px_rgba(0,0,0,0.7)] relative overflow-hidden">
            {/* Subtle scanline effect */}
            <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
            
            <div className="flex items-center justify-around h-16 px-2 max-w-screen-xl mx-auto">
              <SidebarItem 
                href="/" 
                icon={<Home className="h-5 w-5" />} 
                label="Home"
                isActive={pathname === "/"} 
                index={0}
                onHover={() => setGlitchIndex(0)}
                isGlitching={glitchIndex === 0}
              />
              
              <SidebarItem 
                href="/map" 
                icon={<MapPin className="h-5 w-5" />} 
                label="Map"
                isActive={pathname === "/map"} 
                index={1}
                onHover={() => setGlitchIndex(1)}
                isGlitching={glitchIndex === 1}
              />
              
              {/* Center add button with special styling - Mobile */}
              <div className="flex flex-col items-center justify-center">
                <button
                onClick={() => showOverlay('submit')} 
                  className="relative flex items-center justify-center"
                >
                  {/* Remove rectangular background with pure circular design */}
                  <div className="relative w-9 h-9 flex items-center justify-center bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                </button>
                <span className="text-xs mt-1 font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
                  Add
                </span>
              </div>
              
              <SidebarItem 
                href="/monitor" 
                icon={<BarChart2 className="h-5 w-5" />} 
                label="Monitor"
                isActive={pathname === "/monitor"} 
                index={2}
                onHover={() => setGlitchIndex(2)}
                isGlitching={glitchIndex === 2}
              />
              
              <SidebarItem 
                href="/profile" 
                icon={<Layers className="h-5 w-5" />} 
                label="Profile"
                isActive={pathname === "/profile"} 
                index={3}
                onHover={() => setGlitchIndex(3)}
                isGlitching={glitchIndex === 3}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - Right Side */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 transform z-[999] hidden sm:block">
        <div className="relative">
          {/* Decorative tech pattern */}
          <div 
            className="absolute top-0 -left-6 bottom-0 w-6 opacity-30"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(6,182,212,0.5) 20px, rgba(6,182,212,0.5) 21px),
                repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(147,51,234,0.5) 40px, rgba(147,51,234,0.5) 41px)
              `,
              backgroundSize: '3px 100%',
              backgroundRepeat: 'repeat-y'
            }}
          />
          
          {/* Glowing left border effect */}
          <div className="absolute -left-px top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/70 to-transparent"></div>
          
          {/* Main sidebar content */}
          <div className="bg-black/90 backdrop-blur-xl border-l border-cyan-500/30 shadow-[-5px_0_20px_rgba(0,0,0,0.4)] rounded-l-xl overflow-hidden py-4 px-2 relative">
            {/* Subtle scanline effect */}
            <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
            
            <div className="flex flex-col items-center gap-7">
              <SidebarItem 
                href="/" 
                icon={<Home className="h-5 w-5" />} 
                label="Home"
                isActive={pathname === "/"} 
                vertical
                index={0}
                onHover={() => setGlitchIndex(0)}
                isGlitching={glitchIndex === 0}
              />
              
              <SidebarItem 
                href="/map" 
                icon={<MapPin className="h-5 w-5" />} 
                label="Map"
                isActive={pathname === "/map"} 
                vertical
                index={1}
                onHover={() => setGlitchIndex(1)}
                isGlitching={glitchIndex === 1}
              />
              
              {/* Center add button with special styling */}
              <SidebarAction 
                onClick={() => showOverlay('submit')} 
                icon={
                  <div className="relative flex items-center justify-center">
                    {/* Simplified to pure circular design with subtle shadow */}
                    <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                  </div>
                } 
                label="Add"
                className="flex items-center"
              />
              
              <SidebarItem 
                href="/monitor" 
                icon={<BarChart2 className="h-5 w-5" />} 
                label="Monitor"
                isActive={pathname === "/monitor"} 
                vertical
                index={2}
                onHover={() => setGlitchIndex(2)}
                isGlitching={glitchIndex === 2}
              />
              
              <SidebarItem 
                href="/profile" 
                icon={<Layers className="h-5 w-5" />} 
                label="Profile"
                isActive={pathname === "/profile"} 
                vertical
                index={3}
                onHover={() => setGlitchIndex(3)}
                isGlitching={glitchIndex === 3}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

interface SidebarItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive?: boolean
  className?: string
  vertical?: boolean
  index?: number
  onHover?: () => void
  isGlitching?: boolean
}

function SidebarItem({ 
  href, 
  icon, 
  label, 
  isActive, 
  className, 
  vertical = false, 
  index = 0,
  onHover,
  isGlitching = false
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex transition-all duration-300 relative group",
        vertical ? "flex-col items-center w-14 py-2" : "flex-col items-center justify-center px-1",
        isActive ? "text-cyan-400" : "text-gray-500 hover:text-gray-300",
        className
      )}
      onMouseEnter={onHover}
    >
      <div className={cn(
        "relative transition-all duration-300",
        isActive && "after:absolute after:w-1 after:h-1 after:bg-cyan-400 after:rounded-full after:shadow-[0_0_8px_rgba(34,211,238,0.8)] after:animate-pulse",
        vertical && isActive ? "after:left-0 after:top-1/2 after:-translate-y-1/2" : "after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:-mb-1"
      )}>
        {isGlitching ? (
          <motion.div
            initial={{ opacity: 1, x: 0 }}
            animate={{ 
              opacity: [1, 0.3, 1, 0.6, 1],
              x: [0, -1, 1, -1, 0]
            }}
            transition={{ duration: 0.5, times: [0, 0.2, 0.4, 0.6, 1] }}
            className="text-cyan-400"
          >
            {icon}
          </motion.div>
        ) : (
          <div className="transition-all duration-300">
            {icon}
          </div>
        )}
        
        {/* Background glow effect */}
        <div className="absolute inset-0 -m-2 rounded-md bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors duration-300"></div>
      </div>
      
      {/* Label with glow effect on hover */}
      <span className={cn(
        "text-xs mt-1 font-medium transition-all duration-300",
        isActive ? "text-glow-cyan" : "group-hover:text-glow-cyan"
      )}>
        {label}
      </span>
      
      {/* Active indicator line */}
      {isActive && (
        <motion.div
          className={cn(
            "bg-gradient-to-r from-cyan-500 to-purple-600 absolute",
            vertical ? "w-[3px] h-5 -left-2 top-1/2 -translate-y-1/2" : "h-[3px] w-5 -bottom-2 left-1/2 -translate-x-1/2"
          )}
          layoutId={`sidebar-active-${vertical ? "vertical" : "horizontal"}`}
          transition={{ type: "spring", duration: 0.5 }}
          style={{ 
            boxShadow: "0 0 10px rgba(6, 182, 212, 0.7)" 
          }}
        />
      )}
    </Link>
  )
}

interface SidebarActionProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  className?: string
  vertical?: boolean
}

function SidebarAction({ onClick, icon, label, className, vertical = false }: SidebarActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex transition-colors relative group",
        vertical ? "flex-col items-center w-14 py-2" : "flex-col items-center justify-center px-1",
        "text-gray-200",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs mt-1 font-medium transition-all duration-300 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
        {label}
      </span>
    </button>
  )
} 