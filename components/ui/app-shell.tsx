"use client"

import React, { useEffect, useState, useTransition, Suspense, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePerformanceMode } from '@/hooks/use-performance-mode'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { optimizeForNavigation, performanceMode, shouldReduceAnimations } = usePerformanceMode()
  const [isPending, startTransition] = useTransition()
  const [key, setKey] = useState(pathname)
  
  // Cache page content between transitions to prevent flashing
  const cachedContent = useMemo(() => ({ content: children }), [children])
  
  // Handle page transitions with useTransition
  useEffect(() => {
    if (key !== pathname) {
      startTransition(() => {
        // Using startTransition to mark navigation updates as transitions
        // This prevents the UI from being blocked during the transition
        optimizeForNavigation(true)
        setKey(pathname)
        
        // Clean up after transition completes
        setTimeout(() => {
          optimizeForNavigation(false)
        }, 200) // Reduced from 300ms to 200ms for faster perception
      })
    }
  }, [pathname, key, optimizeForNavigation, startTransition])
  
  // Adapt animation speed based on performance mode
  const pageTransition = shouldReduceAnimations 
    ? { duration: 0.15 } 
    : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] } // Using optimized cubic-bezier
  
  // Completely disable animations in low performance mode
  if (performanceMode === "low") {
    return <div className="flex flex-col min-h-screen">{children}</div>
  }
  
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Loading indicator - only show during transitions */}
      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-cyan-500 via-purple-600 to-cyan-500 h-0.5">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" 
               style={{ backgroundSize: '200% 100%', animationDuration: '1s' }} />
        </div>
      )}
      
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse"></div>
        </div>
      }>
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            className="flex-1 flex flex-col w-full"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.9 }}
            transition={pageTransition}
          >
            {cachedContent.content}
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </div>
  )
}

// Component for heavy pages that shouldn't have transitions
export function StaticPage({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 flex flex-col">{children}</div>
} 