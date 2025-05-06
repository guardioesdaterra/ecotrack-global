# EcoTrack Global: System Architecture

## Technical Stack Overview

### Core Framework
- **Next.js**: Server-side rendering React framework (v13+)
  - App Router architecture (`app/` directory structure)
  - Server components for improved performance
  - Client components for interactive elements (`"use client"` directives)
  - Dynamic imports for code splitting and lazy loading

### Frontend Technologies
- **React**: v18+ utilizing hooks pattern extensively
- **TypeScript**: Static typing for improved development experience and code quality
- **Tailwind CSS**: Utility-first CSS framework for styling
  - Custom components.json configuration for theming
  - Extended with custom utilities via tailwind.config.ts
- **Shadcn UI**: Component library built on Tailwind and Radix UI
- **Framer Motion**: Advanced animation library for UI transitions and effects

### State Management
- **React Context API**: Multiple context providers for global state management
  - `OverlayContext`: Controls modal/overlay visibility across the application
  - `PerformanceModeContext`: Manages performance settings based on device capabilities

### Data Management
- **Supabase**: PostgreSQL-based backend as a service
  - Authentication (Auth)
  - Database operations
  - Storage (for user uploads)
  - Realtime subscriptions (implied by code structure)

### Rendering & Visualization
- **COBE**: WebGL-based library for interactive 3D globe rendering
  - Custom wrapper with enhanced interaction capabilities
  - Marker system for geographical data points
- **Leaflet**: Map visualization library (implied by directory structure)

## Architecture Patterns

### Component Structure
1. **UI Components** (`components/ui/`):
   - Atomic, reusable components (e.g., Button, Globe, NavigationMenu)
   - Typically framework-agnostic
   - Extended with application-specific behavior

2. **Page Components** (`app/*/page.tsx`):
   - Next.js page components
   - Compose UI components
   - Handle page-level state and data fetching

3. **Layout Components** (`app/*/layout.tsx`):
   - Define persistent UI elements
   - Wrap page components
   - Provide context providers

4. **Context Providers** (`contexts/`):
   - Provide global state and functions
   - Used by multiple components across the application

### Data Flow

1. **Data Fetching**:
   - Server-side data fetching in page components
   - Client-side fetching with Supabase client
   - LocalStorage caching for offline/performance
   - Fallback mechanisms for failed requests

2. **State Management Hierarchy**:
   - Global state via Context API
   - Component-level state via React hooks
   - Performance-optimized state updates via memoization

3. **Event Handling**:
   - DOM event handling for user interactions
   - Custom event handlers for complex interactions
   - Event delegation patterns for performance

## Routing and Navigation

- **Next.js App Router**:
  - File-system based routing
  - Dynamic routes for resource-specific pages
  - Middleware for route protection and redirects

- **Structure**:
  - `/`: Landing page with globe visualization
  - `/map`: Interactive map view of environmental activities
  - `/monitor`: Analytics dashboard
  - `/profile`: User account management
  - `/auth`: Authentication flows

## Performance Optimization Strategies

1. **Code Splitting**:
   - Dynamic imports for large components
   - Route-based code splitting
   - Component-level lazy loading

2. **Rendering Optimization**:
   - Conditional rendering based on device capabilities
   - Responsive design with feature reduction for mobile
   - Deferred loading of non-critical components

3. **Resource Management**:
   - Device detection for capability-aware rendering
   - Hardware acceleration for animations and WebGL
   - Memory usage monitoring and optimization

4. **Caching**:
   - Client-side caching with localStorage
   - Timestamp-based cache invalidation
   - Fallback to cached data when network requests fail

## Security Measures

1. **Authentication**:
   - Supabase authentication with secure token handling
   - Protected routes via middleware
   - Session management

2. **Data Access**:
   - Row-level security policies (implied by Supabase usage)
   - Parameterized queries to prevent injection
   - Data validation before storage

3. **Client-Side Security**:
   - Environment variable segregation
   - HTTPS enforcement
   - Content-Security-Policy implementation

## Deployment Architecture

1. **Frontend Deployment**:
   - Next.js application deployment
   - Static asset optimization
   - Edge caching for improved performance

2. **Backend Services**:
   - Supabase managed services
   - Database operations
   - Authentication service
   - Storage service

3. **Environment Configuration**:
   - Environment variables via .env.local
   - Production/development configuration separation

## Technical Challenges and Solutions

1. **3D Globe Rendering**:
   - Challenge: Performance issues with WebGL on low-end devices
   - Solution: Adaptive rendering based on device capabilities, reduced geometry on mobile

2. **Responsive Design**:
   - Challenge: Complex visualizations on mobile screens
   - Solution: Responsive layout with mobile-first approaches, simplified visualizations on small screens

3. **Data Synchronization**:
   - Challenge: Real-time updates across multiple views
   - Solution: Supabase realtime subscriptions, optimistic UI updates

4. **Performance**:
   - Challenge: Heavy animations causing jank on low-end devices
   - Solution: Performance mode detection, reduced animations, hardware acceleration

This document provides a high-level technical overview of the EcoTrack Global system architecture. For component-specific details and implementation patterns, refer to the Component Documentation. 