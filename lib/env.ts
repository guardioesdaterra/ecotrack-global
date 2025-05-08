import { z } from 'zod';

/**
 * Environment variable schema validation using Zod
 * Ensures all required environment variables are present and properly typed
 */
const envSchema = z.object({
  // Supabase configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  
  // App configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  
  // API configuration
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  
  // Rate limiting (optional but validated if present)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

/**
 * Parsed and validated environment variables
 * 
 * Usage:
 * import { env } from '@/lib/env';
 * console.log(env.NEXT_PUBLIC_SUPABASE_URL);
 */
export const env = envSchema.parse({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  
  // App
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  
  // API
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  
  // Rate limiting
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Type definition for the validated environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Optional validation function to validate only server-side env vars
 * Use this in API routes or server components that require server-only env vars
 */
export function validateServerEnv() {
  const serverEnvSchema = z.object({
    // Add any server-only environment variables here
    // DATABASE_URL: z.string().url(),
  });
  
  return serverEnvSchema.parse({
    // Add the corresponding process.env variables here
    // DATABASE_URL: process.env.DATABASE_URL,
  });
}

export default env; 