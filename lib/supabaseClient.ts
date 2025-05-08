/**
 * @deprecated Use utils/supabase/index.ts instead
 * This file is kept for backward compatibility and will be removed in future updates
 */
import { 
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  getSupabaseBrowserClient,
  getSupabaseServerClient,
  getSupabaseClient,
  supabase,
  fetchActivities as fetchActivitiesImpl,
  fetchActivitiesServer as fetchActivitiesServerImpl,
  checkSupabaseConnection as checkConnection
} from '@/utils/supabase/index';
import { Database } from '@/types/supabase';

// Re-export the supabase client for backward compatibility
export { supabase };

// Re-export client functions to maintain backward compatibility
export {
  getSupabaseBrowserClient,
  getSupabaseServerClient,
  getSupabaseClient
};

/**
 * @deprecated Use checkSupabaseConnection from utils/supabase/index.ts instead
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  return await checkConnection();
}

/**
 * @deprecated Use fetchActivities from utils/supabase/index.ts instead
 */
export async function fetchActivities(limit: number = 50): Promise<any[]> {
  return await fetchActivitiesImpl(limit);
}

/**
 * @deprecated Use fetchActivitiesServer from utils/supabase/index.ts instead
 */
export async function fetchActivitiesServer(limit: number = 50): Promise<any[]> {
  return await fetchActivitiesServerImpl(limit);
}

// Default export for backward compatibility
export default getSupabaseClient;
