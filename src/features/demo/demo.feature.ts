import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getErrorMessage } from '../../infra/utils.js';
import type {
  Feature,
  FeatureInfo,
  FeatureRegistrationResult,
} from '../../infra/features.js';
import { createFeatureLogger } from '../../infra/logger.js';

/**
 * Demo feature implementation for testing MCP server functionality
 * This feature provides simple tools that don't require external dependencies
 */
export class DemoFeature implements Feature {
  private logger = createFeatureLogger('demo');

  /**
   * Get feature information
   */
  getInfo(): FeatureInfo {
    return {
      name: 'Demo',
      description: 'Provides simple demo tools for testing MCP functionality',
      version: '1.0.0',
      enabled: true,
    };
  }

  /**
   * Check if the feature can be loaded (always true for demo)
   */
  canLoad(): boolean {
    return true; // Demo feature has no external dependencies
  }

  /**
   * Register the feature with the MCP server
   */
  async register(server: McpServer): Promise<FeatureRegistrationResult> {
    try {
      // Register ECHO tool
      server.tool(
        'ECHO',
        'Echo back the provided message with optional formatting',
        {
          message: z.string().describe('The message to echo back'),
          uppercase: z
            .boolean()
            .optional()
            .default(false)
            .describe('Whether to return the message in uppercase'),
          prefix: z
            .string()
            .optional()
            .describe('Optional prefix to add to the message'),
        },
        async ({ message, uppercase, prefix }) => {
          let result = message;

          if (uppercase) {
            result = result.toUpperCase();
          }

          if (prefix) {
            result = `${prefix}: ${result}`;
          }

          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        }
      );

      // Register SYSTEM_INFO tool
      server.tool(
        'SYSTEM_INFO',
        'Get basic system information',
        {},
        async () => {
          const info = {
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(info, null, 2),
              },
            ],
          };
        }
      );

      // Register RANDOM_UUID tool
      server.tool(
        'RANDOM_UUID',
        'Generate a random UUID',
        {
          count: z
            .number()
            .min(1)
            .max(10)
            .optional()
            .default(1)
            .describe('Number of UUIDs to generate (1-10)'),
        },
        async ({ count }) => {
          const { randomUUID } = await import('node:crypto');
          const uuids = Array.from({ length: count }, () => randomUUID());

          return {
            content: [
              {
                type: 'text',
                text: count === 1 ? uuids[0] : JSON.stringify(uuids, null, 2),
              },
            ],
          };
        }
      );

      return {
        success: true,
        toolsRegistered: ['ECHO', 'SYSTEM_INFO', 'RANDOM_UUID'],
        info: this.getInfo(),
      };
    } catch (error) {
      const result: FeatureRegistrationResult = {
        success: false,
        error: getErrorMessage(error),
        info: this.getInfo(),
      };

      this.logger.error(`Demo feature failed to load: ${result.error}`);
      return result;
    }
  }
}

/**
 * Demo feature instance
 */
export const demoFeature = new DemoFeature();
