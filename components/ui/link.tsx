"use client"

import React, { forwardRef, useCallback } from 'react'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { usePerformanceMode } from '@/hooks/use-performance-mode'

interface OptimizedLinkProps extends React.ComponentPropsWithoutRef<typeof NextLink> {
  prefetch?: boolean
  optimizationDisabled?: boolean
  children: React.ReactNode
}

/**
 * OptimizedLink - An enhanced Next.js Link component that improves page transitions
 * 
 * Features:
 * 1. Pre-optimizes page transitions
 * 2. Can disable prefetching for low-performance devices
 * 3. Provides visual feedback during transition
 * 4. Handles page transition state in performance context
 */
export const OptimizedLink = forwardRef<HTMLAnchorElement, OptimizedLinkProps>(
  function OptimizedLink({ 
    href, 
    prefetch = true, 
    optimizationDisabled = false, 
    onClick, 
    children, 
    ...props 
  }, ref) {
    const router = useRouter()
    const pathname = usePathname()
    const { optimizeForNavigation, performanceMode } = usePerformanceMode()
    
    // Apply prefetch strategy based on performance mode
    const shouldPrefetch = prefetch && performanceMode !== 'low'
    
    // Enhanced click handler that optimizes transition
    const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
      // Don't interfere with non-left clicks or modifier keys
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) {
        if (onClick) onClick(e)
        return
      }
      
      // Don't handle hash changes or external links
      const linkHref = href.toString()
      if (
        linkHref.startsWith('#') || 
        linkHref.startsWith('http') || 
        linkHref === pathname
      ) {
        if (onClick) onClick(e)
        return
      }
      
      // Prevent default navigation and handle manually for better transitions
      e.preventDefault()
      
      // Signal that navigation is starting to optimize rendering
      if (!optimizationDisabled) {
        optimizeForNavigation(true)
      }
      
      // Call original onClick if provided
      if (onClick) onClick(e)
      
      // Navigate using router (with transition handled in app shell)
      router.push(linkHref)
    }, [href, onClick, optimizationDisabled, optimizeForNavigation, pathname, router])
    
    return (
      <NextLink
        ref={ref}
        href={href}
        prefetch={shouldPrefetch}
        onClick={handleClick}
        {...props}
      >
        {children}
      </NextLink>
    )
  }
)

export default OptimizedLink 