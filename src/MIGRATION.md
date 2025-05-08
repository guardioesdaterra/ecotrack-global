# Migration Guide to Feature-Sliced Design

This guide outlines the plan for gradually transitioning the existing codebase to the Feature-Sliced Design (FSD) architecture.

## Migration Strategy

We'll follow an incremental approach to minimize disruption:

1. **Phase 1: Setup and Documentation**
   - Create the new directory structure (✅)
   - Document the architecture patterns (✅)
   - Define migration guidelines (This document)

2. **Phase 2: Move Shared Infrastructure**
   - Migrate utility functions → `src/shared/lib`
   - Migrate UI components → `src/shared/ui`
   - Migrate API clients → `src/shared/api`
   - Migrate configuration → `src/shared/config`

3. **Phase 3: Extract Business Entities**
   - Identify and extract entities (User, Activity, etc.)
   - Move entity-related code to `src/entities/{entity-name}`

4. **Phase 4: Organize Features**
   - Extract feature-specific code to `src/features/{feature-name}`
   - Ensure features follow FSD internal structure

5. **Phase 5: Clean App Layer**
   - Refactor page components to use feature modules
   - Keep pages lightweight (mostly composition)

## Migration Guidelines

### Moving Files

1. Move the file to its new location
2. Update imports in the file to follow the new architecture
3. Create/update index.ts file to export public interfaces
4. Update references in other files to use the new import paths

### Code Organization Within Features

Each feature should follow this structure:

```
features/feature-name/
├── api/          # API integration for this feature
├── lib/          # Business logic for this feature
├── model/        # Types, interfaces, and constants
├── ui/           # UI components specific to this feature
│   ├── component-name/   # Each component in own directory
│   │   ├── index.ts      # Exports the component
│   │   └── component.tsx # Implementation
├── index.ts      # Public exports
```

### Entities Structure

Each entity should follow this structure:

```
entities/entity-name/
├── model/        # Domain model, types
├── ui/           # Entity-specific UI components
├── lib/          # Entity-specific business logic
├── index.ts      # Public exports
```

## Current Code Mapping

Here's a mapping of where existing code should go:

| Current Location | New Location | Notes |
|-----------------|-------------|-------|
| `components/ui/*` | `src/shared/ui/*` | Reusable UI components |
| `components/map/*` | `src/features/mapping/ui/*` | Map-specific components |
| `components/profile/*` | `src/features/profile/ui/*` | Profile-specific components |
| `contexts/auth-context.tsx` | `src/features/auth/lib/auth-provider.tsx` | Auth state management |
| `lib/api-client.ts` | `src/shared/api/api-client.ts` | API client |
| `lib/utils/*` | `src/shared/lib/utils/*` | Utility functions |
| `lib/store/*` | Split between features and shared | Based on scope |
| `lib/effects/*` | `src/shared/lib/effects/*` | Generic effects |
| `hooks/*` | `src/shared/lib/hooks/*` or feature-specific | Depending on purpose |

## Recommended Migration Order

1. First migrate shared utilities and infrastructure
2. Then migrate business entities
3. Finally organize features

## Example Migration Commit

A good migration commit should:
- Move only related files in one commit
- Update all imports for moved files
- Include a clear commit message describing what was migrated 