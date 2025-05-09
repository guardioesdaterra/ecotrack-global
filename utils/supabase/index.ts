/**
 * Consolidated Supabase client management
 * Uses the recommended @supabase/ssr approach consistently
 */
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import type { GetServerSidePropsContext } from 'next'
import { fetchWithRetry } from '@/utils/fetchWithRetry'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side cache for browser client
let browserClientInstance: SupabaseClient<Database> | null = null

/**
 * Creates a Supabase client for use in client components
 */
export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  // Reuse existing instance to avoid duplicate clients and connections
  if (browserClientInstance) {
    return browserClientInstance
  }

  // Create a new client if one doesn't exist
  browserClientInstance = createBrowserClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!
  )

  return browserClientInstance
}

/**
 * Creates a Supabase client for use in Server Components (App Router)
 * or for getServerSideProps (Pages Router)
 * 
 * @param context Optional context for Pages Router
 */
export async function createServerSupabaseClient(
  context?: GetServerSidePropsContext
): Promise<SupabaseClient<Database>> {
  // Pages Router approach (getServerSideProps)
  if (context) {
    return createServerClient<Database>(
      supabaseUrl!,
      supabaseAnonKey!,
      {
        cookies: {
          get(name: string) {
            return context.req.cookies[name]
          },
          set(name: string, value: string, options: CookieOptions) {
            context.res.setHeader(
              'Set-Cookie',
              `${name}=${value}; Path=/; ${serializeCookieOptions(options)}`
            )
          },
          remove(name: string, options: CookieOptions) {
            context.res.setHeader(
              'Set-Cookie',
              `${name}=; Max-Age=0; Path=/; ${serializeCookieOptions(options)}`
            )
          }
        },
      }
    )
  }

  // App Router approach (Server Components)
  // Dynamically import next/headers to avoid errors in Pages Router
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = cookies()

    return createServerClient<Database>(
      supabaseUrl!,
      supabaseAnonKey!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {
              // The `set` method was called from a Server Component
              // This can be ignored if you have middleware refreshing user sessions
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch {
              // The `remove` method was called from a Server Component
              // This can be ignored if you have middleware refreshing user sessions
            }
          }
        },
      }
    )
  } catch (error) {
    console.error('Error creating server client:', error)
    throw new Error('Failed to create server client. This might be because the function is called from a context where next/headers is not available.')
  }
}

// Utility to serialize cookie options
function serializeCookieOptions(options: CookieOptions): string {
  const parts = []
  
  if (options.domain) parts.push(`Domain=${options.domain}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`)
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  
  return parts.join('; ')
}

/**
 * Helper function to get user activities
 */
export async function getUserActivities(userId: string) {
  if (!userId) return { data: null, error: new Error('No user ID provided') }
  
  const supabase = createBrowserSupabaseClient()
  
  return await supabase
    .from('ecotrack')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

/**
 * Helper function to create a new activity
 */
export async function createActivity(activityData: any) {
  const supabase = createBrowserSupabaseClient()
  
  return await supabase
    .from('ecotrack')
    .insert(activityData)
    .select()
}

/**
 * Fetch activities with client-side caching and retry mechanism
 */
export async function fetchActivities(limit: number = 50): Promise<any[]> {
  return fetchWithRetry(
    async () => {
      const supabase = createBrowserSupabaseClient()
      
      const { data, error } = await supabase
        .from('ecotrack')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return data || []
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      backoffFactor: 2,
      shouldRetry: (error) => {
        // Retry on network errors, timeouts, or specific Supabase errors
        if (!error) return false;
        
        // PostgresError or other database errors
        if (error.code && ['08006', '08001', '08004', '57P01'].includes(error.code)) {
          return true; // Connection errors
        }
        
        // Rate limiting or service unavailable
        if (error.status && [429, 503, 504].includes(error.status)) {
          return true;
        }
        
        // Network-related errors
        if (error.message && (
          error.message.includes('network') || 
          error.message.includes('timeout') ||
          error.message.includes('connection')
        )) {
          return true;
        }
        
        return false;
      },
      onRetry: (attempt, delay, error) => {
        console.warn(`Retrying fetchActivities (${attempt}/3) after ${delay}ms due to:`, 
          error.message || error.code || 'Unknown error');
      }
    }
  ).catch(error => {
    console.error('All retry attempts for fetchActivities failed:', error);
    return [];
  });
}

/**
 * Server-side fetch for activities with retry mechanism
 */
export async function fetchActivitiesServer(
  limit: number = 50,
  context?: GetServerSidePropsContext
): Promise<any[]> {
  return fetchWithRetry(
    async () => {
      const supabase = await createServerSupabaseClient(context)
      
      const { data, error } = await supabase
        .from('ecotrack')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        
      if (error) {
        throw error
      }
      
      return data || []
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      backoffFactor: 2,
      onRetry: (attempt, delay, error) => {
        console.warn(`Retrying server-side fetchActivities (${attempt}/3) after ${delay}ms`);
      }
    }
  ).catch(error => {
    console.error('All retry attempts for server-side fetchActivities failed:', error);
    return [];
  });
}

/**
 * Check if Supabase connection is available (client-side only)
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient()
    
    // Try a small query to verify connectivity
    const { error } = await supabase.from('ecotrack').select('id').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection check failed:', error)
    return false
  }
}

// ========================================================================
// COMPATIBILITY FUNCTIONS FOR EASIER MIGRATION FROM OLD APPROACHES
// These match the function signatures from the old implementations
// ========================================================================

/**
 * @deprecated Use createBrowserSupabaseClient() instead
 * Compatibility function for existing components using getSupabaseBrowserClient
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  return createBrowserSupabaseClient()
}

/**
 * @deprecated Use createServerSupabaseClient() instead
 * Compatibility function for existing components using getSupabaseServerClient
 */
export async function getSupabaseServerClient(
  context?: GetServerSidePropsContext
): Promise<SupabaseClient<Database>> {
  return createServerSupabaseClient(context)
}

/**
 * @deprecated Use createBrowserSupabaseClient() or createServerSupabaseClient() instead
 * Compatibility function for existing components using getSupabaseClient
 * Returns the appropriate client based on environment
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  // Use browser client in browser environment
  if (typeof window !== 'undefined') {
    return createBrowserSupabaseClient()
  }
  
  console.warn('Attempted to get Supabase client in a server context without using the async createServerSupabaseClient. Use createServerSupabaseClient() for server components instead.')
  return null
}

/**
 * @deprecated Use createBrowserSupabaseClient() directly
 * Singleton instance for compatibility with old code
 * This will be removed in a future update
 */
export const supabase = typeof window !== 'undefined' ? createBrowserSupabaseClient() : null 