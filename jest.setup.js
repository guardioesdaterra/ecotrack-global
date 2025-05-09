// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => ({
    get: jest.fn(),
    has: jest.fn(),
    toString: jest.fn(),
  }),
}));

// Mock for window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.elements = new Set();
    this.mockEntries = [];
  }
  
  observe(element) {
    this.elements.add(element);
    this.mockEntries.push({
      target: element,
      isIntersecting: false,
      boundingClientRect: { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 },
      intersectionRatio: 0,
      intersectionRect: { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 },
      rootBounds: null,
      time: Date.now(),
    });
  }
  
  unobserve(element) {
    this.elements.delete(element);
    this.mockEntries = this.mockEntries.filter(entry => entry.target !== element);
  }
  
  disconnect() {
    this.elements.clear();
    this.mockEntries = [];
  }
  
  // Helper method to trigger intersections
  triggerIntersection(isIntersecting) {
    this.mockEntries.forEach(entry => {
      entry.isIntersecting = isIntersecting;
    });
    this.callback(this.mockEntries, this);
  }
}

global.IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.elements = new Set();
    this.mockEntries = [];
  }
  
  observe(element) {
    this.elements.add(element);
    this.mockEntries.push({
      target: element,
      contentRect: { width: 100, height: 100 },
    });
  }
  
  unobserve(element) {
    this.elements.delete(element);
    this.mockEntries = this.mockEntries.filter(entry => entry.target !== element);
  }
  
  disconnect() {
    this.elements.clear();
    this.mockEntries = [];
  }
  
  // Helper method to trigger resize
  triggerResize(width = 100, height = 100) {
    this.mockEntries.forEach(entry => {
      entry.contentRect = { width, height };
    });
    this.callback(this.mockEntries, this);
  }
}

global.ResizeObserver = MockResizeObserver;

// Mock Touch events
class Touch {
  constructor(options) {
    Object.assign(this, options);
  }
}

global.Touch = Touch;

class TouchEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.touches = options.touches || [];
    this.targetTouches = options.targetTouches || [];
    this.changedTouches = options.changedTouches || [];
  }
}

global.TouchEvent = TouchEvent;

// Mock window.matchMedia for responsive design testing
window.matchMedia = jest.fn().mockImplementation(query => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
});

// Mock Leaflet global L object if window.L is accessed directly
global.L = require('./__mocks__/leaflet');

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock window.URL.createObjectURL and revokeObjectURL
if (window.URL) {
  window.URL.createObjectURL = jest.fn(() => 'mock-object-url');
  window.URL.revokeObjectURL = jest.fn();
}

// Add animejs mock
jest.mock('animejs', () => {
  return jest.fn().mockImplementation((params) => {
    return {
      play: jest.fn(),
      pause: jest.fn(),
      restart: jest.fn(),
      seek: jest.fn(),
      completed: false,
      began: true,
      paused: false,
      progress: 0,
    };
  });
});

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ReactDOM.render is no longer supported') ||
      args[0].includes('act(...)') ||
      args[0].includes('Warning: useLayoutEffect does nothing on the server') ||
      args[0].includes('Invalid prop'))
  ) {
    return;
  }
  originalConsoleError(...args);
}; 