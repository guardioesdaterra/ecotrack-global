import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ConnectionLines, computeConnectionLines } from '@/components/connection-lines';
import { Activity } from '@/components/map-component';
import { createMapContainer, cleanupMapContainer } from '@/utils/test-utils';

// Import Leaflet mock
import '@/__mocks__/leaflet';

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
  {
    id: '3',
    lat: 51.45,
    lng: -0.1,
    title: 'Another London Activity',
    type: 'education',
    description: 'A second test activity in London',
    address: 'London, UK',
    country: 'United Kingdom',
  },
];

describe('ConnectionLines', () => {
  let map: any;
  
  beforeEach(() => {
    // Create map container
    createMapContainer();
    
    // Create Leaflet map instance
    const L = require('leaflet');
    map = L.map('map').setView([0, 0], 2);
    
    // Make sure our mock methods are properly set up
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Clean up map
    if (map) {
      map.remove();
      map = null;
    }
    
    // Clean up container
    cleanupMapContainer();
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  it('renders without crashing', () => {
    render(<ConnectionLines activities={mockActivities} map={map} />);
    // Component doesn't render any DOM elements, just manipulates the map
    // So we just verify it doesn't crash
  });
  
  it('creates polylines for connections', async () => {
    render(<ConnectionLines activities={mockActivities} map={map} />);
    
    // Wait for connections to be drawn
    await waitFor(() => {
      const L = require('leaflet');
      expect(L.polyline).toHaveBeenCalled();
    });
  });
  
  it('creates connections between activities in the same country', () => {
    // Test the computeConnectionLines function
    const connections = computeConnectionLines(mockActivities);
    
    // Should have a connection between the two UK activities
    const ukConnection = connections.find(
      c => (c.from_activity_id === '1' && c.to_activity_id === '3') || 
           (c.from_activity_id === '3' && c.to_activity_id === '1')
    );
    
    expect(ukConnection).toBeDefined();
    expect(connections.length).toBeGreaterThan(0);
  });
  
  it.skip('cleans up polylines when unmounted', async () => {
    // Create a mock polyline with a remove method we can track
    const mockRemove = jest.fn();
    const mockPolyline = {
      addTo: jest.fn().mockReturnThis(),
      remove: mockRemove,
      setLatLngs: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      off: jest.fn().mockReturnThis(),
      hasLayer: jest.fn().mockReturnValue(true),
      setStyle: jest.fn().mockReturnThis(),
    };
    
    // Mock the L.polyline function to return our mock
    const L = require('leaflet');
    const originalPolyline = L.polyline;
    L.polyline = jest.fn().mockReturnValue(mockPolyline);
    
    // Render the component
    const { unmount } = render(
      <ConnectionLines activities={mockActivities} map={map} />
    );
    
    // Wait for connections to be drawn
    await waitFor(() => {
      expect(L.polyline).toHaveBeenCalled();
    });
    
    // Unmount component
    unmount();
    
    // Add a small delay to allow cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify polyline remove was called
    expect(mockRemove).toHaveBeenCalled();
    
    // Restore original implementation
    L.polyline = originalPolyline;
  });
  
  it('updates connections when activities change', async () => {
    // Mock specific methods for this test
    const L = require('leaflet');
    L.polyline.mockClear();
    
    const { rerender } = render(
      <ConnectionLines 
        activities={mockActivities.slice(0, 2)} 
        map={map} 
      />
    );
    
    // Wait for initial connections to be drawn
    await waitFor(() => {
      expect(L.polyline).toHaveBeenCalled();
    });
    
    // Reset mock to count new calls
    L.polyline.mockClear();
    
    // Re-render with all activities
    rerender(
      <ConnectionLines 
        activities={mockActivities} 
        map={map} 
      />
    );
    
    // Should create new polylines
    await waitFor(() => {
      expect(L.polyline).toHaveBeenCalled();
    });
  });
}); 