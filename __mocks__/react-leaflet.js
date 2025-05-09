// Import React for JSX
const React = require('react');

// Mock for react-leaflet
const reactLeaflet = {
  // Map hooks
  useMap: jest.fn().mockReturnValue({}),
  useMapEvent: jest.fn(),
  useMapEvents: jest.fn(),
  
  // Components
  MapContainer: jest.fn().mockImplementation(({ children }) => {
    return React.createElement('div', { className: 'leaflet-container' }, children);
  }),
  
  TileLayer: jest.fn().mockImplementation(() => null),
  Marker: jest.fn().mockImplementation(() => null),
  Popup: jest.fn().mockImplementation(({ children }) => 
    React.createElement('div', { className: 'leaflet-popup' }, children)
  ),
  ZoomControl: jest.fn().mockImplementation(() => null),
  CircleMarker: jest.fn().mockImplementation(() => null),
  Polyline: jest.fn().mockImplementation(() => null),
  LayerGroup: jest.fn().mockImplementation(({ children }) => 
    React.createElement('div', null, children)
  ),
};

module.exports = reactLeaflet; 