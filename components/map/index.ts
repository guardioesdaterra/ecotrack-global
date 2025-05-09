// Export all map components from a single entry point

// Main client component
export { MapClient } from './MapClient';

// Core map container
export { MapContainer } from './MapContainer';

// UI components
export { MapLegend } from './MapLegend';
export { PhotoGallery } from './PhotoGallery';

// Marker components
export { SimpleMarker, createMarkerIcon } from './MarkerComponents';
export { MarkerCluster } from './MarkerCluster';

// Types and utilities
export * from './types';
export * from './utils'; 