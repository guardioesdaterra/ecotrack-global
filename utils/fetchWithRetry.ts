/**
 * Utility for fetching data with retry mechanism and exponential backoff
 */

/**
 * Fetches data with a retry mechanism using exponential backoff
 * 
 * @param fetchFn The function to execute that returns a Promise
 * @param options Configuration options for the retry behavior
 * @returns A Promise resolving to the result of the fetchFn
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryStatusCodes?: number[];
    shouldRetry?: (error: any) => boolean;
    onRetry?: (attempt: number, delay: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000, // 1 second
    maxDelay = 30000, // 30 seconds
    backoffFactor = 2,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    shouldRetry = (error) => {
      // Default retry condition - network errors or specific status codes
      if (!error) return false;
      
      // For fetch Response errors
      if (error.status && retryStatusCodes.includes(error.status)) {
        return true;
      }
      
      // For database or other errors with code property
      if (error.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
        return true;
      }
      
      // For network errors
      if (error.message && (
        error.message.includes('network') || 
        error.message.includes('connection') ||
        error.message.includes('timeout')
      )) {
        return true;
      }
      
      return false;
    },
    onRetry = (attempt, delay, error) => {
      console.warn(`Retry attempt ${attempt} after ${delay}ms due to error:`, error);
    }
  } = options;
  
  let attempt = 0;
  let lastError: any = null;
  
  while (attempt <= maxRetries) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      
      // If we've used all retries or shouldn't retry this error, throw
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and some randomization
      const delay = Math.min(
        maxDelay,
        initialDelay * Math.pow(backoffFactor, attempt - 1) * (1 + Math.random() * 0.2)
      );
      
      // Notify about the retry
      onRetry(attempt, delay, error);
      
      // Wait before the next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should not happen due to the throw inside the loop,
  // but TypeScript requires a return statement
  throw lastError;
} 