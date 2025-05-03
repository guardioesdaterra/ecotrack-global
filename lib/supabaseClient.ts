import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallbacks for local development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhqvvmgltnwmxeyjckqj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocXZ2bWdsdG53bXhleWpja3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQ0NTI5OTYsImV4cCI6MjAxMDAyODk5Nn0.S23-Hg1gRQlmzlauXlbQ1-kM_R-R4dtMptQ6eFKQIpI';

// Log connection parameters for debugging (without showing full key)
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key available: ${!!supabaseAnonKey}`);

// Create a Supabase client with auto headers and timeout settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }
  },
  // Add reasonable timeouts
  db: {
    schema: 'public',
  },
  // Make request timeouts more forgiving
  realtime: {
    timeout: 30000, // 30 seconds
  }
});

// Helper to check if Supabase connection is healthy
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // Simple health check - try to get a single row
    const { data, error } = await supabase
      .from('ecotrack')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Supabase connection check failed:', error.message);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Failed to check Supabase connection:', err);
    return false;
  }
}

// Add error handling for database operations
export async function handleSupabaseError<T>(promise: Promise<{ data: T | null; error: any }>): Promise<T> {
  try {
    const { data, error } = await promise;
    if (error) {
      console.error('Supabase operation error:', error.message || error);
      throw error;
    }
    if (data === null) {
      throw new Error('No data returned from operation');
    }
    return data as T;
  } catch (error) {
    console.error('Failed to execute Supabase operation:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
