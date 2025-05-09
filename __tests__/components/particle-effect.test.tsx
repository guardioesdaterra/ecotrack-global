import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ParticleEffect } from '@/components/particle-effect';
import { createMapContainer, cleanupMapContainer } from '@/utils/test-utils';

// Import Leaflet mock
import '@/__mocks__/leaflet';

// Define the Activity type similar to the one in the component
interface Activity {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: string;
  description?: string;
  address?: string;
  country?: string;
  originalLat?: number;
  originalLng?: number;
}

// Sample test data
const mockActivities: Activity[] = [
  {
    id: '1',
    lat: 51.505,
    lng: -0.09,
    title: 'London Activity',
    type: 'reforestation',
    description: 'A test activity in London',
    address: 'London, UK',
    country: 'United Kingdom',
  },
  {
    id: '2',
    lat: 48.8566,
    lng: 2.3522,
    title: 'Paris Activity',
    type: 'clean-up',
    description: 'A test activity in Paris',
    address: 'Paris, France',
    country: 'France',
  },
];

describe('ParticleEffect', () => {
  let map: any;
  
  // Mock requestAnimationFrame and cancelAnimationFrame
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  
  beforeEach(() => {
    // Create map container
    createMapContainer();
    
    // Create Leaflet map instance
    const L = require('leaflet');
    map = L.map('map').setView([0, 0], 2);
    
    // Mock requestAnimationFrame and cancelAnimationFrame with proper type handling
    global.requestAnimationFrame = jest.fn().mockImplementation((callback: FrameRequestCallback): number => {
      return window.setTimeout(() => callback(Date.now()), 0) as unknown as number;
    });
    
    global.cancelAnimationFrame = jest.fn().mockImplementation((id: number): void => {
      clearTimeout(id as unknown as NodeJS.Timeout);
    });
    
    // Mock performance.now()
    if (!global.performance) {
      Object.defineProperty(global, 'performance', {
        value: {
          now: jest.fn(() => Date.now()),
        },
        writable: true,
      });
    } else {
      global.performance.now = jest.fn(() => Date.now());
    }
  });
  
  afterEach(() => {
    // Clean up map
    if (map) {
      map.remove();
      map = null;
    }
    
    // Clean up container
    cleanupMapContainer();
    
    // Restore original functions
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  it('renders without crashing', () => {
    render(<ParticleEffect activities={mockActivities} map={map} />);
    // Component doesn't render any DOM elements directly, just adds layers to map
  });
  
  it('adds a particle container to the map', async () => {
    render(<ParticleEffect activities={mockActivities} map={map} />);
    
    // Verify particles were added to the map
    await waitFor(() => {
      // Check if particle container is in the document
      const container = document.querySelector('.particle-container');
      expect(container).toBeInTheDocument();
    });
  });
  
  it('starts animation loop', async () => {
    render(<ParticleEffect activities={mockActivities} map={map} />);
    
    // Verify animation frame was requested
    await waitFor(() => {
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });
  
  it('cleans up when unmounted', async () => {
    const { unmount } = render(
      <ParticleEffect activities={mockActivities} map={map} />
    );
    
    // Wait for component to initialize
    await waitFor(() => {
      const container = document.querySelector('.particle-container');
      expect(container).toBeInTheDocument();
    });
    
    // Unmount component
    unmount();
    
    // Check that particle container was removed
    const container = document.querySelector('.particle-container');
    expect(container).not.toBeInTheDocument();
    
    // Verify cancelAnimationFrame was called
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });
  
  it('handles map zoom events', async () => {
    render(<ParticleEffect activities={mockActivities} map={map} />);
    
    // Wait for initialization
    await waitFor(() => {
      const container = document.querySelector('.particle-container');
      expect(container).toBeInTheDocument();
    });
    
    // Get the map event handlers since .fire() isn't in our mock
    const L = require('leaflet');
    const mapInstance = L.map.mock.results[0].value;
    
    // Execute the zoom handler directly
    const zoomHandler = mapInstance.on.mock.calls.find((call: [string, Function]) => call[0] === 'zoom');
    if (zoomHandler && zoomHandler[1]) {
      zoomHandler[1]();
    }
    
    // Verify that the particle container still exists
    expect(document.querySelector('.particle-container')).toBeInTheDocument();
  });
  
  it('handles map resize events', async () => {
    render(<ParticleEffect activities={mockActivities} map={map} />);
    
    // Wait for initialization
    await waitFor(() => {
      const container = document.querySelector('.particle-container');
      expect(container).toBeInTheDocument();
    });
    
    // Get the map event handlers since .fire() isn't in our mock
    const L = require('leaflet');
    const mapInstance = L.map.mock.results[0].value;
    
    // Execute the resize handler directly
    const resizeHandler = mapInstance.on.mock.calls.find((call: [string, Function]) => call[0] === 'resize');
    if (resizeHandler && resizeHandler[1]) {
      resizeHandler[1]({ newSize: { x: 800, y: 600 } });
    }
    
    // Verify particle container still exists
    expect(document.querySelector('.particle-container')).toBeInTheDocument();
  });
}); 