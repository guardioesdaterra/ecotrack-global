import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Add custom render methods and test utilities here
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { ...options });

// Create a div with specific dimensions for Leaflet map testing
export const createMapContainer = (): HTMLElement => {
  const container = document.createElement('div');
  container.id = 'map';
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  return container;
};

// Helper to clean up map container
export const cleanupMapContainer = () => {
  const container = document.getElementById('map');
  if (container) {
    document.body.removeChild(container);
  }
};

// Simulate browser window resize event
export const simulateResize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
};

// Simulate device orientation change
export const simulateOrientationChange = () => {
  window.dispatchEvent(new Event('orientationchange'));
};

// Helper for testing touch events
export const createTouchEvent = (type: string, x: number, y: number) => {
  const touchObj = new Touch({
    identifier: Date.now(),
    target: document.body,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    radiusX: 2.5,
    radiusY: 2.5,
    rotationAngle: 10,
    force: 0.5,
  });

  const touchEvent = new TouchEvent(type, {
    cancelable: true,
    bubbles: true,
    touches: [touchObj],
    targetTouches: [],
    changedTouches: [touchObj],
  });

  return touchEvent;
};

// Simulate geolocation API
export const mockGeolocation = (latitude = 0, longitude = 0) => {
  const mockGeolocation = {
    getCurrentPosition: jest.fn().mockImplementation(success => {
      success({
        coords: {
          latitude,
          longitude,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    }),
    watchPosition: jest.fn().mockImplementation(success => {
      success({
        coords: {
          latitude,
          longitude,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
      return 123; // watchId
    }),
    clearWatch: jest.fn(),
  };

  Object.defineProperty(global.navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
  });

  return mockGeolocation;
};

// Mock network status for offline testing
export const mockNetworkStatus = (online = true) => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: online,
  });

  if (!online) {
    window.dispatchEvent(new Event('offline'));
  } else {
    window.dispatchEvent(new Event('online'));
  }
};

// Mock IndexedDB for offline storage testing
export const mockIndexedDB = () => {
  const indexedDB = {
    open: jest.fn().mockReturnValue({
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: {
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            put: jest.fn(),
            getAll: jest.fn().mockReturnValue({
              onsuccess: null,
            }),
            get: jest.fn().mockReturnValue({
              onsuccess: null,
            }),
          }),
        }),
        createObjectStore: jest.fn(),
      },
    }),
  };

  Object.defineProperty(window, 'indexedDB', {
    value: indexedDB,
    writable: true,
  });

  return indexedDB;
};

export * from '@testing-library/react';
export { customRender as render }; 