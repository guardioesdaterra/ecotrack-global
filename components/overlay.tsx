"use client"

import { useOverlay } from "@/contexts/overlay-context"
import { X } from "lucide-react"
import { useEffect, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import dynamic from "next/dynamic"
import { useMediaQuery } from "@/hooks/use-media-query"

// Dynamically import the form components to avoid issues with SSR
const SubmitForm = dynamic(() => import("@/components/submit-form"), {
  ssr: false,
  loading: () => <LoadingIndicator />
})

const EditForm = dynamic(() => import("@/components/edit-form"), {
  ssr: false,
  loading: () => <LoadingIndicator />
})

const ViewActivity = dynamic(() => import("@/components/view-activity"), {
  ssr: false,
  loading: () => <LoadingIndicator />
})

// Import MonitorDashboard component directly instead of the page
const MonitorDashboard = dynamic(() => import("@/components/monitor-dashboard"), {
  ssr: false,
  loading: () => <LoadingIndicator />
})

function LoadingIndicator() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse"></div>
    </div>
  )
}

export function Overlay() {
  const { overlayType, editActivityId, hideOverlay, isOverlayVisible } = useOverlay()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const prefersReducedMotion = useReducedMotion()
  const overlayRef = useRef<HTMLDivElement>(null)
  
  console.log("Overlay render:", { overlayType, editActivityId, isOverlayVisible })
  
  // Close overlay on escape key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOverlayVisible) {
        hideOverlay()
      }
    }
    
    window.addEventListener("keydown", handleEscKey)
    return () => window.removeEventListener("keydown", handleEscKey)
  }, [hideOverlay, isOverlayVisible])
  
  // Prevent body scrolling when overlay is open
  useEffect(() => {
    if (isOverlayVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOverlayVisible]);
  
  // Simplified animations with reduced motion capabilities
  const backdropAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  };
  
  const contentAnimation = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { 
      type: prefersReducedMotion ? "tween" : "spring", 
      damping: 25, 
      stiffness: 300,
      duration: prefersReducedMotion ? 0.2 : undefined
    }
  };

  // Helper function to render content based on overlay type
  const renderContent = () => {
    if (overlayType === "submit") {
      return <SubmitForm />;
    }
    
    if (overlayType === "monitor") {
      return <MonitorDashboard />;
    }
    
    if (overlayType === "view" && editActivityId) {
      console.log("Rendering ViewActivity with activityId:", editActivityId);
      return <ViewActivity key={`view-${editActivityId}`} activityId={editActivityId} />;
    }
    
    if (overlayType === "edit" && editActivityId) {
      console.log("Rendering EditForm with activityId:", editActivityId);
      return <EditForm key={`edit-${editActivityId}`} activityId={editActivityId} />;
    }
    
    return null;
  };

  return (
    <AnimatePresence mode="wait">
      {isOverlayVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" ref={overlayRef}>
          {/* Backdrop with animated particles */}
          <motion.div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md overflow-hidden"
            {...backdropAnimation}
            onClick={hideOverlay}
          >
            {/* Animated grid pattern - static for reduced motion */}
            {!prefersReducedMotion && (
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 1px, transparent 1px)',
                  backgroundSize: '30px 30px'
                }}
              ></div>
            )}
            
            {/* Animated scan line - only show on high-end devices */}
            {!prefersReducedMotion && !isMobile && (
              <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
                <div 
                  className="absolute w-full h-[2px] bg-cyan-500/50"
                  style={{
                    animation: 'scanline 6s linear infinite',
                    boxShadow: '0 0 15px rgba(6, 182, 212, 0.5)'
                  }}
                ></div>
              </div>
            )}
          </motion.div>
          
          {/* Content container */}
          <motion.div 
            className={`relative flex flex-col overflow-hidden bg-gradient-to-b from-gray-900/90 to-black/95 border border-cyan-900/40 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.2)]
              ${isMobile 
                ? 'w-full h-full m-0 rounded-none' 
                : 'w-[650px] max-w-[90vw] h-[85vh] max-h-[850px]'
              }`}
            {...contentAnimation}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Simplified holographic effect overlay for better performance */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-500/5"></div>
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/80 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
            </div>
            
            {/* Close button with enhanced cyberpunk style */}
            <button 
              onClick={hideOverlay}
              className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/80 hover:bg-gray-800/80 border border-cyan-900/50 shadow-[0_0_8px_rgba(6,182,212,0.2)] hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all duration-300"
            >
              <X className="w-4 h-4 text-cyan-400 relative z-10" />
            </button>
            
            {/* Scrollable content */}
            <div className="h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
              {renderContent()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
} 