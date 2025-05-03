"use client"

import React, { useEffect, useState, useRef } from "react"
import { motion, useAnimation } from "framer-motion"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

// Function to generate path string with random variation
const generateBeamPath = (index: number, totalPaths: number) => {
  // Base coordinates
  const startX = -400 - Math.random() * 100;
  const startY = -500 + (index / totalPaths) * 600;
  
  // Control points with randomization
  const ctrlX = -200 + Math.random() * 100;
  const ctrlY = -100 + (index / totalPaths) * 500 + Math.random() * 100;
  
  // End points with randomization
  const endX1 = 300 + Math.random() * 100;
  const endY1 = 100 + (index / totalPaths) * 500 + Math.random() * 150;
  
  const endX2 = 800 + Math.random() * 200;
  const endY2 = 400 + (index / totalPaths) * 500 + Math.random() * 200;
  
  return `M${startX} ${startY}C${startX} ${startY} ${ctrlX} ${ctrlY} ${endX1} ${endY1}C${endX1 + 100} ${endY1 + 50} ${endX2} ${endY2} ${endX2} ${endY2}`;
}

export const BackgroundBeams = React.memo(
  ({ className, reduced = false }: { className?: string; reduced?: boolean }) => {
    // Detect low-end devices
    const preferReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
    const isMobile = useMediaQuery("(max-width: 768px)")
    const isLowEnd = useMediaQuery("(prefers-reduced-motion), (max-width: 768px)")
    const [isVisible, setIsVisible] = useState(true)
    const [isInViewport, setIsInViewport] = useState(true)
    const isMountedRef = useRef(false)
    const elementRef = useRef<HTMLDivElement>(null)
    const controls = useAnimation()
    
    // Default to reduced mode on mobile or when prefers-reduced-motion is enabled
    const shouldReduceMotion = reduced || preferReducedMotion || isMobile
    
    // Determine how many paths to generate based on device capacity
    const getPathCount = () => {
      if (shouldReduceMotion) {
        return 30; // 10x the original 3 paths for reduced mode
      } else if (isLowEnd) {
        return 60; // 10x the original 6 paths for low-end devices
      } else {
        return 300; // 50x the original 6 paths for high-end devices (not 100x to prevent performance issues)
      }
    }
    
    // Generate paths dynamically
    const generatePaths = () => {
      const count = getPathCount();
      const generatedPaths = [];
      
      for (let i = 0; i < count; i++) {
        generatedPaths.push(generateBeamPath(i, count));
      }
      
      return generatedPaths;
    };
    
    // Generate paths on component mount
    const [paths, setPaths] = useState<string[]>([]);
    
    useEffect(() => {
      setPaths(generatePaths());
    }, [shouldReduceMotion, isLowEnd]);
    
    // Mark component as mounted once, without triggering rerenders
    useEffect(() => {
      isMountedRef.current = true;
      
      // Start animation only once on mount if in view
      if (isInViewport) {
        controls.start("animate").catch(() => {});
      }
      
      return () => {
        isMountedRef.current = false;
      };
    }, []);
    
    // Use Intersection Observer to check if component is in viewport
    useEffect(() => {
      if (!elementRef.current || typeof IntersectionObserver === 'undefined') return;
      
      const observer = new IntersectionObserver(
        (entries) => {
          // Update the state when the visibility changes
          const isInView = entries[0]?.isIntersecting ?? false;
          setIsInViewport(isInView);
          
          // Only handle animation if mounted
          if (isMountedRef.current) {
            if (isInView) {
              controls.start("animate").catch(() => {});
            } else {
              controls.stop();
            }
          }
        },
        { threshold: 0.1 } // Trigger when at least 10% of the element is visible
      );
      
      observer.observe(elementRef.current);
      
      return () => {
        observer.disconnect();
      };
    }, [controls]);
    
    // Pause animations when page is not visible
    useEffect(() => {
      const handleVisibilityChange = () => {
        const newVisibility = !document.hidden;
        setIsVisible(newVisibility);
        
        // Only handle animation if mounted
        if (isMountedRef.current) {
          if (newVisibility && isInViewport) {
            controls.start("animate").catch(() => {});
          } else {
            controls.stop();
          }
        }
      };
      
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }, [controls, isInViewport]);
    
    // If reduced motion or not visible, render minimal content
    if (preferReducedMotion === true || (!isVisible && !isInViewport)) {
      return (
        <div
          ref={elementRef}
          className={cn(
            "absolute h-full w-full inset-0 flex items-center justify-center pointer-events-none opacity-70",
            className,
          )}
        >
          {/* Simplified static version */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/20 via-transparent to-purple-900/20 opacity-50" />
        </div>
      );
    }

    // Calculate transition durations based on device capabilities
    const getTransitionDuration = (index: number, total: number) => {
      // Distribute timings across the full range of beams
      const position = index / total;
      const baseTime = isLowEnd ? 25 : 20;
      const variance = isLowEnd ? 5 : 15;
      
      return baseTime + variance * Math.sin(position * Math.PI);
    };
    
    const getTransitionDelay = (index: number, total: number) => {
      // Create wave-like staggered delays
      const position = index / total;
      return isLowEnd ? position * 10 : position * 15 * Math.random();
    };
    
    // Determine stroke width based on device type
    const getStrokeWidth = (index: number, total: number) => {
      // Make some beams thicker for visual interest
      const position = index / total;
      const isImportantBeam = index % 8 === 0; // Every 8th beam is "important"
      
      if (isLowEnd) {
        return isImportantBeam ? 0.8 : 0.6;
      } else {
        // High-end devices get more variation
        return isImportantBeam ? 1.2 : 0.7;
      }
    };

    return (
      <div
        ref={elementRef}
        className={cn(
          "absolute h-full w-full inset-0 flex items-center justify-center pointer-events-none",
          className,
        )}
      >
        {/* Add global glow effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/5 via-transparent to-purple-900/5 opacity-30" />
        
        <svg
          className="z-0 h-full w-full absolute"
          width="100%"
          height="100%"
          viewBox="0 0 1200 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ willChange: "transform", filter: "blur(0.5px)" }} 
        >
          {/* Add SVG filters for glow effects */}
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          <path
            d="M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859M-352 -221C-352 -221 -284 184 180 311C644 438 712 843 712 843M-338 -237C-338 -237 -270 168 194 295C658 422 726 827 726 827M-324 -253C-324 -253 -256 152 208 279C672 406 740 811 740 811M-310 -269C-310 -269 -242 136 222 263C686 390 754 795 754 795M-296 -285C-296 -285 -228 120 236 247C700 374 768 779 768 779M-282 -301C-282 -301 -214 104 250 231C714 358 782 763 782 763M-268 -317C-268 -317 -200 88 264 215C728 342 796 747 796 747M-254 -333C-254 -333 -186 72 278 199C742 326 810 731 810 731M-240 -349C-240 -349 -172 56 292 183C756 310 824 715 824 715M-226 -365C-226 -365 -158 40 306 167C770 294 838 699 838 699M-212 -381C-212 -381 -144 24 320 151C784 278 852 683 852 683M-198 -397C-198 -397 -130 8 334 135C798 262 866 667 866 667M-184 -413C-184 -413 -116 -8 348 119C812 246 880 651 880 651M-170 -429C-170 -429 -102 -24 362 103C826 230 894 635 894 635M-156 -445C-156 -445 -88 -40 376 87C840 214 908 619 908 619M-142 -461C-142 -461 -74 -56 390 71C854 198 922 603 922 603M-128 -477C-128 -477 -60 -72 404 55C868 182 936 587 936 587M-114 -493C-114 -493 -46 -88 418 39C882 166 950 571 950 571M-100 -509C-100 -509 -32 -104 432 23C896 150 964 555 964 555M-86 -525C-86 -525 -18 -120 446 7C910 134 978 539 978 539M-72 -541C-72 -541 -4 -136 460 -9C924 118 992 523 992 523"
            stroke="url(#paint0_radial_242_278)"
            strokeOpacity="0.08"
            strokeWidth="0.7"
          ></path>

          {paths.map((path, index) => (
            <motion.path
              key={`path-` + index}
              d={path}
              stroke={`url(#linearGradient-${index})`}
              strokeOpacity="0.6"
              strokeWidth={getStrokeWidth(index, paths.length)}
              filter="url(#glow)"
              initial="initial"
              animate={controls}
              variants={{
                initial: {}, 
                animate: {}
              }}
            ></motion.path>
          ))}
          <defs>
            {paths.map((path, index) => (
              <motion.linearGradient
                id={`linearGradient-${index}`}
                key={`gradient-${index}`}
                initial={{
                  x1: "0%",
                  x2: "0%",
                  y1: "0%",
                  y2: "0%",
                }}
                animate={{
                  x1: ["0%", "100%"],
                  x2: ["0%", "95%"],
                  y1: ["0%", "100%"],
                  y2: ["0%", `${93 + Math.random() * 8}%`],
                }}
                transition={{
                  duration: getTransitionDuration(index, paths.length),
                  ease: "linear",
                  repeat: Infinity,
                  delay: getTransitionDelay(index, paths.length),
                }}
              >
                <stop stopColor="#06b6d4" stopOpacity="0.2"></stop>
                <stop stopColor="#06b6d4" stopOpacity="0.9"></stop>
                <stop offset="32.5%" stopColor="#8b5cf6" stopOpacity="0.9"></stop>
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2"></stop>
              </motion.linearGradient>
            ))}

            <radialGradient
              id="paint0_radial_242_278"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(500 200) rotate(90) scale(800 2000)"
            >
              <stop offset="0.0666667" stopColor="#0c0a09"></stop>
              <stop offset="0.243243" stopColor="#0c0a09"></stop>
              <stop offset="0.43594" stopColor="white" stopOpacity="0"></stop>
            </radialGradient>
          </defs>
        </svg>
      </div>
    )
  },
)

BackgroundBeams.displayName = "BackgroundBeams" 