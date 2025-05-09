const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Set the test environment
  testEnvironment: 'jest-environment-jsdom',
  
  // Define the glob patterns Jest should use to detect test files
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Define paths to modules that should be mocked
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',
    // Handle CSS imports (with CSS modules)
    '\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    // Handle CSS imports (without CSS modules)
    '\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Mock react-leaflet
    '^react-leaflet$': '<rootDir>/__mocks__/react-leaflet.js',
    '^react-leaflet/.*$': '<rootDir>/__mocks__/react-leaflet.js',
  },
  
  // Handle transformations
  transform: {
    // Use babel-jest to transpile tests with the next/babel preset
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Transform files from node_modules that need to be processed
  transformIgnorePatterns: [
    // Process ES modules from react-leaflet and other node_modules
    '/node_modules/(?!((react-leaflet|@react-leaflet|leaflet|@emotion|@?react-icons|@?react-dnd)/))'
  ],
  
  // Speed up test execution
  maxWorkers: '50%',
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig); 