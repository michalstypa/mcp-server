#!/usr/bin/env node

import { startServer } from './server.js';
import { config } from './infra/config.js';
import { createServerLogger, logError } from './infra/logger.js';

/**
 * Main entry point for the MCP server
 * Supports both STDIO and HTTP transport modes
 */
async function main() {
  const serverLogger = createServerLogger();
  const args = process.argv.slice(2);

  // Determine transport mode from command line arguments
  const mode =
    args.includes('--http') || args.includes('http') ? 'http' : 'stdio';

  // Extract port from arguments if provided
  let port = config.PORT;
  const portArg = args.find(arg => arg.startsWith('--port='));
  if (portArg) {
    port = parseInt(portArg.split('=')[1], 10);
  }

  serverLogger.info(`Starting Backtick MCP Server in ${mode} mode...`);

  await startServer(mode, port);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', reason => {
  logError(reason, 'unhandled promise rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logError(error, 'uncaught exception');
  process.exit(1);
});

// Start the server
main().catch(error => {
  logError(error, 'main function');
  process.exit(1);
});
