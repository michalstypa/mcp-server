import { CalcomClient, EventTypeOption } from './calcom.client.js';
import {
  GetSlotsInput,
  GetSlotsInputSchema,
  CalcomSlotsResponse,
  GetEventTypeSlotsInput,
  GetEventTypeSlotsInputSchema,
} from './calcom.types.js';

/**
 * Cal.com service for handling slot requests and conversational flow
 */
export class CalcomService {
  private calcomClient: CalcomClient | null = null;

  /**
   * Get Cal.com client instance (lazy initialization)
   */
  private getCalcomClient(): CalcomClient {
    if (!this.calcomClient) {
      this.calcomClient = new CalcomClient();
    }
    return this.calcomClient;
  }

  /**
   * Get available event types for user selection (Step 1 of conversational flow)
   */
  async getEventTypeOptions(): Promise<EventTypeOption[]> {
    const client = this.getCalcomClient();
    return await client.getEventTypeOptions();
  }

  /**
   * Get available slots for a specific event type ID (Step 2 of conversational flow)
   */
  async getSlotsForEventType(input: GetEventTypeSlotsInput): Promise<{
    eventType: any;
    slots: CalcomSlotsResponse;
  }> {
    const validatedInput = GetEventTypeSlotsInputSchema.parse(input);
    const timeZone = validatedInput.timeZone || 'UTC';

    const client = this.getCalcomClient();

    return await client.getSlotsForEventType(
      validatedInput.eventTypeId,
      validatedInput.start,
      validatedInput.end,
      timeZone
    );
  }

  /**
   * Get available slots from Cal.com (legacy method - maintains backward compatibility)
   */
  async getAvailableSlots(input: GetSlotsInput): Promise<CalcomSlotsResponse> {
    // Validate input and apply defaults
    const validatedInput = GetSlotsInputSchema.parse(input);

    // Ensure timeZone has a value (default should be applied by zod)
    const timeZone = validatedInput.timeZone || 'UTC';

    const client = this.getCalcomClient();

    // Determine which Cal.com API method to use
    if (validatedInput.username && validatedInput.eventTypeSlug) {
      // Use username/slug approach
      return await client.getSlotsByUsername({
        username: validatedInput.username,
        eventTypeSlug: validatedInput.eventTypeSlug,
        start: validatedInput.start,
        end: validatedInput.end,
        timeZone,
      });
    } else if (validatedInput.eventTypeId) {
      // Use event type ID approach
      return await client.getSlotsByEventTypeId({
        eventTypeId: validatedInput.eventTypeId,
        start: validatedInput.start,
        end: validatedInput.end,
        timeZone,
      });
    } else {
      throw new Error(
        'Either username/eventTypeSlug or eventTypeId must be provided'
      );
    }
  }
}

/**
 * Default Cal.com service instance
 */
export const calcomService = new CalcomService();
