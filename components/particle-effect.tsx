"use client"

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { Activity as BaseActivity, getActivityColor } from "@/components/map-component"
import anime from "animejs/lib/anime.es.js"

// Handle Leaflet properly for SSR
import type * as LeafletNamespace from 'leaflet';
let L: typeof LeafletNamespace;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

// Extend the Activity type to include originalLat/originalLng properties
interface Activity extends BaseActivity {
  originalLat?: number;
  originalLng?: number;
}

interface Connection {
  source: Activity
  target: Activity
  id: string
  curveDirection: number
}

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  connection: Connection
  progress: number
  color: string
  el?: HTMLDivElement
}

// Interfaces para tipagem dos parâmetros do Leaflet
interface LeafletMap {
  getSize: () => { x: number, y: number }
  getPanes: () => { overlayPane: HTMLElement }
  on: (event: string, callback: Function, context?: any) => void
  off: (event: string, callback: Function, context?: any) => void
  _panes: { overlayPane: HTMLElement }
  _animating: boolean
  getZoomScale: (zoom: number) => number
  _getCenterOffset: (center: { lat: number, lng: number }) => any
  _getMapPanePos: () => any
  containerPointToLayerPoint: (point: number[]) => any
  options: { zoomAnimation: boolean }
  invalidateSize: (options?: { animate?: boolean, pan?: boolean }) => void
  getContainer: () => HTMLElement
  latLngToContainerPoint: (latLng: [number, number]) => { x: number, y: number }
  fire: (eventName: string) => void
}

interface ResizeEvent {
  newSize: { x: number, y: number }
}

interface ZoomEvent {
  zoom: number
  center: { lat: number, lng: number }
}

