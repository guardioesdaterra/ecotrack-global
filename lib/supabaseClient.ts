import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Detect build-time and SSG rendering to avoid client creation
const isSSR = typeof window === 'undefined';

// Using a public demo project on Supabase that's guaranteed to be active
// For production, you should use your own project with proper authentication
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Use any type for now since we don't have access to the actual database schema
type AnySupabaseClient = ReturnType<typeof createClient<any>>;

// Singleton client instance
let supabaseClient: AnySupabaseClient | null = null;

// Local cache for activities data
let activitiesCache: any[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Sample data to use if necessary
const sampleActivities = [
  {
    id: 1001,
    title: 'Amazon Reforestation Project',
    type: 'reforestation',
    description: 'Reforestation efforts in the Amazon rainforest to combat deforestation.',
    latitude: -3.4653,
    longitude: -62.2159,
    country: 'Brazil',
    city: 'Manaus',
    responsible: 'EcoTrack Global',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    direct_benefited: 5000,
    indirect_benefited: 25000
  },
  {
    id: 1002,
    title: 'Pacific Coast Cleanup Initiative',
    type: 'clean-up',
    description: 'Community-led beach cleanup along the California coastline.',
    latitude: 34.0522,
    longitude: -118.2437,
    country: 'United States',
    city: 'Los Angeles',
    responsible: 'EcoTrack Global',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    direct_benefited: 1200,
    indirect_benefited: 8000
  },
  {
    id: 1003,
    title: 'Kenyan Wildlife Conservation',
    type: 'conservation',
    description: 'Protection of endangered species in Kenya through community engagement.',
    latitude: -1.2921,
    longitude: 36.8219,
    country: 'Kenya',
    city: 'Nairobi',
    responsible: 'EcoTrack Global',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    direct_benefited: 3500,
    indirect_benefited: 15000
  },
  {
    id: 1004,
    title: 'Solar Power Installation',
    type: 'renewable',
    description: 'Installation of solar panels in rural communities.',
    latitude: 35.6762,
    longitude: 139.6503,
    country: 'Japan',
    city: 'Tokyo',
    responsible: 'EcoTrack Global',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    direct_benefited: 2000,
    indirect_benefited: 10000
  },
  {
    id: 1005,
    title: 'Environmental Education Program',
    type: 'education',
    description: 'Educational workshops on sustainability for schools.',
    latitude: 51.5074,
    longitude: -0.1278,
    country: 'United Kingdom',
    city: 'London',
    responsible: 'EcoTrack Global',
    created_at: new Date(Date.now() - 18000000).toISOString(),
    direct_benefited: 8000,
    indirect_benefited: 40000
  }
];

// Store sample data in the cache on initialization
activitiesCache = sampleActivities;
lastFetchTime = Date.now();

// Function to initialize Supabase client safely with additional error handling
const initSupabase = () => {
  // Only create client on the client-side
  if (isSSR) {
    return null;
  }
  
  try {
    // Attempt to create the Supabase client
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase URL or Anon Key is missing');
      return null;
    }
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        }
      },
      db: {
        schema: 'public',
      },
      realtime: {
        timeout: 30000,
      }
    });
  } catch (e) {
    console.error('Error creating Supabase client:', e);
    return null;
  }
};

// Get the Supabase client - lazy initialization with proper error handling
export const getSupabaseClient = (): AnySupabaseClient | null => {
  if (!supabaseClient && !isSSR) {
    try {
      supabaseClient = initSupabase();
      
      // Cache client in sessionStorage to avoid re-creating on navigation
      if (supabaseClient && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('supabaseClientInitialized', 'true');
      }
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  }
  return supabaseClient;
};

// Export the client directly
export const supabase = getSupabaseClient();

// Helper to check if Supabase connection is healthy
export async function checkSupabaseConnection(): Promise<boolean> {
  if (isSSR) return false;
  
  try {
    // First try direct fetch to test network connectivity
    try {
      if (!supabaseUrl || !supabaseAnonKey) return false;
      const response = await fetch(`${supabaseUrl}/rest/v1/health`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        mode: 'cors',
      });
      
      if (response.ok) {
        return true;
      }
    } catch (fetchError) {
      console.warn('Direct fetch to Supabase failed:', fetchError);
      // Continue to try the Supabase client as a fallback
    }
    
    // Fallback to Supabase client
    const client = getSupabaseClient();
    if (!client) {
      return false;
    }
    
    const { error } = await client
      .from('ecotrack')
      .select('id')
      .limit(1);
    
    return !error;
  } catch (err) {
    console.error('Failed to check Supabase connection:', err);
    return false;
  }
}

// Function to fetch activities with proper error handling and network connectivity checks
export async function fetchActivities(limit = 50, forceFresh = false): Promise<any[]> {
  // Return cached data if available and not expired
  const now = Date.now();
  if (!forceFresh && activitiesCache.length > 0 && (now - lastFetchTime) < CACHE_TTL) {
    console.log('Using cached activities data');
    return activitiesCache;
  }
  
  try {
    console.log('Attempting to fetch activities from Supabase');
    
    // Try multiple different methods to fetch data
    
    // Method 1: Fetch API (more reliable than Supabase client for connectivity issues)
    try {
      if (!supabaseUrl || !supabaseAnonKey) return activitiesCache;
      const response = await fetch(`${supabaseUrl}/rest/v1/ecotrack?select=*&limit=${limit}&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetch API succeeded:', data.length, 'records');
        
        if (data && data.length > 0) {
          // Update cache
          activitiesCache = data;
          lastFetchTime = now;
          
          // Store in localStorage
          try {
            localStorage.setItem('ecotrackActivities', JSON.stringify(data));
            localStorage.setItem('ecotrackActivitiesTimestamp', now.toString());
          } catch (storageErr) {
            console.warn('Failed to store in localStorage:', storageErr);
          }
          
          return data;
        }
      } else {
        console.warn('Fetch API request failed with status:', response.status);
      }
    } catch (fetchError) {
      console.warn('Fetch API approach failed:', fetchError);
    }
    
    // Method 2: Supabase client (fallback)
    try {
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('ecotrack')
          .select('*')
          .limit(limit)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          console.log('Supabase client succeeded:', data.length, 'records');
          
          // Update cache
          activitiesCache = data;
          lastFetchTime = now;
          
          // Store in localStorage
          try {
            localStorage.setItem('ecotrackActivities', JSON.stringify(data));
            localStorage.setItem('ecotrackActivitiesTimestamp', now.toString());
          } catch (storageErr) {
            console.warn('Failed to store in localStorage:', storageErr);
          }
          
          return data;
        } else if (error) {
          console.error('Supabase query error:', error);
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase client approach failed:', supabaseError);
    }
    
    // Method 3: Try to load from localStorage if present
    try {
      const cachedData = localStorage.getItem('ecotrackActivities');
      const timestamp = localStorage.getItem('ecotrackActivitiesTimestamp');
      
      if (cachedData && timestamp) {
        console.log('Using localStorage data as fallback');
        const parsedData = JSON.parse(cachedData);
        
        if (parsedData && parsedData.length > 0) {
          return parsedData;
        }
      }
    } catch (localStorageError) {
      console.warn('LocalStorage approach failed:', localStorageError);
    }
    
    // If all attempts failed, return sample data
    console.log('All database connection attempts failed, using pre-loaded data');
    return sampleActivities;
  } catch (err) {
    console.error('Failed to fetch activities through any method:', err);
    // Return pre-loaded data that's always available
    return sampleActivities;
  }
}
