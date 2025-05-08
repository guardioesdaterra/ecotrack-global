import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

/**
 * Route protection configuration
 */
type RouteConfig = {
  // Routes that require authentication
  protectedRoutes: string[];
  // Routes that should redirect to dashboard if already authenticated
  publicOnlyRoutes: string[];
  // Default redirect after successful login
  defaultAuthenticatedRedirect: string;
  // Default redirect for unauthenticated users accessing protected routes
  defaultUnauthenticatedRedirect: string;
};

// Default configuration
const routeConfig: RouteConfig = {
  protectedRoutes: [
    '/profile',
    '/monitor',
    '/map/edit'
  ],
  publicOnlyRoutes: [
    '/login',
    '/signup',
    '/auth/callback',
  ],
  defaultAuthenticatedRedirect: '/map',
  defaultUnauthenticatedRedirect: '/',
};

/**
 * Check if the given path matches any of the patterns
 */
function matchesPath(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Exact match
    if (pattern === path) return true;
    
    // Pattern with wildcard (e.g., '/profile/*')
    if (pattern.endsWith('/*')) {
      const basePath = pattern.slice(0, -2);
      return path.startsWith(basePath);
    }
    
    return false;
  });
}

/**
 * Handles authentication checks and route protection
 * This centralizes auth logic in the middleware layer
 */
export async function handleAuth(
  request: NextRequest, 
  config: Partial<RouteConfig> = {}
) {
  // Merge with default config
  const mergedConfig: RouteConfig = {
    ...routeConfig,
    ...config,
  };
  
  // Get the path from the request
  const path = request.nextUrl.pathname;
  
  // Create response with the updated request
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  // Initialize Supabase client
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
  
  // Get user data and refresh the session if needed
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check if user is authenticated
  const isAuthenticated = !!user;
  
  // Logic for route protection
  const isProtectedRoute = matchesPath(path, mergedConfig.protectedRoutes);
  const isPublicOnlyRoute = matchesPath(path, mergedConfig.publicOnlyRoutes);
  
  // Redirect logic
  if (isProtectedRoute && !isAuthenticated) {
    // Redirect unauthenticated users away from protected routes
    const redirectUrl = new URL(
      mergedConfig.defaultUnauthenticatedRedirect, 
      request.nextUrl.origin
    );
    
    // Preserve the original URL to redirect back after login
    redirectUrl.searchParams.set('redirectTo', path);
    
    return NextResponse.redirect(redirectUrl);
  }
  
  if (isPublicOnlyRoute && isAuthenticated) {
    // Redirect authenticated users away from login/signup pages
    const redirectUrl = new URL(
      mergedConfig.defaultAuthenticatedRedirect, 
      request.nextUrl.origin
    );
    
    return NextResponse.redirect(redirectUrl);
  }
  
  return response;
}

/**
 * Legacy session update function
 * Kept for backward compatibility
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
} 