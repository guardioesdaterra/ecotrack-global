import { NextRequest, NextResponse } from 'next/server'
import { handleAuth } from '@/utils/supabase/auth'
import { addSecurityHeaders } from './src/shared/lib/middleware/security-headers'
import { rateLimiter } from './src/shared/lib/middleware/rate-limiter'

/**
 * Middleware handler for Next.js
 * Centralized authentication and route protection
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Apply rate limiting only to API routes
  if (pathname.startsWith('/api/')) {
    // More strict rate limits for authentication endpoints
    if (pathname.startsWith('/api/auth/')) {
      const limiterResponse = rateLimiter(request, { 
        limit: 20, 
        windowSizeInSeconds: 60 
      })
      
      // Return early if rate limited
      if (limiterResponse.status === 429) {
        return limiterResponse
      }
    } else {
      // Standard rate limits for other API endpoints
      const limiterResponse = rateLimiter(request)
      
      // Return early if rate limited
      if (limiterResponse.status === 429) {
        return limiterResponse
      }
    }
  }

  // Apply security headers to all responses
  const secureResponse = addSecurityHeaders(request)
  
  // Apply auth middleware only after other middleware
  return handleAuth(request)
}

// Match all routes except static files, API routes, and _next
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - font files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Match API routes for rate limiting
    '/api/:path*',
  ],
} 