/**
 * @deprecated Use utils/supabase/index.ts instead
 * This file is kept for backward compatibility and will be removed in future updates
 */
import { 
  createBrowserSupabaseClient, 
  getUserActivities as getActivities, 
  createActivity as createNewActivity 
} from '@/utils/supabase/index'
import { Database } from '@/types/supabase'

// Create a single supabase client for the entire application
export const supabase = createBrowserSupabaseClient()

// Helper function to get user activities
export async function getUserActivities(userId: string) {
  return await getActivities(userId)
}

// Helper function to create a new activity
export async function createActivity(activityData: any) {
  return await createNewActivity(activityData)
} 