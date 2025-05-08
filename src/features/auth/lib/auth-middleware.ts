import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * Server-side authentication check middleware
 * Use in route handlers and Server Components to verify authentication
 * 
 * @example
 * // In a route handler
 * export async function GET(request: NextRequest) {
 *   const authResult = await validateAuth(request);
 *   if (!authResult.isAuthenticated) {
 *     return authResult.response;
 *   }
 *   
 *   // Continue with authenticated request
 *   const { user } = authResult;
 *   // ...
 * }
 */
export async function validateAuth(request: NextRequest, options?: {
  redirectTo?: string;
  requiredRoles?: string[];
}) {
  const redirectTo = options?.redirectTo || '/auth/login';
  const requiredRoles = options?.requiredRoles || [];

  // Create a server supabase client
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookies().set(name, value, options);
        },
        remove(name: string, options: any) {
          cookies().set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
  
  // Check if the user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // User is not authenticated, redirect to login with the current URL as returnUrl
    const returnUrl = request.nextUrl.pathname + request.nextUrl.search;
    const loginUrl = new URL(redirectTo, request.nextUrl.origin);
    loginUrl.searchParams.set('returnUrl', returnUrl);
    
    return {
      isAuthenticated: false,
      response: NextResponse.redirect(loginUrl),
      user: null,
      session: null,
    };
  }
  
  // Check roles if required
  if (requiredRoles.length > 0) {
    const userRoles = session.user?.user_metadata?.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return {
        isAuthenticated: true,
        hasRequiredRoles: false,
        response: NextResponse.redirect(new URL('/unauthorized', request.nextUrl.origin)),
        user: session.user,
        session,
      };
    }
  }
  
  // Authentication and role checks passed
  return {
    isAuthenticated: true,
    hasRequiredRoles: true,
    user: session.user,
    session,
    response: null,
  };
}

/**
 * Helper to check if user has a specific role
 */
export function hasRole(user: any, role: string): boolean {
  if (!user || !user.user_metadata || !user.user_metadata.roles) {
    return false;
  }
  
  return user.user_metadata.roles.includes(role);
}

/**
 * Helper to check if user has any of the given roles
 */
export function hasAnyRole(user: any, roles: string[]): boolean {
  if (!user || !user.user_metadata || !user.user_metadata.roles) {
    return false;
  }
  
  return roles.some(role => user.user_metadata.roles.includes(role));
} 