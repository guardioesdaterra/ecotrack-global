/**
 * Consolidated Supabase client management
 * Uses the recommended @supabase/ssr approach consistently
 */
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import type { GetServerSidePropsContext } from 'next'

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
 * Fetch activities with client-side caching
 */
export async function fetchActivities(limit: number = 50): Promise<any[]> {
  try {
    const supabase = createBrowserSupabaseClient()
    
    const { data, error } = await supabase
      .from('ecotrack')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch activities: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error fetching activities:', error)
    return []
  }
}

/**
 * Server-side fetch for activities (used in Server Components)
 */
export async function fetchActivitiesServer(
  limit: number = 50,
  context?: GetServerSidePropsContext
): Promise<any[]> {
  try {
    const supabase = await createServerSupabaseClient(context)
    
    const { data, error } = await supabase
      .from('ecotrack')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      
    if (error) {
      console.error('Error fetching activities on server:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Server fetch error:', error)
    return []
  }
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