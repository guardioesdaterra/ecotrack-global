'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This ensures we're not importing or using Supabase at all in this file
export default function NotFoundPage() {
  const router = useRouter()
  
  // If JavaScript is enabled, we can redirect to the regular not-found page
  useEffect(() => {
    // Use a short timeout to prevent flash of content
    const timer = setTimeout(() => {
      router.push('/not-found')
    }, 100)
    
    return () => clearTimeout(timer)
  }, [router])
  
  // This is a minimal static version that doesn't depend on any data fetching
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-black to-gray-900">
      <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
            404 - Page Not Found
          </h1>
          <p className="text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            The page you were looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="mt-8">
          <Link 
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-cyan-600 to-purple-700 px-8 text-sm font-medium text-white shadow transition-colors hover:from-cyan-500 hover:to-purple-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  )
} 