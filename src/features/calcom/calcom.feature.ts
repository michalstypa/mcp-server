import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { canLoadCalcomFeature, loadCalcomConfig } from './calcom.config.js';
import { calcomService } from './calcom.service.js';

/**
 * Register Cal.com feature with the MCP server
 * Only registers if configuration is available
 */
export function registerCalcomFeature(server: McpServer): boolean {
  // Check if feature can be loaded
  if (!canLoadCalcomFeature()) {
    console.error('Cal.com feature not loaded: CALCOM_API_TOKEN not found');
    return false;
  }

  try {
    // Validate configuration (will throw if invalid)
    const config = loadCalcomConfig();
    console.error(
      `Cal.com feature loaded with API base: ${config.CALCOM_API_BASE}`
    );

    // Register GET_AVAILABLE_SLOTS tool
    server.tool(
      'GET_AVAILABLE_SLOTS',
      'Get available meeting slots from Cal.com',
      {
        start: z
          .string()
          .datetime()
          .describe('Start date and time in ISO 8601 format'),
        end: z
          .string()
          .datetime()
          .describe('End date and time in ISO 8601 format'),
        username: z.string().optional().describe('Cal.com username (optional)'),
        eventTypeSlug: z
          .string()
          .optional()
          .describe('Event type slug (optional)'),
        eventTypeId: z.number().optional().describe('Event type ID (optional)'),
        timeZone: z
          .string()
          .default('UTC')
          .describe('Time zone (default: UTC)'),
      },
      async ({
        start,
        end,
        username,
        eventTypeSlug,
        eventTypeId,
        timeZone,
      }) => {
        try {
          // Use the Cal.com service to get available slots
          const slotsResponse = await calcomService.getAvailableSlots({
            start,
            end,
            username,
            eventTypeSlug,
            eventTypeId,
            timeZone,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(slotsResponse, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: {
                      code: 'SLOTS_ERROR',
                      message: errorMessage,
                    },
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      }
    );

    console.error('Cal.com feature: GET_AVAILABLE_SLOTS tool registered');
    return true;
  } catch (error) {
    console.error(
      `Failed to load Cal.com feature: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}
