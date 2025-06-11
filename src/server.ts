import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './infra/config.js';

// Import the feature registry system
import { featureRegistry, initializeFeatures } from './features/index.js';

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
    },
  });

  // Initialize and register all features
  initializeFeatures();
  await featureRegistry.registerAllFeatures(server);

  // Log summary
  const successfulFeatures =
    featureRegistry.getSuccessfullyRegisteredFeatures();
  const failedFeatures = featureRegistry.getFailedFeatureRegistrations();

  if (successfulFeatures.length === 0) {
    console.error(
      '⚠️  Warning: No features loaded successfully. Server will have no capabilities.'
    );
  } else {
    const featureNames = successfulFeatures
      .map(result => result.info?.name)
      .join(', ');
    console.error(
      `🎯 ${successfulFeatures.length} feature(s) loaded: ${featureNames}`
    );
  }

  if (failedFeatures.length > 0) {
    console.error(`⚠️  ${failedFeatures.length} feature(s) failed to load`);
  }

  return server;
}

/**
 * Start MCP server with STDIO transport
 */
async function startStdioServer(): Promise<void> {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('Backtick MCP Server started with STDIO transport');
}

/**
 * Start MCP server with HTTP transport using StreamableHTTPServerTransport
 */
async function startHttpServer(port: number = config.PORT): Promise<void> {
  const app = express();
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
      console.error('Error handling MCP request:', error);
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

  // Handle GET requests for SSE streams
  app.get('/mcp', async (req, res) => {
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
      console.error('Error handling MCP SSE request:', error);
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

  // Handle DELETE requests for session termination
  app.delete('/mcp', async (req, res) => {
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
      console.error('Error handling MCP DELETE request:', error);
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

  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      console.error(
        `Backtick MCP Server started with HTTP transport on port ${port}`
      );
      resolve();
    });

    server.on('error', reject);
  });
}

/**
 * Start the MCP server with the specified transport mode
 */
export async function startServer(
  mode: ServerMode = 'stdio',
  port?: number
): Promise<void> {
  try {
    if (mode === 'http') {
      await startHttpServer(port);
    } else {
      await startStdioServer();
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
