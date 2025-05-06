# EcoTrack Global: Component Documentation

This document provides detailed technical documentation of the core components in the EcoTrack Global application.

## UI Components

### Globe Component (`components/ui/globe.tsx`)

#### Technical Implementation
- **Technology**: COBE WebGL library
- **Pattern**: Wrapper pattern with React hooks for state management
- **Core Functionality**: Interactive 3D globe rendering with custom markers

#### Implementation Details

```typescript
interface ExtendedCOBEOptions extends COBEOptions {
  dragSensitivity?: number
  rotationSpeedMultiplier?: number
  enableFastDrag?: boolean
}
```

The Globe component extends the standard COBE options with custom parameters for enhancing interactivity:

1. **Rendering Pipeline**:
   - Canvas-based WebGL rendering
   - Double buffering via `requestAnimationFrame`
   - Custom render callback for each frame

2. **Interaction System**:
   - Direct DOM event handling (mousedown, mousemove, mouseup)
   - Touch event normalization for mobile
   - Physics-based rotation with configurable sensitivity
   - Velocity calculation for momentum effects
   - Inertia simulation via decay function

3. **Performance Optimizations**:
   - Reference-based state management with `useRef`
   - Event delegation to minimize handlers
   - Hardware-accelerated transitions
   - Offscreen element containment via CSS properties
   - Document-level event binding for smoother tracking

4. **Memory Management**:
   - Explicit cleanup of event listeners
   - Animation frame cancellation
   - Component unmount handling

#### Key Algorithms

**Rotation Physics**:
```typescript
// Update rotation with extreme sensitivity
const rotationDelta = enableFastDrag 
  ? deltaX / (1000 / sensitivity) // Enhanced sensitivity
  : deltaX / 1000 // Normal sensitivity

phiRef.current += rotationDelta

// Calculate velocity for momentum
if (deltaTime > 0) {
  velocityRef.current = deltaX / deltaTime * (0.1 * speedMultiplier)
}
```

**Momentum Simulation**:
```typescript
// Apply velocity animation with enhanced momentum
if (Math.abs(velocityRef.current) > 0.01) {
  const animate = () => {
    phiRef.current += velocityRef.current
    velocityRef.current *= enableFastDrag ? 0.98 : 0.95 // Configurable friction
    
    if (Math.abs(velocityRef.current) > 0.001) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      animationRef.current = null
    }
  }
  
  animationRef.current = requestAnimationFrame(animate)
}
```

### GlobeDemo Component (`components/globe-demo.tsx`)

#### Technical Implementation
- **Pattern**: Container component that configures and wraps the Globe component
- **Core Functionality**: Adaptive configuration of globe based on device capabilities

#### Implementation Details

1. **Device Capability Detection**:
   ```typescript
   const isLowPerformance = () => {
     const memory = (navigator as any).deviceMemory;
     const cores = navigator.hardwareConcurrency || 0;
     const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
     
     return (memory !== undefined && memory < 4) || cores < 4 || isMobileDevice;
   };
   ```

2. **Adaptive Configuration**:
   ```typescript
   const getOptimizedConfig = () => {
     const baseConfig = {
       width: isMobile ? 400 : 1000,
       height: isMobile ? 400 : 1000,
       devicePixelRatio: lowPerformance ? 1 : 2,
       mapSamples: lowPerformance ? 8000 : 16000,
       // ...other settings
       dragSensitivity: 5, // 5x more sensitive than default
       rotationSpeedMultiplier: 20, // Much faster rotation
       enableFastDrag: true, // Enable custom high-speed rotation
     };

     // Conditionally reduce marker count for performance
     const markers = lowPerformance 
       ? [ /* reduced marker set */ ]
       : [ /* full marker set */ ];

     return { ...baseConfig, markers };
   };
   ```

### BackgroundBeams Component (`components/ui/background-beams.tsx`)

#### Implementation Details (Inferred)
- **Pattern**: Visual effect component using WebGL or Canvas rendering
- **Purpose**: Provides ambient background animation effect
- **Loading Strategy**: Dynamically imported with fallback for performance

```typescript
const BackgroundBeams = dynamic(
  () => import("@/components/ui/background-beams").then((mod) => mod.BackgroundBeams),
  { ssr: false, loading: () => null }
)
```

## Page Components

### Home Page (`app/page.tsx`)

#### Implementation Details

