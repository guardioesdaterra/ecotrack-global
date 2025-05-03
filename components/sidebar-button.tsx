"use client"

import React from "react"
import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useOverlay } from "@/contexts/overlay-context"
import { cn } from "@/lib/utils"

interface SidebarButtonProps {
  icon: React.ReactNode
  label: string
  href?: string
  overlayType?: "submit" | "monitor"
  onClick?: () => void
}

export default function SidebarButton({
  icon,
  label,
  href,
  overlayType,
  onClick,
}: SidebarButtonProps) {
  const pathname = usePathname()
  const { showOverlay } = useOverlay()
  
  const isActive = href ? pathname === href : false
  
  const handleClick = () => {
    if (overlayType) {
      showOverlay(overlayType)
    }
    
    if (onClick) {
      onClick()
    }
  }
  
  const button = (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={cn(
        "relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200",
        isActive 
          ? "bg-cyan-900/40 text-cyan-400 shadow-[0_0_12px_rgba(8,145,178,0.5)]"
          : "text-gray-400 hover:bg-gray-800/40 hover:text-cyan-300"
      )}
    >
      {isActive && (
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
      )}
      <div>{icon}</div>
      
      {/* Animated active glow effect */}
      {isActive && (
        <div className="absolute inset-0 rounded-full border border-cyan-500/40 animate-pulse"></div>
      )}
    </motion.button>
  )
  
  if (href && !overlayType) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href} className="w-full flex justify-center">{button}</Link>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            className="bg-black/90 text-cyan-400 border-cyan-900/50 backdrop-blur-md shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          >
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full flex justify-center">{button}</div>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="bg-black/90 text-cyan-400 border-cyan-900/50 backdrop-blur-md shadow-[0_0_10px_rgba(6,182,212,0.2)]"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 