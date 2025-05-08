import { createServerSupabaseClient } from './index'
import type { Database } from '@/types/supabase'
import type { GetServerSidePropsContext } from 'next'

/**
 * @deprecated Use createServerSupabaseClient() from utils/supabase/index.ts directly
 * This function is maintained for backward compatibility
 */
export async function createClient(context?: GetServerSidePropsContext) {
  return await createServerSupabaseClient(context)
} 