// Mock for Leaflet
const L = {
  map: jest.fn().mockReturnValue({
    setView: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    addLayer: jest.fn().mockReturnThis(),
    removeLayer: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    getZoom: jest.fn().mockReturnValue(10),
    setZoom: jest.fn().mockReturnThis(),
    getCenter: jest.fn().mockReturnValue({ lat: 0, lng: 0 }),
    getBounds: jest.fn().mockReturnValue({
      getSouthWest: jest.fn().mockReturnValue({ lat: -10, lng: -10 }),
      getNorthEast: jest.fn().mockReturnValue({ lat: 10, lng: 10 }),
    }),
    fitBounds: jest.fn().mockReturnThis(),
    invalidateSize: jest.fn().mockReturnThis(),
    flyTo: jest.fn().mockReturnThis(),
    closePopup: jest.fn(),
    eachLayer: jest.fn((callback) => {
      // Mock layers
      callback({ options: {} });
    }),
    hasLayer: jest.fn().mockReturnValue(true),
    getContainer: jest.fn().mockReturnValue(document.createElement('div')),
  }),

  tileLayer: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  }),

  marker: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    bindPopup: jest.fn().mockReturnThis(),
    setIcon: jest.fn().mockReturnThis(),
    getLatLng: jest.fn().mockReturnValue({ lat: 0, lng: 0 }),
    setLatLng: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
  }),

  circle: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    setLatLng: jest.fn().mockReturnThis(),
    setRadius: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
  }),

  polyline: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    setLatLngs: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    hasLayer: jest.fn().mockReturnValue(true),
    setStyle: jest.fn().mockReturnThis(),
  }),

  polygon: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    setLatLngs: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
  }),

  divIcon: jest.fn().mockReturnValue({}),
  
  icon: jest.fn().mockReturnValue({}),

  latLng: jest.fn((lat, lng) => ({ lat, lng })),

  latLngBounds: jest.fn((sw, ne) => ({
    getSouthWest: jest.fn().mockReturnValue(sw),
    getNorthEast: jest.fn().mockReturnValue(ne),
    extend: jest.fn().mockReturnThis(),
    getCenter: jest.fn().mockReturnValue({ lat: 0, lng: 0 }),
  })),

  point: jest.fn((x, y) => ({ x, y })),

  control: {
    layers: jest.fn().mockReturnValue({
      addTo: jest.fn().mockReturnThis(),
      remove: jest.fn(),
    }),
    scale: jest.fn().mockReturnValue({
      addTo: jest.fn().mockReturnThis(),
      remove: jest.fn(),
    }),
  },

  // Add markerClusterGroup if used in your project
  markerClusterGroup: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnThis(),
    addLayer: jest.fn().mockReturnThis(),
    removeLayer: jest.fn().mockReturnThis(),
    clearLayers: jest.fn(),
    refreshClusters: jest.fn(),
    getBounds: jest.fn().mockReturnValue({
      getSouthWest: jest.fn().mockReturnValue({ lat: -10, lng: -10 }),
      getNorthEast: jest.fn().mockReturnValue({ lat: 10, lng: 10 }),
    }),
    hasLayer: jest.fn().mockReturnValue(true),
  }),

  DomUtil: {
    create: jest.fn().mockReturnValue(document.createElement('div')),
    addClass: jest.fn(),
    removeClass: jest.fn(),
  },

  Browser: {
    mobile: false,
    touch: false,
    pointer: false,
  },
};

// Export both as default and as named exports
module.exports = L;
module.exports.default = L; 