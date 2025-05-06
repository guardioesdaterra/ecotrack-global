import { Globe } from "@/components/ui/globe"
import { useEffect, useState, useRef } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"

type MarkerType = { location: [number, number]; size: number };

export function GlobeDemo() {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [lowPerformance, setLowPerformance] = useState(false)
  const globeRef = useRef<HTMLDivElement>(null)
  
  // Detect low performance devices
  useEffect(() => {
    const isLowPerformance = () => {
      const memory = (navigator as any).deviceMemory;
      const cores = navigator.hardwareConcurrency || 0;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      return (memory !== undefined && memory < 4) || cores < 4 || isMobileDevice;
    };
    
    setLowPerformance(isLowPerformance());
  }, []);
  
  // Optimize settings based on device capabilities
  const getOptimizedConfig = () => {
    const baseConfig = {
      width: isMobile ? 400 : 1000,
      height: isMobile ? 400 : 1000,
      devicePixelRatio: lowPerformance ? 1 : 2,
      phi: 0,
      theta: 0.2,
      dark: 0,
      diffuse: 0.6,
      mapSamples: lowPerformance ? 8000 : 16000,
      baseColor: [1, 1, 1] as [number, number, number],
      markerColor: [0.9, 0, 0.1] as [number, number, number],
      glowColor: [0.9, 0, 0.1] as [number, number, number],
      mapBrightness: 70,
      opacity: 0.888,
      // Set extreme sensitivity for rapid rotation 
      dragSensitivity: 5, // 5x more sensitive than default
      rotationSpeedMultiplier: 20, // Much faster rotation
      enableFastDrag: true, // Enable our custom high-speed rotation
      onRender: () => {}, // Required by COBE
    };

    // Enhanced markers with larger sizes for better visibility
    const markers: MarkerType[] = lowPerformance 
      ? [
          { location: [40.7128, -74.006] as [number, number], size: 0.15 },    // New York
          { location: [-23.5505, -46.6333] as [number, number], size: 0.15 },  // São Paulo
        ]
      : [
          { location: [40.7128, -74.006] as [number, number], size: 0.15 },    // New York
          { location: [-23.5505, -46.6333] as [number, number], size: 0.15 },  // São Paulo
          { location: [51.5074, -0.1278] as [number, number], size: 0.13 },    // London
          { location: [35.6762, 139.6503] as [number, number], size: 0.13 },   // Tokyo
          { location: [-33.8688, 151.2093] as [number, number], size: 0.12 },  // Sydney
          { location: [28.6139, 77.2090] as [number, number], size: 0.15 },    // New Delhi
          { location: [30.0444, 31.2357] as [number, number], size: 0.13 },    // Cairo
          { location: [55.7558, 37.6173] as [number, number], size: 0.13 },    // Moscow
          { location: [19.4326, -99.1332] as [number, number], size: 0.14 },   // Mexico City
          { location: [-34.6037, -58.3816] as [number, number], size: 0.13 },  // Buenos Aires
          { location: [1.3521, 103.8198] as [number, number], size: 0.11 },    // Singapore
          { location: [-1.2921, 36.8219] as [number, number], size: 0.13 },    // Nairobi
          { location: [9.0820, 8.6753] as [number, number], size: 0.14 },      // Nigeria
          { location: [-15.4167, 28.2833] as [number, number], size: 0.12 },   // Zambia
          { location: [33.8869, 9.5375] as [number, number], size: 0.11 },     // Tunisia
        ];

    return { ...baseConfig, markers };
  };

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center"
      ref={globeRef}
    >
      <div className="w-full h-full" style={{ filter: 'invert(100%)' }}>
        <Globe className="w-full h-full" config={getOptimizedConfig()} />
      </div>
      <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0),rgba(0,0,0,0.2))]" />
    </div>
  )
} 