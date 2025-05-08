'use client';

import { useEffect } from 'react';
import { RefreshCcw, AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Page-level error boundary component for use in Next.js with React Server Components.
 * Place this in app/error.tsx and similar page error files.
 * 
 * @example
 * // app/error.tsx
 * export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
 *   return <ErrorBoundaryPage error={error} reset={reset} />;
 * }
 */
export function ErrorBoundaryPage({ error, reset }: ErrorBoundaryPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Page-level error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="w-full max-w-md p-8 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">
            Something went wrong
          </h1>
          
          <div className="mb-6 text-red-600 dark:text-red-400">
            <p className="mb-2">
              {error.message || 'An unexpected error occurred'}
            </p>
            {error.digest && (
              <p className="text-xs opacity-70 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          
          <div className="flex gap-4 w-full justify-center">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-200 rounded-md transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Try again
            </button>
            
            <Link 
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md transition-colors"
            >
              <Home className="w-4 h-4" />
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundaryPage; 