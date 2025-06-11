import { z } from 'zod';

/**
 * Generic server configuration schema
 * Only contains server-level configuration, not feature-specific config
 */
const serverConfigSchema = z.object({
  PORT: z
    .string()
    .default('8080')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val < 65536, 'PORT must be between 1 and 65535')
    .describe('HTTP server port'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info')
    .describe('Log level'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node.js environment'),
});

/**
 * Parsed and validated server configuration
 */
export type ServerConfig = z.infer<typeof serverConfigSchema>;

/**
 * Load and validate server configuration
 * This only validates generic server config, not feature-specific config
 */
function loadServerConfig(): ServerConfig {
  try {
    return serverConfigSchema.parse({
      PORT: process.env.PORT,
      LOG_LEVEL: process.env.LOG_LEVEL,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Server configuration error: ${issues}`);
    }
    throw error;
  }
}

/**
 * Global server configuration instance
 * Features should load their own configuration separately
 */
export const config = loadServerConfig();

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
