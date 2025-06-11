import { CalcomClient } from './calcom.client.js';
import {
  GetSlotsInput,
  GetSlotsInputSchema,
  CalcomSlotsResponse,
} from './calcom.types.js';

/**
 * Cal.com service for handling slot requests
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
   * Get available slots from Cal.com
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
