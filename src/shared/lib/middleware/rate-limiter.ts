import { NextRequest, NextResponse } from 'next/server';
import { env } from '../../config/env';

type RateLimitConfig = {
  // Maximum number of requests allowed in the window
  limit: number;
  // Window size in seconds
  windowSizeInSeconds: number;
  // Optional: Cache size (to prevent memory leaks)
  maxCacheSize?: number;
};

// In-memory store for rate limiting
const ipRequestStore = new Map<string, { count: number; timestamp: number }>();

/**
 * Simple in-memory rate limiting middleware
 * For production, consider using a distributed cache like Redis
 * Can be replaced with Upstash implementation for larger scale apps
 */
export function rateLimiter(
  req: NextRequest,
  config: RateLimitConfig = { limit: 60, windowSizeInSeconds: 60, maxCacheSize: 10000 }
) {
  // Skip in development mode unless explicitly enabled
  if (env.NODE_ENV === 'development' && !process.env.ENABLE_DEV_RATE_LIMITING) {
    return NextResponse.next();
  }

  // Get IP address from request
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowSizeMs = config.windowSizeInSeconds * 1000;

  // Prevent memory leaks by cleaning up old entries
  if (config.maxCacheSize && ipRequestStore.size >= config.maxCacheSize) {
    const oldestTime = now - windowSizeMs;
    for (const [key, data] of ipRequestStore.entries()) {
      if (data.timestamp < oldestTime) {
        ipRequestStore.delete(key);
      }
    }
  }

  // Get current request count for IP
  const currentRequest = ipRequestStore.get(ip);
  
  if (!currentRequest) {
    // First request from this IP
    ipRequestStore.set(ip, { count: 1, timestamp: now });
    return NextResponse.next();
  }

  // Check if the window has expired
  if (now - currentRequest.timestamp > windowSizeMs) {
    // Reset window
    ipRequestStore.set(ip, { count: 1, timestamp: now });
    return NextResponse.next();
  }

  // Check if the rate limit is exceeded
  if (currentRequest.count >= config.limit) {
    // Rate limit exceeded
    const response = new NextResponse(
      JSON.stringify({
        success: false,
        message: 'Too Many Requests',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          // Add headers required by HTTP spec for rate limiters
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'Retry-After': Math.ceil((windowSizeMs - (now - currentRequest.timestamp)) / 1000).toString(),
        },
      }
    );
    
    return response;
  }

  // Increment the request count
  ipRequestStore.set(ip, {
    count: currentRequest.count + 1,
    timestamp: currentRequest.timestamp,
  });

  // Add rate limit headers to the response
  const remainingRequests = config.limit - (currentRequest.count + 1);
  const response = NextResponse.next();
  
  response.headers.set('X-RateLimit-Limit', config.limit.toString());
  response.headers.set('X-RateLimit-Remaining', remainingRequests.toString());
  
  return response;
} 