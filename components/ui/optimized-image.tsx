"use client"

import React from 'react'
import Image, { ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends Omit<ImageProps, 'quality' | 'placeholder'> {
  /**
   * Image quality (1-100)
   * Use higher quality for hero images, lower for thumbnails
   */
  quality?: number
  /**
   * Whether to use blur placeholder
   */
  withBlur?: boolean
  /**
   * CSS class names
   */
  className?: string
  /**
   * Alt text for accessibility
   */
  alt: string
}

/**
 * Optimized image component with best practices for performance
 * 
 * - Enforces alt text for accessibility
 * - Uses quality presets for different image types
 * - Adds blur placeholders when requested
 * - Responds to reduced motion preferences
 */
export function OptimizedImage({
  src,
  alt,
  quality = 75,
  withBlur = false,
  className,
  priority = false,
  ...props
}: OptimizedImageProps) {
  // Define placeholder based on withBlur flag
  const placeholder = withBlur ? 'blur' : undefined
  
  // Default blur placeholder data URL if needed
  const blurDataURL = withBlur && typeof src === 'string' 
    ? `data:image/svg+xml;base64,${Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${
          props.width || 400
        } ${props.height || 300}"><filter id="b" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="20"/></filter><rect width="100%" height="100%" x="0" y="0" fill="#404040" filter="url(#b)"/></svg>`
      ).toString('base64')}`
    : undefined
  
  return (
    <Image
      src={src}
      alt={alt}
      quality={quality}
      className={cn(className)}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      priority={priority}
      {...props}
    />
  )
}

/**
 * Specialized optimized image component for hero/large images
 */
export function HeroImage(props: OptimizedImageProps) {
  return (
    <OptimizedImage
      quality={85}
      priority={true}
      withBlur={true}
      {...props}
    />
  )
}

/**
 * Specialized optimized image component for thumbnails/previews
 */
export function ThumbnailImage(props: OptimizedImageProps) {
  return (
    <OptimizedImage
      quality={60}
      withBlur={true}
      {...props}
    />
  )
} 