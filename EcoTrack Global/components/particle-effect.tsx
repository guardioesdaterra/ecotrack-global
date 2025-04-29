"use client"

import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import { Activity, getActivityColor } from "@/components/map-component"
// Remove conflicting import
// import L from 'leaflet'

// Declare Leaflet instead of importing it directly
declare const L: any;

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
    onAdd: function(map: LeafletMap) {
      this._map = map;
      this._canvas = L.DomUtil.create('canvas', 'leaflet-layer leaflet-particle-layer');
      this._canvas.style.pointerEvents = 'none';
      this._canvas.style.zIndex = 1000;
      this._canvas.style.position = 'absolute';
      
      const size = map.getSize();
      this._canvas.width = size.x;
      this._canvas.height = size.y;
      
      map._panes.overlayPane.appendChild(this._canvas);
      
      map.on('moveend', this._reset, this);
      map.on('resize', this._resize, this);
      
      if (map.options.zoomAnimation && L.Browser.any3d) {
        map.on('zoomanim', this._animateZoom, this);
      }
      
      this._reset();
      return this;
    },
    
    onRemove: function(map: LeafletMap) {
      map.getPanes().overlayPane.removeChild(this._canvas);
      map.off('moveend', this._reset, this);
      map.off('resize', this._resize, this);
      map.off('zoomanim', this._animateZoom, this);
    },
    
    _resize: function(resizeEvent: ResizeEvent) {
      this._canvas.width = resizeEvent.newSize.x;
      this._canvas.height = resizeEvent.newSize.y;
    },
    
    _reset: function() {
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      this._redraw();
    },
    
    _redraw: function() {
      // Check if this._map exists before accessing _animating
      if (!this._map) return;
      
      if (!this._frame && !this._map._animating) {
        this._frame = L.Util.requestAnimFrame(this._redraw, this);
      }
      
      if (this.onDrawLayer) {
        this.onDrawLayer({ layer: this, canvas: this._canvas });
      }
      
      this._frame = null;
    },
    
    _animateZoom: function(e: ZoomEvent) {
      const scale = this._map.getZoomScale(e.zoom);
      const offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());
      
      if (L.DomUtil.setTransform) {
        L.DomUtil.setTransform(this._canvas, offset, scale);
      } else {
        this._canvas.style[L.DomUtil.TRANSFORM] = 
          L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
      }
    }
  });
  
  return ParticleCanvasLayer;
};

