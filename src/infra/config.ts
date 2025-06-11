import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

/**
 * Environment configuration schema using zod
 * Validates and parses environment variables with defaults
 */
const envSchema = z.object({
  CALCOM_API_TOKEN: z
    .string()
    .min(1, 'CALCOM_API_TOKEN is required')
    .describe('Cal.com API token for authentication'),

  PORT: z
    .string()
    .default('8080')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val < 65536, 'PORT must be between 1 and 65535')
    .describe('HTTP server port'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info')
    .describe('Pino log level'),

  CALCOM_API_BASE: z
    .string()
    .url()
    .default('https://api.cal.com')
    .describe('Cal.com API base URL'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node.js environment'),
});

/**
 * Parsed and validated environment configuration
 */
export type Config = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
function parseConfig(): Config {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorMessages = result.error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join('\n');

    throw new Error(
      `Environment configuration validation failed:\n${errorMessages}`
    );
  }

  return result.data;
}

/**
 * Global configuration instance
 * Validates environment variables on module load
 */
export const config = parseConfig();

/**
 * Utility function to check if running in production
 */
export const isProduction = () => config.NODE_ENV === 'production';

/**
 * Utility function to check if running in development
 */
export const isDevelopment = () => config.NODE_ENV === 'development';

/**
 * Utility function to check if running in test mode
 */
export const isTest = () => config.NODE_ENV === 'test';
