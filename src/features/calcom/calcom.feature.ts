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

      const toolsRegistered: string[] = [];
      const promptsRegistered: string[] = [];
      const resourcesRegistered: string[] = [];

      // Register GET_EVENT_TYPES tool
      server.tool(
        'GET_EVENT_TYPES',
        'Get available Cal.com event types',
        {},
        async () => {
          try {
            const eventTypes = await calcomService.getEventTypes();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      eventTypes: eventTypes,
                      message: 'Available Cal.com event types',
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
      toolsRegistered.push('GET_EVENT_TYPES');

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
          eventTypeId: z.number().describe('Event type ID (required)'),
          timeZone: z
            .string()
            .default('UTC')
            .describe('Time zone (default: UTC)'),
        },
        async ({ start, end, eventTypeId, timeZone }) => {
          try {
            const result = await calcomService.getAvailableSlots({
              start,
              end,
              eventTypeId,
              timeZone,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      slots: result,
                      message: 'Available meeting slots',
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
                        code: 'AVAILABLE_SLOTS_ERROR',
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
      toolsRegistered.push('GET_AVAILABLE_SLOTS');

      // Register MEETING_BOOKING_FLOW prompt - this initiates the guided flow
      server.prompt(
        'MEETING_BOOKING_FLOW',
        'Start the guided meeting booking process',
        {
          startDate: z
            .string()
            .datetime()
            .optional()
            .describe('Optional start date and time in ISO 8601 format'),
          endDate: z
            .string()
            .datetime()
            .optional()
            .describe('Optional end date and time in ISO 8601 format'),
          timeZone: z
            .string()
            .optional()
            .describe('Time zone for the meeting (optional)'),
        },
        async ({ startDate, endDate, timeZone }) => {
          try {
            // First, fetch available event types
            const eventTypes = await calcomService.getEventTypes();

            return {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `I'd like to book a meeting. Here are the available meeting types:\n\n${eventTypes
                      .map(
                        (type, index) =>
                          `${index + 1}. **${type.title}** (${type.length} minutes)\n   ${type.slug ? `Slug: ${type.slug}` : 'No additional details'}`
                      )
                      .join(
                        '\n\n'
                      )}\n\nWhich type of meeting would you like to book? Please specify the number or name.`,
                  },
                },
                {
                  role: 'assistant',
                  content: {
                    type: 'text',
                    text: `I can help you book a meeting! I see the available meeting types above. 

To proceed, I need to know:
1. Which meeting type you'd like (you can refer to it by number or name)
2. Your preferred date range${startDate && endDate ? ` (you mentioned ${startDate} to ${endDate})` : ''}
3. Your time zone${timeZone ? ` (you specified ${timeZone})` : ' (please specify if not UTC)'}

Once you select a meeting type, I'll use the GET_AVAILABLE_SLOTS tool to check availability and show you the specific time slots.`,
                  },
                },
              ],
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            return {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: "I'd like to book a meeting.",
                  },
                },
                {
                  role: 'assistant',
                  content: {
                    type: 'text',
                    text: `I'd like to help you book a meeting, but I'm having trouble fetching the available meeting types. Error: ${errorMessage}

Please try again, or contact support if the issue persists.`,
                  },
                },
              ],
            };
          }
        }
      );
      promptsRegistered.push('MEETING_BOOKING_FLOW');

      // Register EVENT_TYPE_SELECTION prompt - helps guide users to select event types
      server.prompt(
        'EVENT_TYPE_SELECTION',
        'Help user select from available Cal.com event types',
        {
          userInput: z
            .string()
            .describe("User's input about which meeting type they want"),
        },
        async ({ userInput }) => {
          try {
            const eventTypes = await calcomService.getEventTypes();

            return {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `The user said: "${userInput}"\n\nHere are the available meeting types:\n${eventTypes
                      .map(
                        (type, index) =>
                          `${index + 1}. **${type.title}** (ID: ${type.id}, ${type.length} minutes)\n   ${type.slug ? `Slug: ${type.slug}` : 'No additional details'}`
                      )
                      .join('\n\n')}`,
                  },
                },
                {
                  role: 'assistant',
                  content: {
                    type: 'text',
                    text: `Based on your input "${userInput}", I need to identify which meeting type you want to book.

Looking at the available options, I'll help you select the appropriate meeting type. Once you confirm the selection, I'll use the GET_AVAILABLE_SLOTS tool with the specific event type ID to check availability.

Please clarify which meeting type you'd like by:
- Referring to the number (1, 2, 3, etc.)
- Using the exact meeting title
- Or describing what you need more specifically

The event type IDs are: ${eventTypes.map(type => `${type.title} (ID: ${type.id})`).join(', ')}`,
                  },
                },
              ],
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            return {
              messages: [
                {
                  role: 'assistant',
                  content: {
                    type: 'text',
                    text: `I'm having trouble fetching the available meeting types to help with your selection. Error: ${errorMessage}

Please try using the GET_EVENT_TYPES tool directly to see available options.`,
                  },
                },
              ],
            };
          }
        }
      );
      promptsRegistered.push('EVENT_TYPE_SELECTION');

      // Register meeting booking workflow resource
      server.resource(
        'calcom://booking-workflow',
        'Guide for multi-step meeting booking process',
        {},
        async () => {
          return {
            contents: [
              {
                uri: 'calcom://booking-workflow',
                mimeType: 'text/markdown',
                text: `# Meeting Booking Workflow

## Overview
This Cal.com integration provides a guided multi-step process for booking meetings:

1. **User requests meeting slots** → Trigger the MEETING_BOOKING_FLOW prompt
2. **Show available event types** → User selects preferred meeting type  
3. **Check availability** → Use GET_AVAILABLE_SLOTS with the selected event type ID
4. **Present time slots** → User can book their preferred slot

## Available Tools
- \`GET_EVENT_TYPES\`: Fetch all available meeting types
- \`GET_AVAILABLE_SLOTS\`: Get available time slots for a specific event type

## Available Prompts
- \`MEETING_BOOKING_FLOW\`: Initiates the guided booking process
- \`EVENT_TYPE_SELECTION\`: Helps users select from available meeting types

## Workflow Steps

### Step 1: User Requests Meeting
When a user asks for meeting availability:
- Use the \`MEETING_BOOKING_FLOW\` prompt to start the guided process
- This automatically fetches event types and presents them to the user
- Optionally provide startDate, endDate, and timeZone parameters

### Step 2: Event Type Selection  
User indicates which meeting type they want:
- Parse their response to identify the event type ID
- Use the \`EVENT_TYPE_SELECTION\` prompt if clarification is needed
- Event types have: id, title, slug, length (in minutes)

### Step 3: Check Availability
Once event type is confirmed:
- Use \`GET_AVAILABLE_SLOTS\` with the event type ID
- Provide start/end dates and timezone
- Present available time slots to the user

## Example Usage
1. User: "I'd like to book a meeting"
2. Assistant: Invoke \`MEETING_BOOKING_FLOW\` prompt
3. User: "I want the 30-minute consultation"  
4. Assistant: Parse selection, then use \`GET_AVAILABLE_SLOTS\` with appropriate event type ID
5. Assistant: Present available time slots

## Event Type Structure
Each event type contains:
- \`id\`: Unique identifier (required for GET_AVAILABLE_SLOTS)
- \`title\`: Display name
- \`slug\`: URL-friendly identifier
- \`length\`: Duration in minutes
- Other metadata fields

## Error Handling
- If event types cannot be fetched, inform user and suggest trying again
- If slot availability fails, check event type ID and date parameters
- Provide clear error messages with actionable next steps

## Tips
- Always use event type IDs (not titles) when calling GET_AVAILABLE_SLOTS
- Parse user input flexibly (accept numbers, titles, or partial matches)
- Provide clear options when multiple interpretations are possible
- Include timezone information in availability requests
`,
              },
            ],
          };
        }
      );
      resourcesRegistered.push('calcom://booking-workflow');

      this.logger.info('Cal.com feature registered successfully');

      return {
        success: true,
        toolsRegistered,
        promptsRegistered,
        resourcesRegistered,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to register Cal.com feature:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

/**
 * Cal.com feature instance
 */
export const calcomFeature = new CalcomFeature();
