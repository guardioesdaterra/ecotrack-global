import { createBrowserSupabaseClient } from './index'
import type { Database } from '@/types/supabase'

/**
 * @deprecated Use createBrowserSupabaseClient() from utils/supabase/index.ts directly
 * This function is maintained for backward compatibility
 */
export function createClient() {
  return createBrowserSupabaseClient()
} 