1. **Performance-Aware Rendering**:
   ```typescript
   // Detect low performance devices - improved
   useEffect(() => {
     const detectPerformance = () => {
       const memory = (navigator as any).deviceMemory
       const cores = navigator.hardwareConcurrency || 0
       const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
       
       // FPS evaluation
       let lowFPS = false
       let lastTime = performance.now()
       let frames = 0
       
       const checkFPS = () => {
         frames++
         const currentTime = performance.now()
         if (currentTime > lastTime + 1000) {
           const fps = Math.round(frames * 1000 / (currentTime - lastTime))
           lowFPS = fps < 30
           frames = 0
           lastTime = currentTime
         }
         
         if (frames < 5) {
           requestAnimationFrame(checkFPS)
         }
       }
       
       requestAnimationFrame(checkFPS)
       
       // Consider device low performance if any condition is true
       return (memory !== undefined && memory < 4) || cores < 4 || isMobileDevice || lowFPS
     }
     
     // Show globe with increased delay on slow devices
     const isSlowDevice = detectPerformance()
     setLowPerformance(isSlowDevice)
     
     const delayTime = isSlowDevice ? 2000 : 800
     const timer = setTimeout(() => {
       setGlobeLoaded(true)
     }, delayTime)
     
     return () => clearTimeout(timer)
   }, [])
   ```

2. **Data Fetching Strategy**:
   ```typescript
   // Fetch activities data with caching and persistence
   useEffect(() => {
     async function loadActivities() {
       if (!isLoading) return
       
       try {
         // Skip data fetching during SSR
         if (typeof window === 'undefined') {
           setActivities([]);
           setIsLoading(false);
           return;
         }
         
         try {
           // Use the fetchActivities function with the browser client
           const data = await fetchActivities(performanceMode === 'low' ? 20 : 50);
         
           // Transform database data to match activity interface
           const activitiesData = data.map((item: any) => {
             // Convert database schema to Activity type
             // ...
           });
         
           setActivities(activitiesData);
           setIsLoading(false);
           
           // Save to localStorage as a client-side cache
           try {
             localStorage.setItem('mapActivities', JSON.stringify(activitiesData));
             localStorage.setItem('mapActivitiesTimestamp', Date.now().toString());
           } catch (e) {
             console.warn('Failed to save activities to localStorage:', e);
           }
         } catch (err) {
           // Error handling with localStorage fallback
           try {
             const cachedData = localStorage.getItem('mapActivities');
             if (cachedData) {
               console.log("Using cached activities from localStorage");
               const parsedData = JSON.parse(cachedData);
               // ...process cached data
             }
           } catch (cacheErr) {
             console.error("Failed to load cached activities:", cacheErr);
           }
         }
       } catch (error) {
         console.error("Unhandled error in loadActivities:", error);
       }
     }
     
     loadActivities();
   }, [isLoading, performanceMode]);
   ```

3. **Visual Effect Generation**:
   ```typescript
   // Generate circuit pattern data lines - optimized and memoized
   const circuitLines = useMemo(() => {
     // Reduce quantity on low performance devices
     const positions = [10, 25, 40, 55, 70, 85, 97]
     const lengths = [8, 12, 15, 18, 10, 14]
     const colors = [
       'rgba(6, 182, 212, 0.5)',
       'rgba(139, 92, 246, 0.5)',
       'rgba(6, 182, 212, 0.5)',
     ]
     
     // Dynamically adjust based on performance
     const count = lowPerformance ? 2 : performanceMode === 'low' ? 3 : performanceMode === 'medium' ? 4 : 6
     
     return Array.from({ length: count }).map((_, i) => {
       const isVertical = i % 2 === 0
       const position = positions[i % positions.length]
       const length = lengths[i % lengths.length]
       const thickness = 1 // Always use thickness 1 for better performance
       const delay = lowPerformance ? i * 1 : i * 0.5
       const duration = lowPerformance ? 5 : 1.5 + (i * 0.2)
       const color = colors[i % colors.length]
       
       return { isVertical, position, length, thickness, delay, duration, color }
     })
   }, [lowPerformance, performanceMode])
   ```

## Utility Components

### CyberpunkStatCard and CyberpunkFeatureCard

#### Implementation Details

1. **Dynamic Styling System**:
   ```typescript
   const colors = {
     cyan: {
       text: "text-cyan-300",
       textShadow: "[text-shadow:0_0_15px_rgba(6,182,212,0.5)]",
       bg: "bg-cyan-950/40", 
       border: "border-cyan-500/30",
       borderGlow: "shadow-[0_0_10px_rgba(6,182,212,0.15)]",
       // ... additional styling properties
     },
     purple: {
       // ... color variant styling
     },
     // ... other color variants
   }
   
   const colorConfig = colors[color];
   ```

