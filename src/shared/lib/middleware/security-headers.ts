import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to add security headers to all responses
 */
export function addSecurityHeaders(req: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Generate a unique nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Build the Content Security Policy
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' ${
      process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ""
    };
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://*.tile.openstreetmap.org stamen-tiles-a.a.ssl.fastly.net stamen-tiles-b.a.ssl.fastly.net stamen-tiles-c.a.ssl.fastly.net stamen-tiles-d.a.ssl.fastly.net unpkg.com images.unsplash.com uploadthing.com utfs.io *.googleusercontent.com *.basemaps.cartocdn.com;
    connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://api.mapbox.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.ssl.fastly.net;
    font-src 'self';
    frame-src 'none';
    object-src 'none';
  `.replace(/\n/g, '');

  // Set security headers
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');

  return response;
} 