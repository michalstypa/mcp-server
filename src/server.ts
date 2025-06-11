import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './infra/config.js';
import { featureRegistry } from './infra/features.js';
import { initializeFeatures } from './features/index.js';
import {
  createServerLogger,
  createRequestLogger,
  logFeatureResults,
  logError,
  logServerStart,
} from './infra/logger.js';

/**
 * Server transport mode
 */
export type ServerMode = 'stdio' | 'http';

/**
 * Create and configure the MCP server with available features
 */
async function createMcpServer(): Promise<McpServer> {
  const server = new McpServer({
    name: 'backtick-mcp-server',
    version: '1.0.0',
    capabilities: {
      tools: {},
      resources: {
        subscribe: true,
        listChanged: true,
      },
      prompts: {},
    },
  });

  // Initialize and register all features
  initializeFeatures();
  await featureRegistry.registerAllFeatures(server);

  // Log summary using structured logging
  const successfulFeatures =
    featureRegistry.getSuccessfullyRegisteredFeatures();
  const failedFeatures = featureRegistry.getFailedFeatureRegistrations();

  logFeatureResults(successfulFeatures, failedFeatures);

  return server;
}

/**
 * Start MCP server with STDIO transport
 */
async function startStdioServer(): Promise<void> {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logServerStart('stdio');
}

/**
 * Start MCP server with HTTP transport using StreamableHTTPServerTransport
 */
async function startHttpServer(port: number = config.PORT): Promise<void> {
  const app = express();
  const serverLogger = createServerLogger();

  app.use(express.json());

  // Add CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'backtick-mcp-server',
      timestamp: new Date().toISOString(),
    });
  });

  // MCP endpoint for JSON-RPC over HTTP
  app.post('/mcp', async (req, res) => {
    const requestId = randomUUID();
    const requestLogger = createRequestLogger(requestId);

    try {
      const server = await createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(), // Generate secure session IDs
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on('close', () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      logError(error, 'MCP request handling', requestLogger);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // MCP SSE endpoint for real-time updates
  app.get('/mcp', async (req, res) => {
    const requestId = randomUUID();
    const requestLogger = createRequestLogger(requestId);

    try {
      const server = await createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      await server.connect(transport);
      await transport.handleRequest(req, res);

      res.on('close', () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      logError(error, 'MCP SSE request handling', requestLogger);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
        });
      }
    }
  });

  // MCP DELETE endpoint for session termination
  app.delete('/mcp', async (req, res) => {
    const requestId = randomUUID();
    const requestLogger = createRequestLogger(requestId);

    try {
      const server = await createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      await server.connect(transport);
      await transport.handleRequest(req, res);

      res.on('close', () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      logError(error, 'MCP DELETE request handling', requestLogger);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
        });
      }
    }
  });

  app.listen(port, () => {
    serverLogger.info(
      `🌐 HTTP server listening on port ${port} - MCP endpoints available at /mcp`
    );
    logServerStart('http', port);
  });
}

/**
 * Start the MCP server with the specified transport mode
 */
export async function startServer(
  mode: ServerMode = 'stdio',
  port?: number
): Promise<void> {
  const serverLogger = createServerLogger();

  try {
    if (mode === 'http') {
      await startHttpServer(port);
    } else {
      await startStdioServer();
    }
  } catch (error) {
    logError(error, 'server startup', serverLogger);
    process.exit(1);
  }
}
