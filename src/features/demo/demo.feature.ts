import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getErrorMessage } from '../../infra/utils.js';
import type { Feature, FeatureInfo, FeatureRegistrationResult } from '../../infra/features.js';
import { createFeatureLogger } from '../../infra/logger.js';

/**
 * Demo feature implementation for testing MCP server functionality
 * This feature provides simple tools that don't require external dependencies
 */
export class DemoFeature implements Feature {
  private logger = createFeatureLogger('demo');

  getInfo(): FeatureInfo {
    return {
      name: 'Demo',
      description: 'Provides simple demo tools for testing MCP functionality',
      version: '1.0.0',
      enabled: true,
    };
  }

  canLoad(): boolean {
    return true;
  }

  async register(server: McpServer): Promise<FeatureRegistrationResult> {
    try {
      server.tool(
        'ECHO',
        'Echo back the provided message with optional formatting',
        {
          message: z.string().describe('The message to echo back'),
          uppercase: z.boolean().optional().default(false).describe('Whether to return the message in uppercase'),
          prefix: z.string().optional().describe('Optional prefix to add to the message'),
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

      server.tool('SYSTEM_INFO', 'Get basic system information', {}, async () => {
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
      });

      server.tool(
        'RANDOM_UUID',
        'Generate a random UUID',
        {
          count: z.number().min(1).max(10).optional().default(1).describe('Number of UUIDs to generate (1-10)'),
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

export const demoFeature = new DemoFeature();
