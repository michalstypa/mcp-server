#!/usr/bin/env node

// Load environment variables from .env file first (before any other imports)
// This ensures that all features can access environment variables
import { config as loadDotenv } from 'dotenv';
loadDotenv();

import { startServer } from './server.js';
import { config } from './infra/config.js';
import { createServerLogger, logError } from './infra/logger.js';

/**
 * Supports both STDIO and HTTP transport modes
 */
async function main() {
  const serverLogger = createServerLogger();
  const args = process.argv.slice(2);

  const mode = args.includes('--http') || args.includes('http') ? 'http' : 'stdio';

  let port = config.PORT;
  const portArg = args.find(arg => arg.startsWith('--port='));
  if (portArg) {
    port = parseInt(portArg.split('=')[1], 10);
  }

  serverLogger.info(`Starting Backtick MCP Server in ${mode} mode...`);

  await startServer(mode, port);
}

process.on('unhandledRejection', reason => {
  logError(reason, 'unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', error => {
  logError(error, 'uncaught exception');
  process.exit(1);
});

main().catch(error => {
  logError(error, 'main function');
  process.exit(1);
});
