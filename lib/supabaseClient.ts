import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

const isSSR = typeof window === 'undefined';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client-side cache for activities
let activitiesCache: any[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Create a standard client for backward compatibility with existing components
// This should work in browsers, but will be null during SSR
export const supabase = !isSSR 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Get a Supabase client for server components
export async function getSupabaseServerClient() {
  if (isSSR) {
    // Dynamically import next/headers to avoid issues with Pages Router
    const { cookies } = await import('next/headers');
    const { createServerClient } = await import('@supabase/ssr');
    
    try {
      const cookieStore = cookies();
      return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              try {
                cookieStore.set({
                  name,
                  value,
                  ...options
                });
              } catch (error) {
                // The .set method will throw in middleware or other read-only contexts
                // This can be safely ignored if using middleware for auth
                console.warn('Could not set cookies in this context');
              }
            },
            remove(name: string, options: any) {
              try {
                cookieStore.delete({
                  name,
                  ...options
                });
              } catch (error) {
                console.warn('Could not remove cookie in this context');
              }
            }
          },
        }
      );
    } catch (error) {
      console.error('Error creating server client:', error);
      return null;
    }
  }
  
  console.warn('Attempted to get server client in a browser context');
  return null;
}

// Get a Supabase client for client components
export function getSupabaseBrowserClient() {
  try {
    return createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey
    );
  } catch (error) {
    console.error('Error creating browser client:', error);
    return null;
  }
}

// Unified function to get the appropriate client based on environment
export function getSupabaseClient() {
  // Use browser client in browser environment
  if (!isSSR) {
    return getSupabaseBrowserClient();
  }
  
  // This branch shouldn't be hit in practice due to how Next.js
  // separates server/client code, but helps with TypeScript
  console.warn('Attempted to get Supabase client in a server context without using the async getSupabaseServerClient. Use getSupabaseServerClient() for server components instead.');
  return null;
}

// Check if Supabase connection is available (client-side only)
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    if (isSSR) {
      return false; // Not applicable in SSR
    }
    
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return false;
    }

    // Try a small query to verify connectivity
    const { error } = await supabase.from('ecotrack').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
}

// Fetch activities with client-side caching
export async function fetchActivities(limit: number = 50): Promise<any[]> {
  try {
    // Skip during SSR
    if (isSSR) {
      return [];
    }
    
    // Return cached data if available and not expired
    const now = Date.now();
    if (activitiesCache.length > 0 && now - lastFetchTime < CACHE_TTL) {
      return activitiesCache;
    }

    // Get Supabase client
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error('Supabase client is not available');
    }

    // Execute the query
    const { data, error } = await supabase
      .from('ecotrack')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch activities: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.warn('No activities found in the database');
      return [];
    }

    // Update cache
    activitiesCache = data;
    lastFetchTime = now;

    // Save to localStorage for potential offline usage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('ecotrack_activities_cache', JSON.stringify(data));
        localStorage.setItem('ecotrack_cache_timestamp', now.toString());
      } catch (e) {
        console.warn('Failed to cache activities in localStorage:', e);
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching activities:', error);
    
    // Try to load from localStorage as a last resort
    if (!isSSR && typeof localStorage !== 'undefined') {
      try {
        const cachedData = localStorage.getItem('ecotrack_activities_cache');
        if (cachedData) {
          console.warn('Using cached data from localStorage due to fetch error');
          return JSON.parse(cachedData);
        }
      } catch (e) {
        console.error('Failed to retrieve cached data:', e);
      }
    }
    
    // Rethrow the error for the caller to handle
    throw error;
  }
}

// Server-side fetch for activities (used in Server Components)
export async function fetchActivitiesServer(limit: number = 50): Promise<any[]> {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('ecotrack')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching activities on server:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Server fetch error:', error);
    return [];
  }
}

export default getSupabaseClient;
