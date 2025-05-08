/**
 * Environment variable validation utility
 * 
 * Provides a standardized way to validate required environment variables
 * and throw helpful errors when they're missing.
 */

/**
 * Get a required environment variable
 * @param key The environment variable key
 * @param defaultValue Optional default value if not set
 * @throws Error if the environment variable is not set and no default is provided
 */
export function getRequiredEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please check your .env.local file or environment configuration.`
    );
  }
  
  return value;
}

/**
 * Get an optional environment variable
 * @param key The environment variable key
 * @param defaultValue Default value if not set
 */
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * Validate multiple required environment variables at once
 * @param keys Array of environment variable keys to validate
 * @throws Error with a list of all missing variables
 */
export function validateEnvVariables(keys: string[]): void {
  const missingKeys: string[] = [];
  
  for (const key of keys) {
    if (!process.env[key]) {
      missingKeys.push(key);
    }
  }
  
  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(', ')}. ` +
      `Please check your .env.local file or environment configuration.`
    );
  }
}

/**
 * Environment configuration object with validation
 */
export const env = {
  // Example of getting environment variables with validation
  NEXT_PUBLIC_SUPABASE_URL: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  
  // Helper methods
  getRequired: getRequiredEnv,
  getOptional: getOptionalEnv,
  validate: validateEnvVariables,
} as const;

export default env; 