"use client"

import { useEffect, useRef, useState } from "react"
import { useMap } from "react-leaflet"
import { Activity, getActivityColor } from "@/components/map-component"
import anime from "animejs/lib/anime.es.js"

// Handle Leaflet properly for SSR
import type * as LeafletNamespace from 'leaflet';
let L: typeof LeafletNamespace;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

interface Connection {
  source: Activity
  target: Activity
  id: string
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

// Função para limitar a frequência de execução (throttle)
function throttle(callback: Function, limit: number): (...args: any[]) => void {
  let waiting = false;
  return function(this: any, ...args: any[]): void {
    if (!waiting) {
      callback.apply(this, args);
      waiting = true;
      setTimeout(function() {
        waiting = false;
      }, limit);
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
      this._canvas.style.zIndex = 1000;
      this._canvas.style.position = 'absolute';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      
      const size = map.getSize();
      this._canvas.width = size.x;
      this._canvas.height = size.y;
      
      map._panes.overlayPane.appendChild(this._canvas);
      
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

export function ParticleEffect({ activities }: { activities: Activity[] }) {
  const map = useMap();
  const particlesRef = useRef<Particle[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<anime.AnimeInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const frameRef = useRef<number | null>(null);

  // Create container for particles
  useEffect(() => {
    if (!map || !L) return;
    
    // Remove old container if it exists
    const oldContainer = document.querySelector('.particle-container');
    if (oldContainer) {
      oldContainer.remove();
    }

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
      z-index: 1000;
      overflow: hidden;
    `;
    
    map.getContainer().appendChild(container);
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
    `;
    document.head.appendChild(style);

    // Initialize the map positioning system
    map.invalidateSize();
    
    // Clean up on unmount
    return () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
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
    const shuffledActivities = shuffleArray([...activities]);
    
    // Track connections per activity (limit to 4 per activity)
    const connectionsPerActivity = new Map<number, number>();
    shuffledActivities.forEach(activity => {
      connectionsPerActivity.set(activity.id, 0);
    });
    
    // Process up to 30 activities for connections
    const maxActivities = Math.min(shuffledActivities.length, 30);
    const processedActivities = shuffledActivities.slice(0, maxActivities);
    
    // Create connections (max 4 per activity)
    processedActivities.forEach((source) => {
      if ((connectionsPerActivity.get(source.id) || 0) >= 4) return;
      
      // Find possible targets
      const possibleTargets = processedActivities.filter(a => 
        a.id !== source.id && 
        (connectionsPerActivity.get(a.id) || 0) < 4 &&
        !connections.some(c => 
          (c.source.id === source.id && c.target.id === a.id) || 
          (c.source.id === a.id && c.target.id === source.id)
        )
      );
      
      if (possibleTargets.length > 0) {
        // Get random targets
        const remainingSlots = 4 - (connectionsPerActivity.get(source.id) || 0);
        const targetsToConnectCount = Math.min(remainingSlots, possibleTargets.length);
        const shuffledTargets = shuffleArray([...possibleTargets]);
        const selectedTargets = shuffledTargets.slice(0, targetsToConnectCount);
        
        // Create connections
        selectedTargets.forEach(target => {
          connections.push({
            source: source,
            target: target,
            id: `${source.id}-${target.id}`
          });
          
          connectionsPerActivity.set(source.id, (connectionsPerActivity.get(source.id) || 0) + 1);
          connectionsPerActivity.set(target.id, (connectionsPerActivity.get(target.id) || 0) + 1);
        });
      }
    });
    
    connectionsRef.current = connections;
    
    // Clean up old particles
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    // Create DOM elements for particles
    const particles: Particle[] = [];
    
    connections.forEach(connection => {
      // Create 3 particles per connection
      const particleCount = 3;
      
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
        
        containerRef.current?.appendChild(particleEl);
        
        // Create particle object
        particles.push({
          x: 0,
          y: 0,
          size,
          speed: Math.random() * 0.6 + 0.3,
          connection,
          progress,
          color,
          el: particleEl
        });
      }
    });
    
    particlesRef.current = particles;
    setIsInitialized(true);
    
  }, [map, activities]);

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
      
      particles.forEach(particle => {
        try {
          // Skip invalid particles
          if (!particle.el || !particle.connection?.source || !particle.connection?.target) {
            return;
          }
          
          // Calculate source and target positions on map
          const sourcePoint = map.latLngToContainerPoint([
            particle.connection.source.lat,
            particle.connection.source.lng
          ]);
          
          const targetPoint = map.latLngToContainerPoint([
            particle.connection.target.lat,
            particle.connection.target.lng
          ]);
          
          // Update progress
          particle.progress += particle.speed / 100;
          if (particle.progress > 1) {
            particle.progress = 0;
          }
          
          // Calculate current position
          particle.x = sourcePoint.x + (targetPoint.x - sourcePoint.x) * particle.progress;
          particle.y = sourcePoint.y + (targetPoint.y - sourcePoint.y) * particle.progress;
          
          // Update element position
          if (particle.el) {
            particle.el.style.transform = `translate(${particle.x}px, ${particle.y}px)`;
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
    const handleMapMove = () => {
      // Force an immediate update for responsive movement
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      updateParticlePositions(performance.now());
    };

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

  return null;
}

export function ConnectionLines({ activities }: { activities: Activity[] }) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create container and canvas for connections
  useEffect(() => {
    if (!map || !L) return;
    
    // Remove old container if it exists
    const oldContainer = document.querySelector('.connections-container');
    if (oldContainer) {
      oldContainer.remove();
    }

    // Create a new container and canvas
    const container = document.createElement('div');
    container.className = 'connections-container';
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 399;
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
    map.getContainer().appendChild(container);
    
    containerRef.current = container;
    canvasRef.current = canvas;
    
    // Initialize the map positioning system
    map.invalidateSize();
    
    setIsInitialized(true);
    
    // Clean up on unmount
    return () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
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