2. **Animation Integration**:
   ```typescript
   <motion.div
     initial={{ opacity: 0, y: 15 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.4, delay: delay }}
   >
     {/* Component content */}
   </motion.div>
   ```

## Context Providers

### Overlay Context (`contexts/overlay-context.tsx`) (Inferred)

**Purpose**: Manages modal and overlay visibility across the application

```typescript
// Usage example from the page.tsx
const { showOverlay } = useOverlay()

// Implementation in button click handler
<button 
  onClick={() => showOverlay('submit')}
  className="..."
>
  <PlusCircle className="..." />
  SUBMIT ACTIVITY
</button>
```

### Performance Mode Context (`hooks/use-performance-mode.ts`) (Inferred)

**Purpose**: Provides application-wide access to performance settings

```typescript
// Usage example from the page.tsx
const { performanceMode } = usePerformanceMode()

// Implementation in conditional rendering
if (performanceMode === 'low') {
  // Render simplified version
} else {
  // Render full version
}
```

## Custom Hooks

### useMediaQuery

**Purpose**: Provides responsive design capabilities through JS-based media queries

```typescript
// Usage in components
const isMobile = useMediaQuery("(max-width: 768px)")

// Implementation effect (inferred)
useEffect(() => {
  const mediaQuery = window.matchMedia(query)
  setMatches(mediaQuery.matches)
  
  const listener = (e: MediaQueryListEvent) => {
    setMatches(e.matches)
  }
  
  mediaQuery.addEventListener('change', listener)
  return () => mediaQuery.removeEventListener('change', listener)
}, [query])
```

## Technical Implementation Patterns

### Performance Optimization Patterns

1. **Conditional Rendering Based on Device Capabilities**:
   ```typescript
   {!lowPerformance && !isMobile && (
     <BackgroundBeams className="opacity-50" />
   )}
   ```

2. **Dynamic Import with Loading State**:
   ```typescript
   const GlobeDemo = dynamic(
     () => import("@/components/globe-demo").then((mod) => mod.GlobeDemo),
     { 
       ssr: false, 
       loading: () => (
         <div className="w-full h-full flex items-center justify-center">
         </div>
       )
     }
   )
   ```

3. **Memoization for Complex Calculations**:
   ```typescript
   const circuitLines = useMemo(() => {
     // Complex calculation logic
   }, [lowPerformance, performanceMode])
   ```

4. **Progressive Enhancement**:
   ```typescript
   // Prefetch profile page to make future navigation faster
   useEffect(() => {
     if (typeof window !== 'undefined' && !isMobile && performanceMode !== 'low') {
       // Prefetch the profile page after the home page is interactive
       const timer = setTimeout(() => {
         const link = document.createElement('link')
         link.rel = 'prefetch'
         link.href = '/profile'
         link.as = 'document'
         document.head.appendChild(link)
       }, 5000) // Delay to prioritize current page interactivity
       
       return () => clearTimeout(timer)
     }
   }, [isMobile, performanceMode])
   ```

5. **Optimized Animation Rendering**:
   ```typescript
   // Simplified scroll handler with better performance
   useEffect(() => {
     const handleScroll = () => {
       if (heroRef.current) {
         requestAnimationFrame(() => {
           const heroHeight = heroRef.current?.offsetHeight || 0
           setIsVisible(window.scrollY < heroHeight - 100)
         })
       }
     }
     
     // Use passive event listeners for better scrolling performance
     window.addEventListener("scroll", handleScroll, { passive: true })
     return () => window.removeEventListener("scroll", handleScroll)
   }, [])
   ```

### Error Handling Patterns

1. **Graceful Degradation with Fallbacks**:
   ```typescript
   try {
     // Primary data fetching logic
   } catch (err) {
     console.error("Error loading activities:", err);
     
     // Try to load from localStorage as a fallback
     try {
       const cachedData = localStorage.getItem('mapActivities');
       if (cachedData) {
         // Use cached data
       }
     } catch (cacheErr) {
       console.error("Failed to load cached activities:", cacheErr);
     }
   }
   ```

2. **Comprehensive Error State Management**:
   ```typescript
   const [error, setError] = useState<string | null>(null)
   
   // In error handling
   setError(`Failed to load activities: ${err instanceof Error ? err.message : String(err)}`);
   ```

This document provides technical details of the key components in the EcoTrack Global application. For system architecture information, refer to the System Architecture document. 