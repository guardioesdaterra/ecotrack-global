"use client"

import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { PhotoGalleryProps } from './types';
import { useEffects } from '@/lib/effects';
import { X } from 'lucide-react';

// Define action types for our gallery reducer
type GalleryAction = 
  | { type: 'NEXT_IMAGE'; total: number }
  | { type: 'PREV_IMAGE'; total: number }
  | { type: 'SET_TRANSITIONING'; isTransitioning: boolean }
  | { type: 'RESET'; index?: number };

// Define state type for our gallery reducer
interface GalleryState {
  currentIndex: number;
  isTransitioning: boolean;
}

// Reducer function to handle state transitions
function galleryReducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case 'NEXT_IMAGE':
      return {
        ...state,
        currentIndex: (state.currentIndex + 1) % action.total,
        isTransitioning: false
      };
    case 'PREV_IMAGE':
      return {
        ...state,
        currentIndex: (state.currentIndex - 1 + action.total) % action.total,
        isTransitioning: false
      };
    case 'SET_TRANSITIONING':
      return {
        ...state,
        isTransitioning: action.isTransitioning
      };
    case 'RESET':
      return {
        currentIndex: action.index || 0,
        isTransitioning: false
      };
    default:
      return state;
  }
}

/**
 * Component to display a photo gallery for activities
 */
