import pino from 'pino';
import { config, isDevelopment } from './config.js';

/**
 * Base logger configuration for the MCP server
 * - Logs to stderr to keep stdout clean for MCP protocol
 * - Pretty printing in development, JSON in production
 * - Uses LOG_LEVEL from environment configuration
 */
export const logger = pino({
  name: 'backtick-mcp-server',
  level: config.LOG_LEVEL,
  // Pretty print in development, JSON in production
  transport: isDevelopment()
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '{msg}',
          destination: 2, // stderr
        },
      }
    : undefined,
  // Add timestamp in production
  timestamp: !isDevelopment() ? pino.stdTimeFunctions.isoTime : false,
});

/**
 * Create a child logger for a specific feature
 * Adds feature context to all log messages
 */
export function createFeatureLogger(featureName: string) {
  return logger.child({ feature: featureName });
}

/**
 * Create a child logger for server operations
 * Adds server context to log messages
 */
export function createServerLogger() {
  return logger.child({ component: 'server' });
}

/**
 * Create a child logger for HTTP requests
 * Adds request context to log messages
 */
export function createRequestLogger(requestId?: string) {
  return logger.child({
    component: 'http',
    ...(requestId && { requestId }),
  });
}

/**
 * Log levels for easy reference
 */
export const LogLevel = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;

/**
 * Utility to log server startup information
 */
export function logServerStart(mode: 'stdio' | 'http', port?: number) {
  const serverLogger = createServerLogger();

  if (mode === 'http') {
    serverLogger.info(
      `🚀 Backtick MCP Server started in HTTP mode on port ${port}`
    );
  } else {
    serverLogger.info('🚀 Backtick MCP Server started with STDIO transport');
  }
}

/**
 * Utility to log feature loading results
 */
export function logFeatureResults(
  successfulFeatures: Array<{ info?: { name?: string } }>,
  failedFeatures: Array<{ error?: string }>
) {
  const serverLogger = createServerLogger();

  if (successfulFeatures.length === 0) {
    serverLogger.warn(
      '⚠️ No features loaded successfully. Server will have no capabilities.'
    );
  } else {
    const featureNames = successfulFeatures
      .map(result => result.info?.name)
      .filter(Boolean)
      .join(', ');
    serverLogger.info(
      `🎯 ${successfulFeatures.length} feature(s) loaded: ${featureNames}`
    );
  }

  if (failedFeatures.length > 0) {
    serverLogger.warn(`⚠️ ${failedFeatures.length} feature(s) failed to load`);
    failedFeatures.forEach(failed => {
      if (failed.error) {
        serverLogger.error(`Feature load error: ${failed.error}`);
      }
    });
  }
}

/**
 * Utility to log errors with proper context
 */
export function logError(
  error: unknown,
  context?: string,
  targetLogger: pino.Logger = logger
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  targetLogger.error(
    {
      error: {
        message: errorMessage,
        stack: errorStack,
      },
      ...(context && { context }),
    },
    `Error${context ? ` in ${context}` : ''}: ${errorMessage}`
  );
}
