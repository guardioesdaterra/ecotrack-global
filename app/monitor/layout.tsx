"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion" 
import { PerformanceProvider } from "@/hooks/use-performance-mode"

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [error, setError] = useState<Error | null>(null)

  // Reset error state if children change
  useEffect(() => {
    setError(null)
  }, [children])

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div 
          className="absolute top-0 right-0 w-[70%] h-[50%] bg-gradient-to-b from-cyan-950/20 to-transparent blur-[120px] transform -translate-y-1/2 translate-x-1/3"
        />
        <div 
          className="absolute bottom-0 left-0 w-[70%] h-[50%] bg-gradient-to-t from-purple-950/20 to-transparent blur-[120px] transform translate-y-1/2 -translate-x-1/3"
        />
        <motion.div 
          className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-cyan-600/5 blur-[100px]"
          animate={{
            y: [0, -20, 0],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/5 blur-[100px]"
          animate={{
            y: [0, 20, 0],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      {/* Main content */}
      <main>
        {/* Add nested PerformanceProvider for extra protection */}
        <PerformanceProvider>
          {error ? (
            <div className="p-8 text-center">
              <h2 className="text-red-500 text-2xl mb-4">Something went wrong</h2>
              <p className="text-gray-300 mb-4">{error.message}</p>
              <button 
                onClick={() => setError(null)}
                className="px-4 py-2 bg-cyan-600 rounded-md hover:bg-cyan-500 transition"
              >
                Try again
              </button>
            </div>
          ) : (
            <ErrorBoundary setError={setError}>
              {children}
            </ErrorBoundary>
          )}
        </PerformanceProvider>
      </main>
    </div>
  )
}

// Simple error boundary component
function ErrorBoundary({
  children, 
  setError
}: {
  children: React.ReactNode
  setError: (error: Error) => void
}) {
  useEffect(() => {
    // Create global error handler
    const errorHandler = (event: ErrorEvent) => {
      if (event.error && event.error.message && 
          event.error.message.includes('PerformanceProvider')) {
        console.error('Performance provider error caught:', event.error)
        setError(event.error)
        event.preventDefault()
      }
    }
    
    window.addEventListener('error', errorHandler)
    return () => window.removeEventListener('error', errorHandler)
  }, [setError])
  
  return <>{children}</>
} 