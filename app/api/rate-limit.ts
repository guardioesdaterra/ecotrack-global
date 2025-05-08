import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { NextResponse, type NextRequest } from 'next/server'
import { headers } from 'next/headers'

// Initialize Redis client from environment variables or throw clear error
let redis: Redis

try {
  redis = Redis.fromEnv()
} catch (e) {
  console.error('Failed to initialize Redis client for rate limiting:', e)
  throw new Error('Rate limiting requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables')
}

// Create a sliding window rate limiter: 10 requests per 10 seconds
const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10s'),
  analytics: true,
})

/**
 * Rate limit middleware for API routes
 * Limits requests to 10 per 10 seconds per IP address
 * 
 * @param request The incoming request
 * @returns Response with rate limit headers or 429 if rate limited
 */
export async function rateLimit(request: NextRequest) {
  const headersList = headers()
  // Get IP from Vercel preferred header or fallback
  const ip = request.ip ?? 
             headersList.get('x-real-ip') ?? 
             headersList.get('x-forwarded-for') ?? 
             '127.0.0.1'

  // Rate limit based on IP
  const { success, limit, reset, remaining } = await limiter.limit(ip)

  // Create the response object - Pass through if under limit
  const response = success 
    ? NextResponse.next() 
    : NextResponse.json(
        { error: 'Rate limit exceeded', resetAt: reset },
        { status: 429 }
      )

  // Set rate limit headers on all responses
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', reset.toString())

  return response
}

export default rateLimit 