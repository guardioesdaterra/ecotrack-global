# Supabase Client Management

This directory contains the consolidated Supabase client implementation for EcoTrack Global, using the recommended `@supabase/ssr` approach consistently across the application.

## Overview

The implementation follows Supabase's SSR (Server-Side Rendering) best practices for Next.js applications, providing:

- A consistent client creation strategy
- Proper cookie handling for authentication
- Separation of browser and server clients
- Compatibility functions for easier migration
- Support for both App Router (`app/` directory) and Pages Router (`pages/` directory)

## Usage

### Browser (Client Components)

```typescript
import { createBrowserSupabaseClient } from "@/utils/supabase";

// In a client component or hook
const handleAction = async () => {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.from('ecotrack').select('*');
  // ... handle data and errors
};
```

### Server Components (App Router)

```typescript
import { createServerSupabaseClient } from "@/utils/supabase";

// In a server component (async)
const MyServerComponent = async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('ecotrack').select('*');
  // ... handle data and errors
  return <div>{/* render data */}</div>;
};
```

### getServerSideProps (Pages Router)

```typescript
import { createServerSupabaseClient } from "@/utils/supabase";
import type { GetServerSidePropsContext } from "next";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = await createServerSupabaseClient(context);
  const { data } = await supabase.from('ecotrack').select('*');
  
  return {
    props: {
      data: data || []
    }
  };
}
```

### Helper Functions

The implementation also provides common helper functions:

```typescript
import { 
  getUserActivities,
  createActivity,
  fetchActivities,
  fetchActivitiesServer
} from "@/utils/supabase";

// Client-side
const activities = await fetchActivities(50);

// Server-side (App Router)
const activities = await fetchActivitiesServer(50);

// Server-side (Pages Router)
const activities = await fetchActivitiesServer(50, context);
```

## Migration

Legacy implementations (`lib/supabase.ts` and `lib/supabaseClient.ts`) have been preserved temporarily for backward compatibility but are marked as deprecated. Components should be updated to use the new consolidated approach.

Example migration:

```diff
- import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
+ import { createBrowserSupabaseClient } from "@/utils/supabase";

const fetchData = async () => {
-  const supabase = getSupabaseBrowserClient();
-  if (!supabase) return;
+  const supabase = createBrowserSupabaseClient();
   
   // Continue with Supabase operations
};
```

## File Structure

- `index.ts` - Main implementation with all exported functions and types
- `client.ts` - Compatibility wrapper for browser client creation
- `server.ts` - Compatibility wrapper for server client creation
- `middleware.ts` - Session refresh implementation for Next.js middleware

## Middleware

The middleware implementation in `middleware.ts` is used to update authentication sessions across requests. It's configured in the root `middleware.ts` file.

## Best Practices

1. Always use the appropriate client for your context (browser vs. server)
2. Use helper functions when available instead of direct queries
3. Avoid using the deprecated compatibility functions in new code
4. Follow the proper error handling patterns shown in the helper functions
5. For Pages Router pages, always pass the context to server-side functions 