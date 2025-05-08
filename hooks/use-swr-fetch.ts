'use client';

import { useState } from 'react';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { apiClient, ApiError } from '@/lib/api-client';

/**
 * Custom SWR fetcher for use with API Client
 * Automatically handles error states and response formatting
 */
export const fetcher = async <T>(url: string): Promise<T> => {
  try {
    return await apiClient.get<T>(url);
  } catch (error) {
    throw error;
  }
};

/**
 * Extended SWR hook with optimized defaults for API client
 * 
 * @param url - API endpoint to fetch
 * @param config - SWR configuration options
 * @returns SWR response with data, error, and loading state
 */
export function useSwrFetch<T = any>(
  url: string | null, 
  config?: SWRConfiguration
): SWRResponse<T, ApiError> & { isLoading: boolean } {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<T, ApiError>(
    url,
    fetcher,
    {
      // Optimized defaults using stale-while-revalidate pattern
      revalidateOnFocus: false, // Don't revalidate when window focuses
      revalidateIfStale: true, // Revalidate if data is stale
      revalidateOnReconnect: true, // Revalidate when browser regains connection
      shouldRetryOnError: false, // Don't automatically retry on error
      ...config,
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * SWR hook for posting data
 * 
 * @param url - API endpoint to post to
 * @param config - SWR configuration options
 * @returns Post function and loading state
 */
export function useSwrPost<T = any, D = any>(
  url: string,
  config?: SWRConfiguration
) {
  const { mutate } = useSWR<T>(url, null, config);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const post = async (data: D): Promise<T> => {
    setIsSubmitting(true);
    try {
      const result = await apiClient.post<T>(url, data);
      
      // Update the cache with the new data
      await mutate(result, {
        revalidate: false, // We already have the latest data
      });
      
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { post, isSubmitting };
}

export default useSwrFetch; 