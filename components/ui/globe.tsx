"use client"

import createGlobe, { COBEOptions } from "cobe"
import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

// Extended options type to include our custom drag settings
interface ExtendedCOBEOptions extends COBEOptions {
  dragSensitivity?: number
  rotationSpeedMultiplier?: number
  enableFastDrag?: boolean
}

const GLOBE_CONFIG: ExtendedCOBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
  // Default values for extreme sensitivity
  dragSensitivity: 1,
  rotationSpeedMultiplier: 10,
  enableFastDrag: false,
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: ExtendedCOBEOptions
}) {
  // Basic state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  
  // Get enhanced options with defaults
  const enhancedConfig = {
    ...GLOBE_CONFIG,
    ...config,
    dragSensitivity: config.dragSensitivity || 1,
    rotationSpeedMultiplier: config.rotationSpeedMultiplier || 10,
    enableFastDrag: config.enableFastDrag || false,
  }
  
  // Interactive state - enhanced for extreme sensitivity
  const phiRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastMouseXRef = useRef(0)
  const velocityRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  
  // Create a render callback with extreme sensitivity
  const onRender = useCallback((state: any) => {
    // Set the phi rotation from our ref
    state.phi = phiRef.current
    
    // Set dimensions
    state.width = width * 2
    state.height = width * 2
    
    // Auto-rotate slowly when not interacting
    if (!isDraggingRef.current) {
      // Apply momentum if there's velocity
      if (Math.abs(velocityRef.current) > 0.001) {
        phiRef.current += velocityRef.current
        // Use configurable friction
        velocityRef.current *= enhancedConfig.enableFastDrag ? 0.98 : 0.95
      } else {
        // Default slow rotation
        phiRef.current += 0.005
      }
    }
  }, [width, enhancedConfig.enableFastDrag])
  
  // Set up mouse handlers with direct DOM access and extreme sensitivity
  const setupMouseHandlers = useCallback(() => {
    if (!wrapperRef.current) return
    
    const wrapper = wrapperRef.current
    let lastX = 0
    let lastTime = 0
    const sensitivity = enhancedConfig.dragSensitivity || 1
    const speedMultiplier = enhancedConfig.rotationSpeedMultiplier || 10
    const enableFastDrag = enhancedConfig.enableFastDrag
    
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      isDraggingRef.current = true
      lastX = e.clientX
      lastTime = Date.now()
      wrapper.style.cursor = 'grabbing'
      
      // Stop any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      
      const now = Date.now()
      const deltaX = e.clientX - lastX
      const deltaTime = now - lastTime
      
      // Update rotation with EXTREME sensitivity using configurable settings
      const rotationDelta = enableFastDrag 
        ? deltaX / (1000 / sensitivity) // Extremely sensitive for fast rotation
        : deltaX / 1000 // Normal sensitivity
      
      phiRef.current += rotationDelta
      
      // Calculate velocity for momentum
      if (deltaTime > 0) {
        // Use configurable speed multiplier
        velocityRef.current = deltaX / deltaTime * (0.1 * speedMultiplier)
      }
      
      lastX = e.clientX
      lastTime = now
    }
    
    const handleMouseUp = () => {
      isDraggingRef.current = false
      wrapper.style.cursor = 'grab'
      
      // Apply velocity-based animation
      if (Math.abs(velocityRef.current) > 0.01) {
        const animate = () => {
          phiRef.current += velocityRef.current
          velocityRef.current *= enableFastDrag ? 0.98 : 0.95 // Less friction for fast drag
          
          if (Math.abs(velocityRef.current) > 0.001) {
            animationRef.current = requestAnimationFrame(animate)
          } else {
            animationRef.current = null
          }
        }
        
        animationRef.current = requestAnimationFrame(animate)
      }
    }
    
    // Touch handlers with the same enhanced logic
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length !== 1) return
      
      isDraggingRef.current = true
      lastX = e.touches[0].clientX
      lastTime = Date.now()
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (!isDraggingRef.current || e.touches.length !== 1) return
      
      const now = Date.now()
      const deltaX = e.touches[0].clientX - lastX
      const deltaTime = now - lastTime
      
      // Update rotation with EXTREME sensitivity
      const rotationDelta = enableFastDrag 
        ? deltaX / (1000 / sensitivity) // Extremely sensitive for fast rotation
        : deltaX / 1000 // Normal sensitivity
      
      phiRef.current += rotationDelta
      
      // Calculate velocity
      if (deltaTime > 0) {
        velocityRef.current = deltaX / deltaTime * (0.1 * speedMultiplier)
      }
      
      lastX = e.touches[0].clientX
      lastTime = now
    }
    
    const handleTouchEnd = () => {
      isDraggingRef.current = false
      
      // Apply velocity animation with enhanced momentum
      if (Math.abs(velocityRef.current) > 0.01) {
        const animate = () => {
          phiRef.current += velocityRef.current
          velocityRef.current *= enableFastDrag ? 0.98 : 0.95 // Less friction for fast drag
          
          if (Math.abs(velocityRef.current) > 0.001) {
            animationRef.current = requestAnimationFrame(animate)
          } else {
            animationRef.current = null
          }
        }
        
        animationRef.current = requestAnimationFrame(animate)
      }
    }
    
    // Add event listeners directly to the document for better capture
    wrapper.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    wrapper.addEventListener('touchstart', handleTouchStart as any)
    document.addEventListener('touchmove', handleTouchMove as any, { passive: false })
    document.addEventListener('touchend', handleTouchEnd as any)
    
    return () => {
      wrapper.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      wrapper.removeEventListener('touchstart', handleTouchStart as any)
      document.removeEventListener('touchmove', handleTouchMove as any)
      document.removeEventListener('touchend', handleTouchEnd as any)
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [enhancedConfig.dragSensitivity, enhancedConfig.rotationSpeedMultiplier, enhancedConfig.enableFastDrag])
  
  // Initialize globe and mouse handlers
  useEffect(() => {
    // Handle resize
    const handleResize = () => {
      if (canvasRef.current) {
        setWidth(canvasRef.current.offsetWidth)
      }
    }
    
    window.addEventListener('resize', handleResize)
    handleResize()
    
    // Create globe
    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: width * 2,
      height: width * 2,
      onRender,
    })

    // Set up mouse interaction
    const cleanupMouseHandlers = setupMouseHandlers()
    
    // Fade in
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = '1'
      }
    }, 200)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      globe.destroy()
      cleanupMouseHandlers?.()
    }
  }, [width, config, onRender, setupMouseHandlers])

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative w-full h-full cursor-grab",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
      />
    </div>
  )
} 