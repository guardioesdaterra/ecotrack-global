"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: "default" | "secondary" | "info" | "warning" | "danger"
  }
>(({ className, variant = "default", sideOffset = 4, children, ...props }, ref) => {
  // Define variantes de cores
  const variantClasses = {
    default: "border-cyan-500/30 bg-black/90 shadow-cyan-500/20 text-cyan-50",
    secondary: "border-purple-500/30 bg-black/90 shadow-purple-500/20 text-purple-50",
    info: "border-blue-500/30 bg-black/90 shadow-blue-500/20 text-blue-50",
    warning: "border-amber-500/30 bg-black/90 shadow-amber-500/20 text-amber-50",
    danger: "border-red-500/30 bg-black/90 shadow-red-500/20 text-red-50"
  }
  
  // Defina a cor do glow com base na variante
  const glowColor = {
    default: "rgba(6, 182, 212, 0.2)",
    secondary: "rgba(147, 51, 234, 0.2)",
    info: "rgba(59, 130, 246, 0.2)",
    warning: "rgba(245, 158, 11, 0.2)",
    danger: "rgba(239, 68, 68, 0.2)"
  }
  
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border px-3 py-2 text-xs shadow-lg backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {/* Animation wrapper */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="relative z-10"
      >
        {children}
      </motion.div>
      
      {/* Glow border overlay effect */}
      <div className="absolute inset-0 neon-border rounded-md pointer-events-none"></div>
      
      {/* Subtle scanline effect */}
      <div className="absolute inset-0 scanline opacity-5 pointer-events-none"></div>
      
      {/* Inner glow */}
      <div 
        className="absolute inset-0 opacity-20 rounded-md pointer-events-none"
        style={{
          boxShadow: `inset 0 0 15px ${glowColor[variant]}`
        }}
      ></div>
      
      {/* Diagonal line pattern for cyberpunk style */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            ${glowColor[variant]} 10px,
            ${glowColor[variant]} 11px
          )`
        }}
      ></div>
      
      <TooltipPrimitive.Arrow className="fill-current" />
    </TooltipPrimitive.Content>
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
