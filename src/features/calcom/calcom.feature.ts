import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { canLoadCalcomFeature, loadCalcomConfig } from './calcom.config.js';
import { calcomService } from './calcom.service.js';
import { GetSlotsInputSchema } from './calcom.types.js';
import { createSuccessResponse, createErrorResponse, getErrorMessage } from '../../infra/utils.js';
import type { Feature, FeatureInfo, FeatureRegistrationResult } from '../../infra/features.js';
import { createFeatureLogger } from '../../infra/logger.js';

export class CalcomFeature implements Feature {
  private logger = createFeatureLogger('calcom');

  getInfo(): FeatureInfo {
    return {
      name: 'Cal.com',
      description: 'Integrates with Cal.com API',
      version: '1.1.0',
      enabled: true,
    };
  }

  canLoad(): boolean {
    return canLoadCalcomFeature();
  }

  async register(server: McpServer): Promise<FeatureRegistrationResult> {
    try {
      loadCalcomConfig();

      const toolsRegistered: string[] = [];
      const promptsRegistered: string[] = [];
      const resourcesRegistered: string[] = [];

      server.tool('GET_EVENT_TYPES', 'Get available Cal.com event types', {}, async () => {
        try {
          const eventTypes = await calcomService.getEventTypes();
          return createSuccessResponse({ eventTypes }, 'Available Cal.com event types');
        } catch (error) {
          return createErrorResponse('EVENT_TYPES_ERROR', error);
        }
      });
      toolsRegistered.push('GET_EVENT_TYPES');

      server.tool(
        'GET_AVAILABLE_SLOTS',
        'Get available meeting slots from Cal.com',
        GetSlotsInputSchema.shape,
        async ({ start, end, eventTypeId, timeZone }) => {
          try {
            const result = await calcomService.getAvailableSlots({
              start,
              end,
              eventTypeId,
              timeZone,
            });
            return createSuccessResponse({ slots: result }, 'Available meeting slots');
          } catch (error) {
            return createErrorResponse('AVAILABLE_SLOTS_ERROR', error);
          }
        }
      );
      toolsRegistered.push('GET_AVAILABLE_SLOTS');

      server.prompt(
        'MEETING_BOOKING_FLOW',
        'Start the guided meeting booking process',
        {
          startDate: z.string().datetime().optional().describe('Optional start date and time in ISO 8601 format'),
          endDate: z.string().datetime().optional().describe('Optional end date and time in ISO 8601 format'),
          timeZone: z.string().optional().describe('Time zone for the meeting (optional)'),
        },
        async ({ startDate, endDate, timeZone }) => {
          try {
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
            const errorMessage = getErrorMessage(error);
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

      server.prompt(
        'EVENT_TYPE_SELECTION',
        'Help user select from available Cal.com event types',
        {
          userInput: z.string().describe("User's input about which meeting type they want"),
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
            const errorMessage = getErrorMessage(error);
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

      server.resource('calcom://booking-workflow', 'Guide for multi-step meeting booking process', {}, async () => {
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

## Prompts
- \`MEETING_BOOKING_FLOW\`: Start the guided booking process
- \`EVENT_TYPE_SELECTION\`: Help users select from available event types

## Usage Examples

### Basic Meeting Booking
1. Call MEETING_BOOKING_FLOW prompt to start
2. User selects meeting type from the list
3. Call GET_AVAILABLE_SLOTS with selected event type ID
4. Present available time slots to user

### Event Type Selection Help
1. User mentions wanting to book but unclear about type
2. Call EVENT_TYPE_SELECTION prompt with user input
3. Help user identify correct meeting type
4. Proceed with GET_AVAILABLE_SLOTS once type is selected
`,
            },
          ],
        };
      });
      resourcesRegistered.push('calcom://booking-workflow');

      return {
        success: true,
        toolsRegistered,
        promptsRegistered,
        resourcesRegistered,
        info: this.getInfo(),
      };
    } catch (error) {
      const result: FeatureRegistrationResult = {
        success: false,
        error: getErrorMessage(error),
        info: this.getInfo(),
      };

      this.logger.error(`Cal.com feature failed to load: ${result.error}`);
      return result;
    }
  }
}
export const calcomFeature = new CalcomFeature();
