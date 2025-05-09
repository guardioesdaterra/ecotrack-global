"use client"

import React from 'react';

// MapEffects component to inject animation styles 
export function MapEffects() {
  return (
    <style jsx global>{`
      /* Base map styling */
      .leaflet-container {
        background-color: #061825;
        z-index: 10; /* Lower than overlay z-index */
      }
      
      /* Custom popup styling */
      .leaflet-popup-content-wrapper {
        background: rgba(10, 25, 41, 0.85);
        color: white;
        border-radius: 8px;
        backdrop-filter: blur(12px);
        border: 1px solid rgba(6, 182, 212, 0.2);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1), 0 0 20px rgba(6, 182, 212, 0.1);
      }
      
      .leaflet-popup-tip {
        background: rgba(6, 182, 212, 0.8);
        backdrop-filter: blur(12px);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1), 0 0 20px rgba(6, 182, 212, 0.1);
      }
      
      .leaflet-popup-close-button {
        color: #0891b2; /* Cyan color to match theme */
      }
      
      /* Z-index layers - using more efficient selectors and avoiding !important */
      /* Set proper stacking order for map elements */
      .leaflet-map-pane {
        z-index: 200;
      }
      
      .leaflet-tile-pane {
        z-index: 100;
      }
      
      .leaflet-overlay-pane {
        z-index: 400;
      }
      
      .leaflet-shadow-pane {
        z-index: 500;
      }
      
      .leaflet-marker-pane {
        z-index: 600;
        position: relative;
      }
      
      .leaflet-tooltip-pane {
        z-index: 650;
      }
      
      .leaflet-popup-pane {
        z-index: 700;
      }
      
      /* Simplified marker styling with better performance */
      .custom-marker-icon {
        z-index: 800;
      }
      
      /* Group selectors for common properties */
      .activity-marker-container,
      .activity-marker {
        z-index: 800;
        visibility: visible;
        pointer-events: auto;
      }
      
      /* Fixed positioning for markers */
      .activity-marker-container {
        transform-origin: center center;
        transform: translate(-25px, -25px);
      }
      
      .activity-marker {
        transform: translate(-50%, -50%);
      }
      
      /* Enhanced Pulse animation for markers */
      @keyframes marker-pulse-opacity {
        0% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0.7;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.2);
          opacity: 0.3;
        }
        100% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0.7;
        }
      }
      
      /* Enhanced particle animations */
      @keyframes float-particle {
        0% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
        25% { transform: translateY(-15px) rotate(5deg); opacity: 0.7; }
        50% { transform: translateY(10px) rotate(-5deg); opacity: 0.6; }
        75% { transform: translateY(-8px) rotate(2deg); opacity: 0.5; }
        100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
      }
      
      @keyframes float-particle-alt {
        0% { transform: translateX(0) rotate(0deg); opacity: 0.4; }
        25% { transform: translateX(-15px) rotate(-5deg); opacity: 0.7; }
        50% { transform: translateX(15px) rotate(5deg); opacity: 0.6; }
        75% { transform: translateX(-8px) rotate(-2deg); opacity: 0.5; }
        100% { transform: translateX(0) rotate(0deg); opacity: 0.4; }
      }
      
      @keyframes pulse {
        0% { opacity: 0.8; }
        50% { opacity: 1; }
        100% { opacity: 0.8; }
      }
      
      /* Cyberpunk styling with better performance */
      .leaflet-container {
        background-color: #050C18;
        background-image: radial-gradient(circle at 50% 50%, rgba(20, 30, 48, 0.8) 0%, rgba(0, 10, 20, 0.8) 100%);
      }
      
      /* Decrease map label prominence */
      .leaflet-labels-pane {
        opacity: 0.35;
        filter: saturate(0.5) drop-shadow(0 0 1px #000);
        mix-blend-mode: soft-light;
      }
      
      .leaflet-tile-pane {
        filter: saturate(1.2) contrast(1.1) brightness(0.8) hue-rotate(200deg);
        mix-blend-mode: color-dodge;
      }
      
      /* Marker neon glow - more efficient */
      .leaflet-marker-icon {
        filter: drop-shadow(0 0 5px var(--neon-blue));
        transition: none;
      }
      
      /* Enhanced popup styling */
      .leaflet-popup-content-wrapper {
        background: rgba(5, 15, 25, 0.85);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(6, 247, 247, 0.3);
        box-shadow: 0 0 15px rgba(6, 247, 247, 0.5);
      }
      
      .leaflet-popup-content {
        color: rgba(255, 255, 255, 0.9);
        text-shadow: 0 0 5px rgba(5, 217, 254, 0.5);
      }
      
      .leaflet-popup-tip {
        background: #05d9fe;
        box-shadow: 0 0 10px rgba(5, 217, 254, 0.8);
      }
      
      /* Controls styling */
      .leaflet-control-zoom {
        border: 1px solid rgba(6, 247, 247, 0.4);
        background: rgba(5, 15, 25, 0.7);
        backdrop-filter: blur(4px);
        box-shadow: 0 0 10px rgba(6, 247, 247, 0.2);
      }
      
      .leaflet-control-zoom a {
        color: #06f7f7;
        background: rgba(0, 10, 20, 0.8);
      }
      
      .leaflet-control-zoom a:hover {
        background: rgba(0, 20, 30, 0.9);
        color: #06f7f7;
      }

      /* Custom styling for marker clusters */
      .marker-cluster {
        background-color: rgba(5, 15, 25, 0.6);
        border: 1px solid rgba(6, 247, 247, 0.4);
        box-shadow: 0 0 15px rgba(6, 247, 247, 0.3);
        backdrop-filter: blur(4px);
      }
      
      .marker-cluster div {
        background-color: rgba(5, 217, 254, 0.2);
        color: white;
        text-shadow: 0 0 4px rgba(6, 247, 247, 0.8);
        font-weight: bold;
      }

      /* Responsive styling */
      @media (max-width: 768px) {
        .leaflet-control-zoom {
          transform: scale(0.85);
          transform-origin: bottom right;
        }
        
        .marker-cluster {
          transform-origin: center;
        }
        
        .marker-cluster-small,
        .marker-cluster-medium,
        .marker-cluster-large {
          transform: scale(0.9);
        }
      }
    `}</style>
  );
}

// Simple error display component
export function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="p-6 bg-gray-800 rounded-lg border border-red-500/50 shadow-lg shadow-red-500/20 max-w-md">
        <h2 className="text-xl font-bold text-red-500 mb-2">Error Loading Map</h2>
        <p className="text-gray-300">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

// Loading screen component
export function LoadingScreen() {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-black via-black/90 to-black/80 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 animate-pulse flex items-center justify-center relative">
          <div className="h-8 w-8 text-white animate-spin border-2 border-white border-t-transparent rounded-full"></div>
        </div>
      </div>
      <p className="mt-4 text-white/80">Loading map...</p>
    </div>
  )
}

export default MapEffects; 