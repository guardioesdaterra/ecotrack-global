/**
 * Enhanced touch interaction handlers for Leaflet maps
 * Improves mobile experience with better touch targets and gesture handling
 */

// Import Leaflet as a type for type checking
import type * as LeafletNamespace from 'leaflet';

/**
 * Configures enhanced touch interactions for a Leaflet map
 * @param map - The Leaflet map instance
 */
export function configureTouchInteractions(map: LeafletNamespace.Map): () => void {
  if (typeof window === 'undefined') return () => {};
  
  // Import Leaflet dynamically for runtime
  let L: typeof LeafletNamespace | null = null;
  if (typeof window !== 'undefined') {
    // Use require to get the actual Leaflet instance at runtime
    L = require('leaflet');
  }
  
  // Store original handlers to restore later
  const originalTouchStart = map.getContainer().ontouchstart;
  const originalTouchMove = map.getContainer().ontouchmove;
  const originalTouchEnd = map.getContainer().ontouchend;
  
  // Variables to track touch state
  let touchStartTime = 0;
  let lastTapTime = 0;
  let touchStartPosition = { x: 0, y: 0 };
  let isLongPress = false;

  // Prevent page scrolling when interacting with the map
  const preventMapScroll = (e: TouchEvent) => {
    // Only prevent if it's a map interaction (2+ fingers or moving on map)
    if (e.touches.length >= 2 || (map as any)._dragging) {
      e.preventDefault();
    }
  };
  
  // Enhanced touch start handler
  const handleTouchStart = (e: TouchEvent) => {
    touchStartTime = Date.now();
    isLongPress = false;
    
    if (e.touches.length === 1) {
      touchStartPosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
      
      // Set up long press detection
      setTimeout(() => {
        const currentTime = Date.now();
        if (currentTime - touchStartTime >= 500 && !isLongPress) {
          isLongPress = true;
          // Trigger right-click equivalent at touch position
          const clickEvent = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 2,
            buttons: 2,
            clientX: touchStartPosition.x,
            clientY: touchStartPosition.y
          });
          
          // Get the element at the touch position
          const element = document.elementFromPoint(
            touchStartPosition.x,
            touchStartPosition.y
          );
          
          if (element) {
            element.dispatchEvent(clickEvent);
          }
          
          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
      }, 500);
    }
  };
  
  // Enhanced touch move handler
  const handleTouchMove = (e: TouchEvent) => {
    // Cancel long press if finger moved significantly
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPosition.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosition.y);
      
      // If moved more than 10px, cancel long press
      if (deltaX > 10 || deltaY > 10) {
        isLongPress = true; // This prevents the long press from triggering
      }
    }
    
    // For 2+ finger gestures, ensure page doesn't scroll
    if (e.touches.length >= 2) {
      e.preventDefault();
    }
  };
  
  // Enhanced touch end handler
  const handleTouchEnd = (e: TouchEvent) => {
    if (!L) return; // Safety check
    
    const currentTime = Date.now();
    
    // Double tap detection for zoom
    if (e.changedTouches.length === 1 && !isLongPress) {
      const timeSinceLastTap = currentTime - lastTapTime;
      
      if (timeSinceLastTap < 300) {
        // Double tap detected - zoom in
        const touchPoint = e.changedTouches[0];
        // Use the runtime Leaflet instance
        const containerPoint = L.point(touchPoint.clientX, touchPoint.clientY);
        const layerPoint = map.containerPointToLayerPoint(containerPoint);
        const latlng = map.layerPointToLatLng(layerPoint);
        
        // Zoom in to the tapped location
        map.setView(latlng, map.getZoom() + 1, { animate: true });
        
        // Prevent other tap events
        e.preventDefault();
        e.stopPropagation();
        
        // Provide haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate([15, 10, 15]);
        }
      }
      
      lastTapTime = currentTime;
    }
  };
  
  // Apply handlers to map container
  const container = map.getContainer();
  container.addEventListener('touchstart', handleTouchStart, { passive: false });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  // Prevent scrolling when map is being interacted with
  document.addEventListener('touchmove', preventMapScroll, { passive: false });
  
  // Return cleanup function
  return () => {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchmove', preventMapScroll);
    
    // Restore original handlers if any
    if (originalTouchStart) container.ontouchstart = originalTouchStart;
    if (originalTouchMove) container.ontouchmove = originalTouchMove;
    if (originalTouchEnd) container.ontouchend = originalTouchEnd;
  };
}

/**
 * Enhances marker elements to have better touch targets
 * @param map - The Leaflet map instance
 */
export function enhanceMarkerTouchTargets(map: LeafletNamespace.Map): void {
  // Get all marker elements
  setTimeout(() => {
    try {
      const markerElements = document.querySelectorAll('.leaflet-marker-icon');
      
      markerElements.forEach(marker => {
        // Check if it's already an enhanced marker
        if (marker.classList.contains('touch-enhanced')) return;
        
        // Add a touch-friendly class
        marker.classList.add('touch-enhanced');
        
        // Add inline styles for larger touch area
        const element = marker as HTMLElement;
        
        // Create a larger invisible touch area
        const touchArea = document.createElement('div');
        touchArea.style.position = 'absolute';
        touchArea.style.top = '-12px';
        touchArea.style.left = '-12px';
        touchArea.style.width = '48px';
        touchArea.style.height = '48px';
        touchArea.style.zIndex = '1';
        touchArea.style.cursor = 'pointer';
        touchArea.style.background = 'transparent';
        touchArea.setAttribute('aria-hidden', 'true');
        touchArea.classList.add('marker-touch-target');
        
        // Forward click events to the marker
        touchArea.addEventListener('click', (e) => {
          e.stopPropagation();
          marker.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
        });
        
        // Add touch area to marker
        element.style.position = 'relative';
        element.appendChild(touchArea);
      });
    } catch (error) {
      console.error('Error enhancing marker touch targets:', error);
    }
  }, 1000); // Delay to ensure markers are rendered
}

/**
 * Adds CSS styles for enhanced touch interactions
 */
export function addTouchStyles(): void {
  if (typeof document === 'undefined') return;
  
  // Check if styles already exist
  if (document.getElementById('leaflet-touch-styles')) return;
  
  // Create style element
  const style = document.createElement('style');
  style.id = 'leaflet-touch-styles';
  style.textContent = `
    /* Larger touch targets for mobile */
    @media (max-width: 768px) {
      .leaflet-control-zoom a {
        width: 36px !important;
        height: 36px !important;
        line-height: 36px !important;
        font-size: 18px !important;
      }
      
      .leaflet-control-attribution {
        font-size: 10px !important;
      }
      
      .leaflet-control-layers-toggle {
        width: 44px !important;
        height: 44px !important;
        background-size: 25px 25px !important;
      }
      
      /* Custom marker touch enhancements */
      .activity-marker-container {
        transform: scale(1.2) !important;
      }
      
      .touch-enhanced {
        z-index: 1000 !important;
      }
      
      .marker-touch-target {
        background: rgba(0, 0, 0, 0.001) !important; /* Nearly invisible but still interactive */
      }
    }
    
    /* Active state for touch feedback */
    .leaflet-control-zoom a:active,
    .leaflet-control-layers-toggle:active {
      background-color: rgba(0, 0, 0, 0.2) !important;
    }
  `;
  
  // Add to document
  document.head.appendChild(style);
} 