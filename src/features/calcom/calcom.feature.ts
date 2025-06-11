import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { canLoadCalcomFeature, loadCalcomConfig } from './calcom.config.js';
import { calcomService } from './calcom.service.js';
import type {
  Feature,
  FeatureInfo,
  FeatureRegistrationResult,
} from '../../infra/features.js';
import { createFeatureLogger } from '../../infra/logger.js';

/**
 * Cal.com feature implementation
 */
export class CalcomFeature implements Feature {
  private logger = createFeatureLogger('calcom');

  /**
   * Get feature information
   */
  getInfo(): FeatureInfo {
    return {
      name: 'Cal.com',
      description:
        'Integrates with Cal.com API to provide meeting slot availability',
      version: '1.0.0',
      enabled: true,
    };
  }

  /**
   * Check if the feature can be loaded
   */
  canLoad(): boolean {
    return canLoadCalcomFeature();
  }

  /**
   * Register the feature with the MCP server
   */
  async register(server: McpServer): Promise<FeatureRegistrationResult> {
    try {
      // Validate configuration (will throw if invalid)
      loadCalcomConfig();

      // Register GET_EVENT_TYPE_OPTIONS tool (Step 1 of conversational flow)
      server.tool(
        'GET_EVENT_TYPE_OPTIONS',
        'Get available Cal.com event types for user selection',
        {},
        async () => {
          try {
            const eventTypeOptions = await calcomService.getEventTypeOptions();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      eventTypes: eventTypeOptions,
                      message:
                        'Available meeting types. Ask the user which type they prefer.',
                    },
                    null,
                    2
                  ),
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
                        code: 'EVENT_TYPES_ERROR',
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

      // Register GET_SLOTS_FOR_EVENT_TYPE tool (Step 2 of conversational flow)
      server.tool(
        'GET_SLOTS_FOR_EVENT_TYPE',
        'Get available slots for a specific Cal.com event type by ID',
        {
          eventTypeId: z
            .number()
            .describe('Event type ID selected by the user'),
          start: z
            .string()
            .datetime()
            .describe('Start date and time in ISO 8601 format'),
          end: z
            .string()
            .datetime()
            .describe('End date and time in ISO 8601 format'),
          timeZone: z
            .string()
            .default('UTC')
            .describe('Time zone (default: UTC)'),
        },
        async ({ eventTypeId, start, end, timeZone }) => {
          try {
            const result = await calcomService.getSlotsForEventType({
              eventTypeId,
              start,
              end,
              timeZone,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      eventType: result.eventType,
                      slots: result.slots,
                      message: `Available slots for "${result.eventType.title}" (${result.eventType.length} minutes)`,
                    },
                    null,
                    2
                  ),
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
                        code: 'EVENT_TYPE_SLOTS_ERROR',
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

      // Register GET_AVAILABLE_SLOTS tool (legacy support)
      server.tool(
        'GET_AVAILABLE_SLOTS',
        'Get available meeting slots from Cal.com (legacy method - use GET_EVENT_TYPE_OPTIONS + GET_SLOTS_FOR_EVENT_TYPE for better UX)',
        {
          start: z
            .string()
            .datetime()
            .describe('Start date and time in ISO 8601 format'),
          end: z
            .string()
            .datetime()
            .describe('End date and time in ISO 8601 format'),
          username: z
            .string()
            .optional()
            .describe('Cal.com username (optional)'),
          eventTypeSlug: z
            .string()
            .optional()
            .describe('Event type slug (optional)'),
          eventTypeId: z
            .number()
            .optional()
            .describe('Event type ID (optional)'),
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

      return {
        success: true,
        toolsRegistered: [
          'GET_EVENT_TYPE_OPTIONS',
          'GET_SLOTS_FOR_EVENT_TYPE',
          'GET_AVAILABLE_SLOTS',
        ],
        info: this.getInfo(),
      };
    } catch (error) {
      const result: FeatureRegistrationResult = {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during Cal.com feature registration',
        info: this.getInfo(),
      };

      this.logger.error(`Cal.com feature failed to load: ${result.error}`);
      return result;
    }
  }
}

/**
 * Cal.com feature instance
 */
export const calcomFeature = new CalcomFeature();
