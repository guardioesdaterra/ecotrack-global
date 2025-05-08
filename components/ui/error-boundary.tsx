"use client";

import { useState, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component
 * 
 * Catches JavaScript errors anywhere in child component tree and displays
 * a fallback UI instead of crashing the entire application
 */
export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [state, setState] = useState<ErrorBoundaryState>({
    hasError: false,
    error: null,
  });

  useEffect(() => {
    // Add event listener for unhandled errors
    const handleError = (event: ErrorEvent) => {
      event.preventDefault();
      setState({
        hasError: true,
        error: event.error || new Error(event.message),
      });
    };

    // Add event listener for unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      setState({
        hasError: true,
        error: new Error(
          typeof event.reason === 'string' 
            ? event.reason 
            : 'Promise rejection caught by error boundary'
        ),
      });
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Clean up event listeners
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Reset error state and retry rendering children
  const resetError = () => {
    setState({ hasError: false, error: null });
  };

  // If no error, render children normally
  if (!state.hasError) {
    return <>{children}</>;
  }

  // Error fallback UI
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black p-6 text-white">
      <div className="w-full max-w-md space-y-6 bg-gray-800/70 backdrop-blur-md rounded-lg p-6 border border-cyan-500/40 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-red-500/20 text-red-400">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-semibold text-cyan-400">Something went wrong</h2>
        </div>
        
        <div className="bg-black/50 rounded p-4 text-sm overflow-auto max-h-48 text-gray-300 font-mono">
          {state.error?.message || 'An unexpected error occurred'}
          {state.error?.stack && (
            <details className="mt-2">
              <summary className="cursor-pointer text-cyan-400 text-xs">View stack trace</summary>
              <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap">
                {state.error.stack}
              </pre>
            </details>
          )}
        </div>
        
        <div className="flex justify-between gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 border-cyan-700 text-cyan-400 hover:bg-cyan-950/50"
          >
            <RefreshCw size={16} />
            Reload Page
          </Button>
          
          <Button
            onClick={resetError}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-800 text-white hover:from-cyan-500 hover:to-cyan-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary; 