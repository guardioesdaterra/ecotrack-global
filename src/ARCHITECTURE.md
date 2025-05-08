# Feature-Sliced Design Architecture (FSD)

This project is organized using the Feature-Sliced Design methodology, which helps create a scalable, maintainable codebase by organizing code into layers and slices.

## Directory Structure

```
src/
├── app/         # Application layer (pages, layouts)
├── features/    # Feature modules (use cases)
│   ├── auth/    # Authentication feature
│   ├── mapping/ # Map visualization feature  
│   └── analytics/ # Data analytics feature
├── entities/    # Business entities
├── shared/      # Shared infrastructure
│   ├── api/     # API clients and methods
│   ├── config/  # Application configuration
│   ├── lib/     # Utility libraries
│   └── ui/      # UI component library
```

## Layers

The architecture is organized into 5 main layers, from highest to lowest level:

1. **App** - Entry points and global providers
   - Pages, layouts, global styles
   - Global providers and configurations

2. **Features** - User scenarios and business processes 
   - Complex UI blocks for specific functionality
   - Business logic for specific features
   - Each feature combines UI, logic, and composition

3. **Entities** - Business entities and domain models
   - Domain models (User, Activity, Project)
   - Entity-related components and logic
   - Complex state management for entities

4. **Shared** - Reusable infrastructure
   - UI components library
   - Utility functions
   - API clients
   - Types and interfaces

## Import Rules

To maintain a clean architecture, follow these rules:

- A layer can only import from layers strictly below it
  - App can import from Features, Entities, and Shared
  - Features can import from Entities and Shared
  - Entities can import from Shared

- Slices at the same layer cannot import from each other
  - Auth feature cannot import from the Mapping feature

- Public interfaces should be exported from the index.ts files

## Benefits of this Architecture

- **Isolation**: Features are isolated from each other
- **Independence**: Develop features in parallel without conflicts
- **Maintainability**: Clear boundaries make the codebase easier to maintain
- **Scalability**: New features can be added without affecting existing ones
- **Reusability**: Shared components and utilities are organized effectively

## Practical Example

For a feature like "user authentication":

1. UI components in `features/auth/ui/`
2. Business logic in `features/auth/lib/`
3. API integration in `features/auth/api/`
4. Types in `features/auth/model/`
5. Main exports in `features/auth/index.ts`

## Recommendations

- Keep feature modules encapsulated and focused
- Avoid circular dependencies between layers
- Follow naming conventions consistently
- Export public interfaces through index.ts files 