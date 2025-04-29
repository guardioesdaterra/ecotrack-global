import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Create a single supabase client for the entire application
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper function to get user activities
export async function getUserActivities(userId: string) {
  if (!userId) return { data: null, error: new Error('No user ID provided') }
  
  return await supabase
    .from('ecotrack')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

// Helper function to create a new activity
export async function createActivity(activityData: any) {
  return await supabase
    .from('ecotrack')
    .insert(activityData)
    .select()
} 