"use client"

import React from "react"
import { cn } from "@/lib/utils"

export const BackgroundBeams = React.memo(
  ({ className }: { className?: string }) => {
    return (
      <div
        className={cn(
          "absolute h-full w-full inset-0 flex items-center justify-center pointer-events-none opacity-70",
          className,
        )}
      >
        {/* Simple gradient background */}
        <div className="absolute inset-0 bg-gradient-radial from-cyan-900/10 via-transparent to-purple-900/10 opacity-60" />
        
        {/* Static accent lines */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible opacity-20"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
          stroke="url(#simple-gradient)"
          fill="none"
        >
          <defs>
            <linearGradient id="simple-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0.3)" />
            </linearGradient>
            <linearGradient id="reverse-gradient" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0.3)" />
            </linearGradient>
            <linearGradient id="vertical-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0.3)" />
            </linearGradient>
          </defs>
          
          {/* Horizontal wave lines */}
          <path d="M0 85 Q 25 75, 50 85 T 100 85" strokeWidth="1.2" />
          <path d="M0 75 Q 25 65, 50 75 T 100 75" strokeWidth="1" />
          <path d="M0 65 Q 25 55, 50 65 T 100 65" strokeWidth="1.5" />
          <path d="M0 55 Q 25 45, 50 55 T 100 55" strokeWidth="1.3" />
          <path d="M0 45 Q 25 35, 50 45 T 100 45" strokeWidth="1" />
          <path d="M0 35 Q 25 25, 50 35 T 100 35" strokeWidth="1.4" />
          <path d="M0 25 Q 25 15, 50 25 T 100 25" strokeWidth="1.2" />
          <path d="M0 15 Q 25 5, 50 15 T 100 15" strokeWidth="1" />
          
          {/* Diagonal lines */}
          <path d="M0 0 L 100 100" strokeWidth="1.5" stroke="url(#simple-gradient)" />
          <path d="M20 0 L 100 80" strokeWidth="1.3" stroke="url(#simple-gradient)" />
          <path d="M40 0 L 100 60" strokeWidth="1" stroke="url(#simple-gradient)" />
          <path d="M60 0 L 100 40" strokeWidth="1.4" stroke="url(#simple-gradient)" />
          <path d="M80 0 L 100 20" strokeWidth="1.2" stroke="url(#simple-gradient)" />
          <path d="M0 20 L 80 100" strokeWidth="1.3" stroke="url(#simple-gradient)" />
          <path d="M0 40 L 60 100" strokeWidth="1" stroke="url(#simple-gradient)" />
          <path d="M0 60 L 40 100" strokeWidth="1.5" stroke="url(#simple-gradient)" />
          <path d="M0 80 L 20 100" strokeWidth="1.2" stroke="url(#simple-gradient)" />
          
          {/* Reverse diagonal lines */}
          <path d="M100 0 L 0 100" strokeWidth="1.4" stroke="url(#reverse-gradient)" />
          <path d="M80 0 L 0 80" strokeWidth="1.2" stroke="url(#reverse-gradient)" />
          <path d="M60 0 L 0 60" strokeWidth="1" stroke="url(#reverse-gradient)" />
          <path d="M40 0 L 0 40" strokeWidth="1.3" stroke="url(#reverse-gradient)" />
          <path d="M20 0 L 0 20" strokeWidth="1.1" stroke="url(#reverse-gradient)" />
          <path d="M100 20 L 20 100" strokeWidth="1.5" stroke="url(#reverse-gradient)" />
          <path d="M100 40 L 40 100" strokeWidth="1.3" stroke="url(#reverse-gradient)" />
          <path d="M100 60 L 60 100" strokeWidth="1.1" stroke="url(#reverse-gradient)" />
          <path d="M100 80 L 80 100" strokeWidth="1" stroke="url(#reverse-gradient)" />
          
          {/* Curved lines */}
          <path d="M0 80 Q 50 20, 100 80" strokeWidth="1.5" />
          <path d="M0 60 Q 50 0, 100 60" strokeWidth="1.2" />
          <path d="M0 40 Q 50 -20, 100 40" strokeWidth="1" />
          <path d="M0 20 Q 50 -40, 100 20" strokeWidth="1.4" />
          <path d="M0 100 Q 50 40, 100 100" strokeWidth="1.3" />
          
          {/* Vertical lines with varying intensity */}
          <path d="M10 0 L 10 100" strokeWidth="1" stroke="url(#vertical-gradient)" strokeDasharray="1,3" />
          <path d="M30 0 L 30 100" strokeWidth="1.2" stroke="url(#vertical-gradient)" strokeDasharray="1,5" />
          <path d="M50 0 L 50 100" strokeWidth="1.5" stroke="url(#vertical-gradient)" strokeDasharray="1,4" />
          <path d="M70 0 L 70 100" strokeWidth="1.3" stroke="url(#vertical-gradient)" strokeDasharray="1,6" />
          <path d="M90 0 L 90 100" strokeWidth="1.1" stroke="url(#vertical-gradient)" strokeDasharray="1,3" />
        </svg>
      </div>
    );
  }
);

BackgroundBeams.displayName = "BackgroundBeams"; 