export function ParticleEffect({ activities }: { activities: Activity[] }) {
  const map = useMap();
  const particleLayerRef = useRef<any>(null);
  const particlesRef = useRef<Particle[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const requestRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);

  // Cleanup function to properly remove the particle layer
  const cleanupParticleLayer = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    if (particleLayerRef.current && map) {
      try {
        map.removeLayer(particleLayerRef.current);
      } catch (e) {
        console.warn('Error removing particle layer:', e);
      }
      particleLayerRef.current = null;
    }
  };

  // Initialize or update the particle effect when activities change
  useEffect(() => {
    // Skip initialization if map is not available
    if (!map || typeof window === 'undefined' || !L) return;
    
    // Clean up existing layer first
    cleanupParticleLayer();
    
    // If no activities or just one, don't create particles
    if (!activities || activities.length < 2) {
      return;
    }
    
    // New logic to ensure all markers are used
    const connections: Connection[] = [];
    
    // Create connections to ensure each activity is connected to at least one other
    const activityCopy = [...activities];
    
    // Limit the number of activities processed to improve performance
    const maxActivities = Math.min(activityCopy.length, 30);
    const processedActivities = activityCopy.slice(0, maxActivities);
    
    // For each activity, create at least one outgoing connection
    processedActivities.forEach((source) => {
      // Choose a target that is not the point itself
      const possibleTargets = processedActivities.filter(a => a.id !== source.id);
      
      if (possibleTargets.length > 0) {
        // Get a random target
        const targetIndex = Math.floor(Math.random() * possibleTargets.length);
        const target = possibleTargets[targetIndex];
        
        // Add the connection
        connections.push({
          source: source,
          target: target,
          id: `${source.id}-${target.id}`
        });
      }
    });
    
    // Add some extra random connections (reduced to improve performance)
    const extraConnectionCount = Math.min(10, Math.floor(activities.length * 0.3));
    for (let i = 0; i < extraConnectionCount; i++) {
      const sourceIndex = Math.floor(Math.random() * processedActivities.length);
      let targetIndex = Math.floor(Math.random() * processedActivities.length);
      
      // Avoid self-connections
      while (targetIndex === sourceIndex) {
        targetIndex = Math.floor(Math.random() * processedActivities.length);
      }
      
      connections.push({
        source: processedActivities[sourceIndex],
        target: processedActivities[targetIndex],
        id: `${processedActivities[sourceIndex].id}-${processedActivities[targetIndex].id}-${i}`
      });
    }
    
    connectionsRef.current = connections;
    
    // Create particles for each connection
    const particles: Particle[] = [];
    
    connections.forEach(connection => {
      // Reduce the number of particles per connection (1-2 particles)
      const count = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < count; i++) {
        // Always use the source type for color (no bidirectional logic that causes confusion)
        const sourceType = connection.source.type;
        
        // Distribute particles evenly along the path
        const initialProgress = i / count;
        
        particles.push({
          x: 0,
          y: 0,
          size: Math.random() * 0.8 + 1.2, // Smaller particles (0.5-1.3px)
          speed: 0.00004, // Extremely slow speed
          connection: connection,
          progress: initialProgress, // Initially distribute uniformly
          color: getActivityColor(sourceType) // Consistent color based on source
        });
      }
    });
    
    particlesRef.current = particles;
    
    // Create and add the custom layer to the map
    const ParticleCanvasLayer = initCanvasLayer();
    if (!ParticleCanvasLayer) {
      console.error("Could not initialize canvas layer");
      return;
    }
    
    const particleLayer = new ParticleCanvasLayer();
    particleLayerRef.current = particleLayer;
    
    // Função para desenhar as partículas
    particleLayer.onDrawLayer = function({ canvas }: DrawLayerEvent) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Limpar o canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Otimização: Obter uma única vez os limites do canvas
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Expandir os limites um pouco para não redesenhar partículas que acabaram de sair
      const expandedBounds = {
        left: -10,
        top: -10,
        right: canvasWidth + 10,
        bottom: canvasHeight + 10
      };
      
      // Desenhar cada partícula
      for (const particle of particlesRef.current) {
        const { source, target } = particle.connection;
        
        // Converter coordenadas para pontos no mapa
        const sourcePoint = map.latLngToContainerPoint([source.lat, source.lng]);
        const targetPoint = map.latLngToContainerPoint([target.lat, target.lng]);
        
        // Calcular posição atual com base no progresso
        particle.x = sourcePoint.x + (targetPoint.x - sourcePoint.x) * particle.progress;
        particle.y = sourcePoint.y + (targetPoint.y - sourcePoint.y) * particle.progress;
        
        // Atualizar progresso
        particle.progress += particle.speed;
        if (particle.progress > 1) {
          // Reiniciar a partícula quando ela chega ao final
          particle.progress = 0;
          }

        // Otimização: Verificação mais eficiente se a partícula está no canvas
        if (
          particle.x > expandedBounds.left && 
          particle.x < expandedBounds.right && 
          particle.y > expandedBounds.top && 
          particle.y < expandedBounds.bottom
        ) {
          // Desenhar partícula simplificada (sem sombras em todos os frames)
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          
          // Otimização: Usar sombra apenas ocasionalmente (a cada 20 frames) para poupar recursos
          const useShadow = frameCountRef.current % 20 === 0;
          
          if (useShadow) {
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 5; // Reduzir o raio do blur para melhorar desempenho
          }
          
          ctx.fillStyle = particle.color;
          ctx.fill();
          
          if (useShadow) {
            ctx.shadowBlur = 0;
          }
        }
      }
      
      // Incrementar o contador de frames
      frameCountRef.current += 1;
    };
    
    // Adicionar a camada ao mapa
    map.addLayer(particleLayer);
    
    // Iniciar a animação com throttling (limitar a 30 FPS)
    const throttledRedraw = throttle(() => {
      if (map && particleLayerRef.current) {
        particleLayerRef.current._redraw();
      }
    }, 33); // ~30 FPS
    
    const animate = () => {
      // Safety check - if the map is gone, cancel animation
      if (!map || !particleLayerRef.current) {
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
        }
        return;
      }

      throttledRedraw();
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    // Cleanup on unmount
    return () => {
      cleanupParticleLayer();
    };
  }, [activities, map]);

  return null;
}

