import { z } from 'zod';

/**
 * Centralized environment validation using Zod
 * 
 * This validates required environment variables at runtime and throws
 * meaningful errors when they're missing or invalid.
 */

const envSchema = z.object({
  // API URLs & Endpoints
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().nonempty('Supabase URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().nonempty('Supabase anon key is required'),
  
  // Third-party API keys
  NEXT_PUBLIC_HERE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  
  // Feature flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.enum(['true', 'false']).transform(val => val === 'true').optional().default('false'),
  NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES: z.enum(['true', 'false']).transform(val => val === 'true').optional().default('false'),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Throws detailed errors if environment variables are missing or invalid
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n  ');
      console.error(`❌ Invalid environment variables:\n  ${missingVars}`);
      
      // In development, show a more detailed error
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`Missing or invalid environment variables. Check console for details.`);
      }
    }
    
    // Fallback with safe defaults for production
    return envSchema.partial().parse(process.env);
  }
}

export const env = validateEnv();

/**
 * Helper to check if we're in a specific environment
 */
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test'; 