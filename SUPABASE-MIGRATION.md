# Supabase Client Migration Guide

## Overview

We've consolidated Supabase client management across the EcoTrack Global application to use a single, consistent approach based on the recommended `@supabase/ssr` pattern. This addresses several issues:

- Inconsistent error handling across different client implementations
- Authentication state issues due to different cookie management approaches
- Inefficient resource usage from multiple client instances
- Confusing developer experience with multiple ways to access Supabase
- Compatibility issues between Pages Router and App Router

## What Changed

1. A new consolidated client management system in `utils/supabase/index.ts` that:
   - Provides proper TypeScript typing
   - Implements browser-side client singleton for efficiency
   - Handles server-side cookie management correctly
   - Offers helper functions for common operations
   - Supports both App Router and Pages Router

2. Legacy implementations are preserved temporarily with deprecated notices:
   - `lib/supabase.ts` - Now imports from the new system
   - `lib/supabaseClient.ts` - Now imports from the new system
   - `utils/supabase/client.ts` and `utils/supabase/server.ts` - Simplified to just delegate to the new system

3. The middleware is updated to use the consolidated approach

## Migration Steps for Components

### 1. Update Imports

Replace old imports with the new ones:

```diff
- import { supabase } from '@/lib/supabase'
+ import { createBrowserSupabaseClient } from '@/utils/supabase'

- import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
+ import { createBrowserSupabaseClient } from '@/utils/supabase'

- import { getSupabaseServerClient } from '@/lib/supabaseClient'
+ import { createServerSupabaseClient } from '@/utils/supabase'

- import { createClient } from '@/utils/supabase/client'
+ import { createBrowserSupabaseClient } from '@/utils/supabase'

- import { createClient } from '@/utils/supabase/server'
+ import { createServerSupabaseClient } from '@/utils/supabase'
```

### 2. Update Client Creation

Replace client creation code:

```diff
// Client-side (Browser components)
- const supabase = getSupabaseBrowserClient()
- if (!supabase) {
-   console.error('Supabase client is not available')
-   return
- }
+ const supabase = createBrowserSupabaseClient()
  
// Server-side (App Router - Server components)
- const supabase = await getSupabaseServerClient()
- if (!supabase) {
-   console.error('Supabase server client is not available')
-   return
- }
+ const supabase = await createServerSupabaseClient()

// Server-side (Pages Router - getServerSideProps)
- const supabase = await getSupabaseServerClient()
- if (!supabase) {
-   console.error('Supabase server client is not available')
-   return
- }
+ const supabase = await createServerSupabaseClient(context)
```

### 3. Use Helper Functions When Applicable

The new system provides helper functions that encapsulate common operations:

```typescript
import { 
  getUserActivities, 
  createActivity, 
  fetchActivities, 
  fetchActivitiesServer 
} from '@/utils/supabase'

// Example for client components
const { data, error } = await getUserActivities(userId)

// Example for Pages Router (getServerSideProps)
const activities = await fetchActivitiesServer(50, context)
```

## Example Migration

### For Client Components:

```typescript
import { createBrowserSupabaseClient } from '@/utils/supabase'

export function MyComponent() {
  const fetchData = async () => {
    const supabase = createBrowserSupabaseClient()
    
    const { data, error } = await supabase
      .from('ecotrack')
      .select('*')
      .limit(10)
      
    // Handle data and errors
  }
  
  // Component JSX
}
```

### For Server Components (App Router):

```typescript
import { createServerSupabaseClient } from '@/utils/supabase'

export default async function ServerComponent() {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('ecotrack')
    .select('*')
    .limit(10)
    
  // Handle data and errors
  return <div>{/* Component JSX */}</div>
}
```

### For Pages (Pages Router):

```typescript
import { createServerSupabaseClient } from '@/utils/supabase'
import type { GetServerSidePropsContext } from 'next'

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = await createServerSupabaseClient(context)
  
  const { data, error } = await supabase
    .from('ecotrack')
    .select('*')
    .limit(10)
    
  return {
    props: {
      data: data || []
    }
  }
}

export default function PageComponent({ data }) {
  // Component JSX using data
}
```

## Benefits

- **Improved consistency**: All components use the same client creation approach
- **Better type safety**: Proper TypeScript typing throughout the codebase
- **Optimized performance**: Client-side singleton prevents too many connections
- **Simplified development**: Clear patterns for both client and server components
- **Better maintainability**: Single source of truth for Supabase client code
- **Router compatibility**: Works with both App Router and Pages Router

## Future Work

Once all components have been migrated to the new approach, we can remove the legacy implementations and compatibility functions. 