export function ConnectionLines({ activities }: { activities: Activity[] }) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !L) return;
    
    // Clean up existing layer
    if (layerRef.current) {
      try {
        map.removeLayer(layerRef.current);
      } catch (e) {
        console.warn('Error removing connection lines layer:', e);
      }
      layerRef.current = null;
    }
    
    // If there are less than 2 activities, don't draw connections
    if (!activities || activities.length < 2) {
      return;
    }

    // Create connections between activities
    const connections: Connection[] = [];
    
    // Create the connection lines layer
    const ConnectionLinesLayer = L.Layer.extend({
      onAdd: function(map: LeafletMap) {
        this._map = map;
        this._canvas = L.DomUtil.create('canvas', 'leaflet-layer');
        this._canvas.style.pointerEvents = 'none';
        this._canvas.style.zIndex = 399;
        
        const size = map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;
        
        map._panes.overlayPane.appendChild(this._canvas);
        
        map.on('moveend', this._reset, this);
        map.on('resize', this._resize, this);
        
        if (map.options.zoomAnimation && L.Browser.any3d) {
          map.on('zoomanim', this._animateZoom, this);
        }
        
        this._reset();
        return this;
      },
      
      onRemove: function(map: LeafletMap) {
        if (!map || !map.getPanes() || !map.getPanes().overlayPane || !this._canvas) {
          return;
        }
        
        try {
          map.getPanes().overlayPane.removeChild(this._canvas);
          map.off('moveend', this._reset, this);
          map.off('resize', this._resize, this);
          map.off('zoomanim', this._animateZoom, this);
        } catch (e) {
          console.warn('Error in ConnectionLines onRemove:', e);
        }
      },
      
      _resize: function(resizeEvent: ResizeEvent) {
        if (this._canvas) {
          this._canvas.width = resizeEvent.newSize.x;
          this._canvas.height = resizeEvent.newSize.y;
        }
      },
      
      _reset: function() {
        if (!this._map || !this._canvas) return;
        
        const topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        this._redraw();
      },
      
      _redraw: function() {
        if (!this._map || !this._canvas) return;
        
        const size = this._map.getSize();
        const canvas = this._canvas;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;
        
        ctx.clearRect(0, 0, size.x, size.y);
        
        // Draw connection lines
        if (activities && activities.length >= 2) {
          // Draw paths between activities
          const maxDistance = 3000; // Maximum distance in pixels to draw a connection
          
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = 0.15;
          
          // Limit connections for performance
          const connectionLimit = 40;
          let connectionCount = 0;
          
          for (let i = 0; i < activities.length && connectionCount < connectionLimit; i++) {
            const source = activities[i];
            // Convert lat/lng to pixel coordinates
            const sourcePoint = map.latLngToContainerPoint([source.lat, source.lng]);
            
            for (let j = i + 1; j < activities.length && connectionCount < connectionLimit; j++) {
              const target = activities[j];
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
                
                // Create gradient
                const gradient = ctx.createLinearGradient(
                  sourcePoint.x, sourcePoint.y,
                  targetPoint.x, targetPoint.y
                );
                gradient.addColorStop(0, sourceColor);
                gradient.addColorStop(1, targetColor);
                
                ctx.strokeStyle = gradient;
                
                // Draw line
                ctx.beginPath();
                ctx.moveTo(sourcePoint.x, sourcePoint.y);
                ctx.lineTo(targetPoint.x, targetPoint.y);
                ctx.stroke();
                
                connectionCount++;
              }
            }
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
          this._canvas.style[L.DomUtil.TRANSFORM] = 
            L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
        }
      }
    });
    
    // Create and add the layer
    const connectionLayer = new ConnectionLinesLayer();
    layerRef.current = connectionLayer;
    map.addLayer(connectionLayer);
    
    // Cleanup on unmount
    return () => {
      if (map && layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch (e) {
          console.warn('Error removing connection lines on cleanup:', e);
        }
        layerRef.current = null;
      }
    };
  }, [activities, map]); // Include activities and map as dependencies

  return null;
}
