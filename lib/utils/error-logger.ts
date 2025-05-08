/**
 * Standardized error logging utility
 * 
 * Provides consistent error handling across the application
 * with optional telemetry for production environments.
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Error context information
 */
interface ErrorContext {
  module?: string;
  functionName?: string;
  userId?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

/**
 * Logs an error with consistent formatting
 * 
 * @param error The error to log
 * @param severity The severity level
 * @param context Additional context about the error
 */
export function logError(
  error: Error | string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  context: ErrorContext = {}
): void {
  // Convert string errors to Error objects for consistency
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  // Combine error information
  const errorInfo = {
    message: errorObj.message,
    name: errorObj.name,
    stack: errorObj.stack,
    severity,
    timestamp: new Date().toISOString(),
    ...context,
  };
  
  // Log to console with appropriate method based on severity
  switch (severity) {
    case ErrorSeverity.INFO:
      console.info(`[${severity.toUpperCase()}]`, errorInfo);
      break;
    case ErrorSeverity.WARNING:
      console.warn(`[${severity.toUpperCase()}]`, errorInfo);
      break;
    case ErrorSeverity.CRITICAL:
      console.error(`[${severity.toUpperCase()}]`, errorInfo);
      break;
    case ErrorSeverity.ERROR:
    default:
      console.error(`[${severity.toUpperCase()}]`, errorInfo);
  }
  
  // In production, could send to error monitoring service
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Example of sending to error monitoring service
    // This could be replaced with Sentry, LogRocket, etc.
    try {
      // Send to error monitoring service if configured
      if (typeof window !== 'undefined' && window.__ERROR_MONITORING_ENABLED__) {
        sendToErrorMonitoringService(errorInfo);
      }
    } catch (monitoringError) {
      // Don't let monitoring errors cause additional problems
      console.error('Error while reporting to error monitoring service:', monitoringError);
    }
  }
}

/**
 * Helper for handling async function errors consistently
 * 
 * @param fn The async function to run
 * @param context Additional context for error logging
 * @returns A wrapped function that handles errors
 * 
 * @example
 * const fetchUserData = withErrorHandling(
 *   async (userId) => {
 *     const response = await api.getUser(userId);
 *     return response.data;
 *   },
 *   { module: 'user-service', functionName: 'fetchUserData' }
 * );
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: ErrorContext = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | null> {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(
        error instanceof Error ? error : new Error(String(error)),
        ErrorSeverity.ERROR,
        {
          arguments: args.map(arg => 
            typeof arg === 'object' ? '[Object]' : String(arg)
          ).join(', '),
          ...context,
        }
      );
      return null;
    }
  };
}

/**
 * Placeholder for error monitoring service integration
 * Replace with actual implementation when using a service like Sentry
 */
function sendToErrorMonitoringService(errorInfo: any): void {
  // This would be replaced with actual error reporting
  // e.g., Sentry.captureException(error, { extra: errorInfo });
  console.debug('Would send to error monitoring service:', errorInfo);
}

// Add monitoring enabled flag to Window interface
declare global {
  interface Window {
    __ERROR_MONITORING_ENABLED__?: boolean;
  }
}

export default { logError, withErrorHandling, ErrorSeverity }; 