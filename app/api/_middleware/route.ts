import { NextRequest, NextResponse } from 'next/server'
import rateLimit from '../rate-limit'

export const config = {
  matcher: '/api/:path*',
  runtime: 'edge',
}

export async function middleware(request: NextRequest) {
  // Apply rate limiting
  return await rateLimit(request)
}

export default middleware 