interface DrawLayerEvent {
  layer: any
  canvas: HTMLCanvasElement
}

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Add a more efficient throttle function with proper types
function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan = 0;
  
  return function(this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      lastRan = Date.now();
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    } else {
      // Clear previous setTimeout if it exists
      if (lastFunc) {
        clearTimeout(lastFunc);
      }
      
      // Set a new setTimeout
      lastFunc = setTimeout(() => {
        // Only run if enough time has passed since last run
        if (Date.now() - lastRan >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Definição de uma camada canvas personalizada para o Leaflet
const initCanvasLayer = () => {
  if (typeof window === 'undefined' || !L) return null;
  
  // Criar uma classe para a camada de partículas usando L.Layer
  const ParticleCanvasLayer = L.Layer.extend({
    initialize: function(options: any) {
      this._map = null;
      this._canvas = null;
      this._frame = null;
      this._delegate = null;
      this._redrawRequest = null;
      L.Util.setOptions(this, options);
    },
    
    onAdd: function(map: LeafletMap) {
      this._map = map;
      this._canvas = L.DomUtil.create('canvas', 'leaflet-layer leaflet-particle-layer');
      this._canvas.style.pointerEvents = 'none';
      this._canvas.style.zIndex = '99999';
      this._canvas.style.position = 'absolute';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      
      const size = map.getSize();
      this._canvas.width = size.x;
      this._canvas.height = size.y;
      
      // Add safety check before accessing overlayPane
      if (map._panes && map._panes.overlayPane) {
        try {
          map._panes.overlayPane.appendChild(this._canvas);
        } catch (error) {
          console.error("Error appending canvas to overlayPane:", error);
        }
      } else {
        console.warn("Map overlay pane not available");
        // Create a fallback in the map container
        try {
          const container = map.getContainer();
          if (container) {
            // Add to container with lower z-index
            this._canvas.style.zIndex = "9999999";
            container.appendChild(this._canvas);
          }
        } catch (e) {
          console.error("Cannot append canvas to map:", e);
        }
      }
      
      // Listen to more map events to ensure proper rendering
      map.on('movestart', this._reset, this);
      map.on('move', this._reset, this);
      map.on('moveend', this._reset, this);
      map.on('resize', this._resize, this);
      map.on('load', this._reset, this);
      map.on('viewreset', this._reset, this);
      map.on('zoom', this._reset, this);
      map.on('zoomstart', this._reset, this);
      map.on('zoomend', this._reset, this);
      
      if (map.options.zoomAnimation && L.Browser.any3d) {
        map.on('zoomanim', this._animateZoom, this);
      }
      
      // Force immediate reset and redraw
      this._reset();
      
      // Schedule multiple redraws to ensure content is rendered
      this._scheduleInitialRedraws();
      
      return this;
    },
    
    _scheduleInitialRedraws: function() {
      // Schedule multiple redraws at different time intervals to ensure visibility
      if (!this._map || !this._canvas) return;
      
      const safeRedraw = () => {
        try {
          if (this._canvas && this._map) {
            this._redraw();
          }
        } catch (e) {
          console.warn('Error in scheduled redraw:', e);
        }
      };
      
      setTimeout(safeRedraw, 0);
      setTimeout(safeRedraw, 50);
      setTimeout(safeRedraw, 100);
      setTimeout(safeRedraw, 250);
      setTimeout(safeRedraw, 500);
      setTimeout(safeRedraw, 1000);
    },
    
    onRemove: function(map: LeafletMap) {
      if (this._redrawRequest) {
        cancelAnimationFrame(this._redrawRequest);
        this._redrawRequest = null;
      }
      
      map.getPanes().overlayPane.removeChild(this._canvas);
      map.off('movestart', this._reset, this);
      map.off('move', this._reset, this);
      map.off('moveend', this._reset, this);
      map.off('resize', this._resize, this);
      map.off('load', this._reset, this);
      map.off('viewreset', this._reset, this);
      map.off('zoom', this._reset, this);
      map.off('zoomstart', this._reset, this);
      map.off('zoomend', this._reset, this);
      map.off('zoomanim', this._animateZoom, this);
      
      this._canvas = null;
    },
    
    addTo: function (map: any) {
      map.addLayer(this);
      return this;
    },
    
    _resize: function(resizeEvent: ResizeEvent) {
      if (!this._canvas) return;
      
      // Check if resizeEvent and newSize exist before accessing properties
      if (resizeEvent && resizeEvent.newSize) {
        this._canvas.width = resizeEvent.newSize.x;
        this._canvas.height = resizeEvent.newSize.y;
        this._redraw();
      }
    },
    
    _reset: function() {
      // Double-check all required objects exist
      if (!this._map || !this._canvas) return;
      
      try {
        const topLeft = this._map.containerPointToLayerPoint([0, 0]);
        if (topLeft && L.DomUtil.setPosition) {
          L.DomUtil.setPosition(this._canvas, topLeft);
          this._redraw();
        }
      } catch (e) {
        console.warn('Error in canvas reset:', e);
      }
    },
    
    _redraw: function() {
      // Check if map and canvas exist
      if (!this._map || !this._canvas) return;
      
      // Cancel any pending animation frames
      if (this._redrawRequest) {
        cancelAnimationFrame(this._redrawRequest);
        this._redrawRequest = null;
      }
      
      // Call the draw layer function if defined
      if (this.onDrawLayer) {
        try {
          this.onDrawLayer({ layer: this, canvas: this._canvas });
        } catch (err) {
          console.warn('Error in draw layer:', err);
        }
      }
    },
    
    _animateZoom: function(e: ZoomEvent) {
      if (!this._map || !this._canvas) return;
      
      const scale = this._map.getZoomScale(e.zoom);
      const offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());
      
      if (L.DomUtil.setTransform) {
        L.DomUtil.setTransform(this._canvas, offset, scale);
      } else {
        // Use modern transform with fallback for older browsers
        this._canvas.style[L.DomUtil.TRANSFORM as any] = 
          `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
      }
    }
  });
  
  return ParticleCanvasLayer;
};

export function ParticleEffect({ activities, map }: { activities: Activity[], map: L.Map }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const layerRef = useRef<any>(null);
  const particlesRef = useRef<Particle[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<anime.AnimeInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const frameRef = useRef<number | null>(null);
  const isUnmountingRef = useRef<boolean>(false);

  // Create container for particles
  useEffect(() => {
    if (!map || !L) return;
    
    // Remove old container if it exists
    const oldContainer = document.querySelector('.particle-container');
    if (oldContainer && oldContainer.parentNode) {
      oldContainer.parentNode.removeChild(oldContainer);
    }

    try {
      // Create a new container for particles
      const container = document.createElement('div');
      container.className = 'particle-container';
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1500;
        overflow: hidden;
      `;
      
      const mapContainer = map.getContainer();
      if (mapContainer) {
        // Add directly to map parent to avoid z-index context issues
        if (mapContainer.parentNode) {
          mapContainer.parentNode.appendChild(container);
        } else {
          document.body.appendChild(container);
        }
        containerRef.current = container;

        // Add custom CSS for particles
        const style = document.createElement('style');
        style.textContent = `
          .map-particle {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            will-change: transform;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 10px currentColor, 0 0 5px currentColor;
          }
          
          /* Add a subtle glow trail effect for particles */
          .map-particle::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100%;
            height: 100%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            filter: blur(4px);
            background: inherit;
            z-index: -1;
            opacity: 0.6;
          }
        `;
        style.className = 'particle-style';
        if (document.head) {
          document.head.appendChild(style);
        }

        // Initialize the map positioning system
        map.invalidateSize();
      }
    } catch (error) {
      console.error("Error creating particle container:", error);
    }
    
    // Clean up on unmount
    return () => {
      isUnmountingRef.current = true;
      
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
      }
      const style = document.querySelector('style.particle-style');
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (animationRef.current) {
        animationRef.current.pause();
      }
    };
  }, [map]);

  // Initialize connections and particles when activities change
  useEffect(() => {
    if (!map || !containerRef.current || !activities || activities.length < 2) {
      return;
    }

    // Generate connections between activities
    const connections: Connection[] = [];
    
    // For each activity, connect to 3 other random activities
    activities.forEach((source: Activity) => {
      // Find all possible targets (excluding self)
      const possibleTargets = activities.filter((target: Activity) => target.id !== source.id);
      
      // If we don't have enough targets, skip (need at least 1)
      if (possibleTargets.length === 0) return;
      
      // Determine how many connections to make (up to 3, but limited by available targets)
      const connectionsToMake = Math.min(3, possibleTargets.length);
      
      // Shuffle targets and take the first N
      const selectedTargets = shuffleArray([...possibleTargets]).slice(0, connectionsToMake);
      
      // Create connections to each selected target
      selectedTargets.forEach((target: Activity) => {
        // Check if this connection already exists (either direction)
        const connectionExists = connections.some(conn => 
          (conn.source.id === source.id && conn.target.id === target.id) ||
          (conn.source.id === target.id && conn.target.id === source.id)
        );
        
        // Only add if connection doesn't exist yet
        if (!connectionExists) {
          // Randomly assign positive or negative curve direction for variety
          const curveDirection = Math.random() > 0.5 ? 1 : -1;
          
          connections.push({
            source: source,
            target: target,
            id: `${source.id}-${target.id}`,
            curveDirection
          });
        }
      });
    });
    
    connectionsRef.current = connections;
    
    // Clean up old particles
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    // Create DOM elements for particles
    const particles: Particle[] = [];
    
    connections.forEach(connection => {
      // Create 3-5 particles per connection
      const particleCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < particleCount; i++) {
        const progress = Math.random();
        const color = getActivityColor(connection.source.type);
        const size = Math.random() * 3 + 2; // Size between 2-5
        
        // Create particle element
        const particleEl = document.createElement('div');
        particleEl.className = 'map-particle';
        particleEl.style.width = `${size}px`;
        particleEl.style.height = `${size}px`;
        particleEl.style.backgroundColor = color;
        particleEl.style.color = color;
        particleEl.style.opacity = '0.8';
        
        if (containerRef.current) {
          containerRef.current.appendChild(particleEl);
          
          // Create particle object
          particles.push({
            x: 0,
            y: 0,
            size,
            speed: Math.random() * 0.8 + 0.4, // Speed between 0.4-1.2
            connection,
            progress,
            color,
            el: particleEl
          });
        }
      }
    });
    
    particlesRef.current = particles;
    setIsInitialized(true);
    
  }, [map, activities]);

  // Create a more efficient redraw function
  const redrawThrottled = useMemo(() => 
    throttle(() => {
      if (isUnmountingRef.current || !map) return;
      try {
        if (canvasRef.current && layerRef.current) {
          layerRef.current._reset();
        }
      } catch (e) {
        console.warn('Error in throttled redraw:', e);
      }
    }, 100), 
    [map]
  );

  // Use a more efficient animation frame handler
  const updateParticlePositions = useCallback((timestamp: number) => {
    if (isUnmountingRef.current) return;
    
    // Process animations with less frequency on slower devices or when many particles
    const particleCount = particlesRef.current.length;
    const processingLoad = particleCount > 100 ? 'high' : particleCount > 50 ? 'medium' : 'low';
    const skipFrames = processingLoad === 'high' ? 2 : processingLoad === 'medium' ? 1 : 0;
    
    // Skip frames based on processing load
    if (skipFrames > 0 && timestamp % skipFrames !== 0) {
      animationFrameRef.current = requestAnimationFrame(updateParticlePositions);
      return;
    }
    
    // Rest of animation code...
    
    // Use ref for the animation frame ID
    animationFrameRef.current = requestAnimationFrame(updateParticlePositions);
  }, []);

  // Animate particles using direct requestAnimationFrame
  useEffect(() => {
    if (!map || !isInitialized || !containerRef.current || particlesRef.current.length === 0) {
      return;
    }

    // Stop existing animation
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    // Create debug dots to visualize exact marker positions (temporary for debugging)
    const createMarkerDebugDots = () => {
      if (!containerRef.current) return;
      
      // Remove existing debug dots
      const existingDots = document.querySelectorAll('.marker-debug-dot');
      existingDots.forEach(dot => dot.parentNode?.removeChild(dot));
      
      // Create new debug dots for each activity
      activities.forEach(activity => {
        try {
          const point = map.latLngToContainerPoint([
            activity.originalLat || activity.lat,
            activity.originalLng || activity.lng
          ]);
          
          // Create a debug dot
          const dot = document.createElement('div');
          dot.className = 'marker-debug-dot';
          dot.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background-color: red;
            border-radius: 50%;
            z-index: 10000;
            top: ${point.y}px;
            left: ${point.x}px;
            transform: translate(-50%, -50%);
          `;
          
          if (containerRef.current) {
            containerRef.current.appendChild(dot);
          }
        } catch (err) {
          // Silently fail
        }
      });
    };
    
    // Uncomment this line to show debug dots
    // createMarkerDebugDots();

    let lastTimestamp = 0;
    const fps = 60;
    const interval = 1000 / fps;

    // Function to update particle positions
    const updateParticlePositions = (timestamp: number) => {
      // Throttle updates to desired FPS
      if (timestamp - lastTimestamp < interval) {
        frameRef.current = requestAnimationFrame(updateParticlePositions);
        return;
      }
      
      lastTimestamp = timestamp;
      const particles = particlesRef.current;
      
      // For debugging - Update marker position dots 
      // if (timestamp % 1000 < 20) createMarkerDebugDots();
      
      particles.forEach(particle => {
        try {
          // Skip invalid particles
          if (!particle.el || !particle.connection?.source || !particle.connection?.target) {
            return;
          }
          
          // Calculate source and target positions on map
          // Use a corrected marker position - adjust if needed
          // Leaflet uses pixel coordinates for marker display
          const sourceMarker = document.querySelector(`.activity-marker[data-activity-id="${particle.connection.source.id}"]`);
          const targetMarker = document.querySelector(`.activity-marker[data-activity-id="${particle.connection.target.id}"]`);
          
          let sourcePoint, targetPoint;
          
          // Try to get exact marker positions from DOM if available
          if (sourceMarker && targetMarker) {
            const sourceRect = sourceMarker.getBoundingClientRect();
            const targetRect = targetMarker.getBoundingClientRect();
            
            const mapContainerRect = map.getContainer().getBoundingClientRect();
            
            // Calculate position relative to map container
            sourcePoint = {
              x: sourceRect.left + sourceRect.width/2 - mapContainerRect.left,
              y: sourceRect.top + sourceRect.height/2 - mapContainerRect.top
            };
            
            targetPoint = {
              x: targetRect.left + targetRect.width/2 - mapContainerRect.left,
              y: targetRect.top + targetRect.height/2 - mapContainerRect.top
            };
          } else {
            // Fallback to lat/lng calculation
            sourcePoint = map.latLngToContainerPoint([
              particle.connection.source.originalLat || particle.connection.source.lat,
              particle.connection.source.originalLng || particle.connection.source.lng
            ]);
            
            targetPoint = map.latLngToContainerPoint([
              particle.connection.target.originalLat || particle.connection.target.lat,
              particle.connection.target.originalLng || particle.connection.target.lng
            ]);
          }
          
          // Update progress
          particle.progress += particle.speed / 100;
          if (particle.progress > 1) {
            particle.progress = 0;
          }
          
          // Calculate current position with bezier curve for more natural flow
          // Use a slight arc for more visual interest
          const t = particle.progress;
          const mt = 1 - t;
          
          // Add a slight curve to the path for more organic movement
          // Calculate control point slightly above the midpoint
          const midX = (sourcePoint.x + targetPoint.x) / 2;
          const midY = (sourcePoint.y + targetPoint.y) / 2;
          const distance = Math.sqrt(
            Math.pow(targetPoint.x - sourcePoint.x, 2) + 
            Math.pow(targetPoint.y - sourcePoint.y, 2)
          );
          
          // Height of the curve proportional to distance
          const curveHeight = distance * 0.15;
          
          // Calculate normal vector for the control point
          const dx = targetPoint.x - sourcePoint.x;
          const dy = targetPoint.y - sourcePoint.y;
          const nx = -dy / distance; // Normalized perpendicular vector
          const ny = dx / distance;
          
          // Use the connection's curve direction if available, otherwise use 1
          const curveDirection = particle.connection.curveDirection || 1;
          
          // Calculate control point
          const cpX = midX + nx * curveHeight * curveDirection;
          const cpY = midY + ny * curveHeight * curveDirection;
          
          // Quadratic bezier formula
          particle.x = mt * mt * sourcePoint.x + 2 * mt * t * cpX + t * t * targetPoint.x;
          particle.y = mt * mt * sourcePoint.y + 2 * mt * t * cpY + t * t * targetPoint.y;
          
          // Update element position
          if (particle.el) {
            particle.el.style.transform = `translate(${particle.x}px, ${particle.y}px)`;
            
            // Slightly change opacity based on progress for a pulsing effect
            const opacityVariation = Math.sin(particle.progress * Math.PI) * 0.3 + 0.7;
            particle.el.style.opacity = String(opacityVariation);
            
            // Change size slightly for added visual interest
            const sizeMultiplier = 0.85 + Math.sin(particle.progress * Math.PI * 2) * 0.15;
            particle.el.style.width = `${particle.size * sizeMultiplier}px`;
            particle.el.style.height = `${particle.size * sizeMultiplier}px`;
            
            // Add a subtle glow intensity variation
            particle.el.style.boxShadow = `0 0 ${5 + Math.sin(particle.progress * Math.PI) * 5}px ${particle.color}, 0 0 ${3 + Math.sin(particle.progress * Math.PI * 2) * 3}px ${particle.color}`;
          }
        } catch (err) {
          // Silent fail for individual particles
        }
      });
      
      // Continue animation loop
      frameRef.current = requestAnimationFrame(updateParticlePositions);
    };

    // Start animation loop
    frameRef.current = requestAnimationFrame(updateParticlePositions);

    // Set up map event handlers
    const handleMapMove = throttle(() => {
      // Force an immediate update for responsive movement
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      updateParticlePositions(performance.now());
    }, 100); // Limit frequency of updates during continuous events

    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);
    map.on('viewreset', handleMapMove);

    // Clean up
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      
      map.off('move', handleMapMove);
      map.off('zoom', handleMapMove);
      map.off('viewreset', handleMapMove);
    };
  }, [map, isInitialized]);

  // Ensure proper cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      
      // Cancel any pending animation frames
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Remove any listeners
      if (map) {
        try {
          map.off('move', redrawThrottled);
          map.off('zoom', redrawThrottled);
          map.off('resize', redrawThrottled);
        } catch (e) {
          console.warn('Error removing map listeners:', e);
        }
      }
      
      // Remove the canvas layer if it exists
      if (layerRef.current && map) {
        try {
          map.removeLayer(layerRef.current);
        } catch (e) {
          console.warn('Error removing canvas layer:', e);
        }
      }
    };
  }, [map, redrawThrottled]);

  return null;
}

export function ConnectionLines({ activities, map }: { activities: Activity[], map: L.Map }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the canvas for drawing connections
  useEffect(() => {
    if (!map || !L) return;
    
    // Remove old container if it exists
    const oldContainer = document.querySelector('.connection-lines-container');
    if (oldContainer && oldContainer.parentNode) {
      oldContainer.parentNode.removeChild(oldContainer);
    }
    
    try {
      // Create a new container for the canvas
      const container = document.createElement('div');
      container.className = 'connection-lines-container';
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1400;
      `;
      
      const canvas = document.createElement('canvas');
      canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      `;
      
      // Set canvas size to match map
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      
      container.appendChild(canvas);
      
      const mapContainer = map.getContainer();
      if (mapContainer) {
        // Add directly to map parent to avoid z-index context issues
        if (mapContainer.parentNode) {
          mapContainer.parentNode.appendChild(container);
        } else {
          document.body.appendChild(container);
        }
        
        containerRef.current = container;
        canvasRef.current = canvas;
        
        // Initialize the map positioning system
        map.invalidateSize();
        
        setIsInitialized(true);
      }
    } catch (error) {
      console.error("Error creating connection lines container:", error);
    }
    
    // Clean up on unmount
    return () => {
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [map]);

  // Draw connection lines using direct requestAnimationFrame
  useEffect(() => {
    if (!map || !isInitialized || !canvasRef.current || !containerRef.current || !activities || activities.length < 2) {
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Stop existing animation
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    
    let lastTimestamp = 0;
    const fps = 30; // Lower FPS for better performance
    const interval = 1000 / fps;
    
    // Function to update canvas position
    const updateCanvasPosition = () => {
      if (!canvas) return;
      
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      canvas.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`;
      
      const size = map.getSize();
      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }
    };
    
    // Function to draw connection lines
    const drawConnectionLines = () => {
      if (!canvas || !ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Maximum distance for connections
      const maxDistance = 3000;
      
      // Set line style
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.15;
      
      // Limit connections for performance
      const connectionLimit = 40;
      let connectionCount = 0;
      
      // Draw connections between activities
      for (let i = 0; i < activities.length && connectionCount < connectionLimit; i++) {
        const source = activities[i];
        
        // Skip invalid activities
        if (!source || typeof source.lat !== 'number' || typeof source.lng !== 'number') {
          continue;
        }
        
        try {
          // Convert lat/lng to pixel coordinates
          const sourcePoint = map.latLngToContainerPoint([source.lat, source.lng]);
          
          for (let j = i + 1; j < activities.length && connectionCount < connectionLimit; j++) {
            const target = activities[j];
            
            // Skip invalid activities
            if (!target || typeof target.lat !== 'number' || typeof target.lng !== 'number') {
              continue;
            }
            
            try {
              // Convert lat/lng to pixel coordinates
              const targetPoint = map.latLngToContainerPoint([target.lat, target.lng]);
              
              // Calculate distance between points
              const dx = targetPoint.x - sourcePoint.x;
              const dy = targetPoint.y - sourcePoint.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // Only draw connections for points within a reasonable distance
              if (distance <= maxDistance) {
                // Get colors based on activity types
                const sourceColor = getActivityColor(source.type);
                const targetColor = getActivityColor(target.type);
                
                try {
                  // Create gradient
                  const gradient = ctx.createLinearGradient(
                    sourcePoint.x, sourcePoint.y,
                    targetPoint.x, targetPoint.y
                  );
                  gradient.addColorStop(0, sourceColor);
                  gradient.addColorStop(1, targetColor);
                  
                  ctx.strokeStyle = gradient;
                } catch (err) {
                  // Fallback if gradient fails
                  ctx.strokeStyle = sourceColor;
                }
                
                // Draw line
                ctx.beginPath();
                ctx.moveTo(sourcePoint.x, sourcePoint.y);
                ctx.lineTo(targetPoint.x, targetPoint.y);
                ctx.stroke();
                
                connectionCount++;
              }
            } catch (err) {
              // Skip this connection
            }
          }
        } catch (err) {
          // Skip this activity
        }
      }
    };
    
    // Animation frame handler
    const animate = (timestamp: number) => {
      // Throttle updates to desired FPS
      if (timestamp - lastTimestamp < interval) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastTimestamp = timestamp;
      
      updateCanvasPosition();
      drawConnectionLines();
      
      // Continue animation loop
      frameRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation loop
    frameRef.current = requestAnimationFrame(animate);
    
    // Force initial draw
    updateCanvasPosition();
    drawConnectionLines();
    
    // Set up map event handlers
    const handleMapChange = () => {
      updateCanvasPosition();
      drawConnectionLines();
    };
    
    map.on('move', handleMapChange);
    map.on('zoom', handleMapChange);
    map.on('viewreset', handleMapChange);
    map.on('resize', handleMapChange);
    
    // Also redraw on window resize
    window.addEventListener('resize', handleMapChange);
    
    // Clean up
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      
      map.off('move', handleMapChange);
      map.off('zoom', handleMapChange);
      map.off('viewreset', handleMapChange);
      map.off('resize', handleMapChange);
      window.removeEventListener('resize', handleMapChange);
    };
  }, [map, activities, isInitialized]);

  return null;
}
