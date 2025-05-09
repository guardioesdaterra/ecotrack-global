# Map Component Tests

This directory contains tests for the EcoTrack Global map components, focusing on the Leaflet-based map implementation.

## Test Files

- **map-component.test.tsx**: Tests basic map functionality including rendering, markers, zoom controls, and cleanup
- **connection-lines.test.tsx**: Tests connection line generation between map points
- **particle-effect.test.tsx**: Tests canvas initialization and animation handling
- **MapClient.test.tsx**: Tests the main map client component with activities

## Test Architecture

### Mocking Strategy

The tests use several mocking approaches:

1. **Leaflet Mock**: A comprehensive mock of Leaflet.js in `__mocks__/leaflet.js`
2. **react-leaflet Mock**: A simplified mock that prevents ESM import errors
3. **Dynamic Import Mocking**: For Next.js dynamic imports (used in MapClient tests)
4. **Canvas/Animation Mocks**: For particle effects and animations

### Test Utilities

Custom test utilities in `utils/test-utils.tsx` provide:

- Map container creation/cleanup
- Custom assertions for map elements
- Helper functions for simulating events

## Running Tests

```bash
# Run all map component tests
npx jest __tests__/components/

# Run a specific test file
npx jest __tests__/components/map-component.test.tsx
```

## Current Status

All critical map component functionality is tested, including:

- Basic map rendering and initialization
- Activity marker display and interaction
- Connection lines between activities
- Particle effects and animations
- Map event handling (zoom, resize)
- Proper cleanup to prevent memory leaks

### Known Limitations

1. The cleanup test in connection-lines.test.tsx is currently skipped due to mocking complexity
2. Some advanced MapClient tests are skipped as they require complex context mocking
3. Touch interactions are not fully tested yet

## Future Improvements

1. Add tests for mobile touch optimization features
2. Add tests for offline support functionality
3. Improve context mocking for MapClient.test.tsx
4. Add performance benchmarking tests 