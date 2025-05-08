/**
 * Utility to handle mobile viewport height calculation
 * Extracted from inline script to improve page loading and maintainability
 */

/**
 * Sets the viewport height CSS variable and adjusts map containers
 * to handle mobile viewport height issues
 */
export function setMobileViewportHeight(): void {
  // Only adjust Leaflet map containers - the viewport height
  // is now handled by CSS variables with dvh units
  const mapElements = document.querySelectorAll('.leaflet-container');
  mapElements.forEach(el => {
    if (el instanceof HTMLElement) {
      // Use CSS variables for consistent height
      el.style.height = `calc(100 * var(--vh))`;
    }
  });
}

/**
 * Initialize viewport height handling
 * Sets up event listeners for window resize and device orientation changes
 */
export function initViewportHeightFix(): void {
  // Run immediately on load
  setMobileViewportHeight();

  // Handle window resize events
  window.addEventListener('resize', () => {
    setMobileViewportHeight();
  });

  // Handle device orientation changes
  window.addEventListener('orientationchange', () => {
    // Small delay to ensure accurate calculations after orientation change
    setTimeout(setMobileViewportHeight, 100);
  });
}

/**
 * Clean up viewport height event listeners
 * Should be called when component unmounts if used in React component
 */
export function cleanupViewportHeightFix(): void {
  window.removeEventListener('resize', setMobileViewportHeight);
  window.removeEventListener('orientationchange', () => {
    setTimeout(setMobileViewportHeight, 100);
  });
}

export default initViewportHeightFix; 