export function PhotoGallery({ 
  photos, 
  isOpen, 
  onClose, 
  activityTitle, 
  activityColor 
}: PhotoGalleryProps) {
  // Replace individual useState calls with useReducer for related state
  const [galleryState, dispatch] = useReducer(galleryReducer, {
    currentIndex: 0,
    isTransitioning: false
  });
  
  const { currentIndex, isTransitioning } = galleryState;
  
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const { shouldReduceAnimations } = useEffects();
  
  // Validate photos array for safety
  const validatedPhotos = useMemo(() => {
    if (!Array.isArray(photos)) {
      console.warn('Invalid photos data:', photos);
      return [];
    }
    return photos.filter(p => typeof p === 'string' && p.trim() !== '');
  }, [photos]);
  
  // Memoize the transition duration to avoid frequent recalculations
  const transitionDuration = useMemo(() => 
    shouldReduceAnimations ? 500 : 300, 
    [shouldReduceAnimations]
  );
  
  useEffect(() => {
    // Reset error state when photos change
    setImageError({});
    
    // Reset to first image when photos change
    dispatch({ type: 'RESET' });
    
    // Lock body scroll when gallery is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Add ESC key handler to close gallery
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      
      window.addEventListener('keydown', handleEsc);
      return () => {
        window.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose, validatedPhotos]);
  
  // Handle image load errors
  const handleImageError = (index: number) => {
    setImageError(prev => ({
      ...prev,
      [index]: true
    }));
    console.warn(`Failed to load image at index ${index}:`, validatedPhotos[index]);
  };
  
  const nextImage = () => {
    if (isTransitioning || validatedPhotos.length <= 1) return;
    
    // Start transition animation
    dispatch({ type: 'SET_TRANSITIONING', isTransitioning: true });
    
    // Use a timeout to wait for animation, then update index
    setTimeout(() => {
      dispatch({ type: 'NEXT_IMAGE', total: validatedPhotos.length });
    }, transitionDuration);
  };
  
  const prevImage = () => {
    if (isTransitioning || validatedPhotos.length <= 1) return;
    
    // Start transition animation
    dispatch({ type: 'SET_TRANSITIONING', isTransitioning: true });
    
    // Use a timeout to wait for animation, then update index
    setTimeout(() => {
      dispatch({ type: 'PREV_IMAGE', total: validatedPhotos.length });
    }, transitionDuration);
  };
  
  // Add keyboard navigation using arrow keys
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage(); 
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTransitioning, validatedPhotos.length]); // Add dependencies required by nextImage and prevImage
  
  // Don't render anything if not open or no valid photos
  if (!isOpen || validatedPhotos.length === 0) return null;
  
  // Use simpler styling for reduced motion/animations
  const containerShadow = shouldReduceAnimations 
    ? `border: 1px solid ${activityColor}40` 
    : `box-shadow: 0 0 30px ${activityColor}50, 0 0 50px ${activityColor}20; border: 1px solid ${activityColor}40`;
  
  // Render fallback for image error
  const renderImage = () => {
    if (imageError[currentIndex]) {
      return (
        <div 
          className="w-full h-full flex items-center justify-center bg-gray-900"
          style={{ 
            opacity: isTransitioning ? 0.5 : 1,
            transform: isTransitioning ? 'scale(0.95)' : 'scale(1)',
            transition: `opacity ${transitionDuration}ms ease-in-out, transform ${transitionDuration}ms ease-in-out`
          }}
        >
          <div className="text-center p-6">
            <div className="mb-4 text-4xl">🖼️</div>
            <p className="text-white/80">Image could not be loaded</p>
            <p className="text-sm text-white/40 mt-2">{validatedPhotos[currentIndex]}</p>
          </div>
        </div>
      );
    }
    
    return (
      <img 
        src={validatedPhotos[currentIndex]} 
        alt={`${activityTitle} - Photo ${currentIndex + 1}`}
        className="h-full w-full object-contain"
        style={{ 
          transition: `opacity ${transitionDuration}ms ease-in-out, transform ${transitionDuration}ms ease-in-out`,
          opacity: isTransitioning ? 0.5 : 1,
          transform: isTransitioning ? 'scale(0.95)' : 'scale(1)'
        }}
        onError={() => handleImageError(currentIndex)}
      />
    );
  };
  
  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center" 
      style={{
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: shouldReduceAnimations ? 'none' : 'blur(10px)',
      }}
    >
      <div 
        className="relative max-w-4xl w-full mx-4 rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'rgba(20, 20, 25, 0.9)',
          [containerShadow]: true,
          height: 'calc(100vh - 120px)',
          maxHeight: '800px',
        }}
      >
        {/* Header */}
        <div 
          className="flex justify-between items-center p-3 border-b"
          style={{ borderColor: `${activityColor}30` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${activityColor}20`, border: `1px solid ${activityColor}40` }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activityColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-medium truncate">{activityTitle}</h3>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Main Image Container */}
        <div 
          className="relative flex items-center justify-center" 
          style={{ 
            height: 'calc(100% - 120px)',
            backgroundColor: 'rgba(0,0,0,0.5)' 
          }}
        >
          {/* Fullsize Image with error handling */}
          {renderImage()}
          
          {/* Cyberpunk overlay effects - only render if not reducing animations */}
          {!shouldReduceAnimations && (
            <>
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ 
                  boxShadow: `inset 0 0 100px ${activityColor}20`,
                  backgroundImage: `
                    linear-gradient(
                      to bottom,
                      transparent 0%,
                      transparent 95%,
                      ${activityColor}40 100%
                    )
                  `,
                  opacity: 0.7
                }}
              />
              
              <div 
                className="absolute inset-0 pointer-events-none opacity-20" 
                style={{ 
                  backgroundImage: 'url("/scanline.gif")',
                  backgroundRepeat: 'repeat',
                  mixBlendMode: 'overlay'
                }}
              />
            </>
          )}
          
          {/* Image number indicator */}
          <div 
            className="absolute bottom-4 right-4 px-3 py-1.5 rounded bg-black/70 text-white text-sm"
            style={{ 
              border: `1px solid ${activityColor}40`,
              boxShadow: shouldReduceAnimations ? 'none' : `0 0 10px ${activityColor}30`
            }}
          >
            {currentIndex + 1} / {validatedPhotos.length}
          </div>
          
          {/* Navigation buttons (only show if more than one image) */}
          {validatedPhotos.length > 1 && (
            <>
              {/* Previous button */}
              <button 
                onClick={prevImage}
                className="absolute left-4 p-2 rounded-full bg-black/60 text-white"
                style={{ 
                  boxShadow: shouldReduceAnimations ? 'none' : `0 0 15px ${activityColor}20`,
                  border: `1px solid ${activityColor}30`
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              {/* Next button */}
              <button 
                onClick={nextImage}
                className="absolute right-4 p-2 rounded-full bg-black/60 text-white"
                style={{ 
                  boxShadow: shouldReduceAnimations ? 'none' : `0 0 15px ${activityColor}20`,
                  border: `1px solid ${activityColor}30`
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}
        </div>
        
        {/* Thumbnail navigation */}
        {validatedPhotos.length > 1 && (
          <div 
            className="p-4 flex gap-2 overflow-x-auto custom-scrollbar"
            style={{
              backgroundColor: 'rgba(10, 10, 20, 0.8)',
              borderTop: `1px solid ${activityColor}20`
            }}
          >
            {validatedPhotos.map((photo, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index !== currentIndex) {
                    dispatch({ type: 'SET_TRANSITIONING', isTransitioning: true });
                    setTimeout(() => {
                      dispatch({ type: 'RESET', index: index });
                    }, transitionDuration);
                  }
                }}
                className={`flex-shrink-0 rounded overflow-hidden ${
                  index === currentIndex ? 'scale-105' : 'opacity-60'
                }`}
                style={{
                  width: '60px',
                  height: '60px',
                  transitionDuration: `${transitionDuration * 0.7}ms`,
                  border: index === currentIndex ? `2px solid ${activityColor}` : 'none'
                }}
              >
                <img
                  src={photo}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Provide a fallback for thumbnail errors
                    (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                    (e.target as HTMLImageElement).style.opacity = '0.5';
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PhotoGallery; 