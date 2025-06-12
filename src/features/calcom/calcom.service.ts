import { CalcomClient } from './calcom.client.js';
import {
  GetSlotsInput,
  GetSlotsInputSchema,
  CalcomSlotsResponse,
} from './calcom.types.js';

/**
 * Validate and normalize GetSlots input
 */
function validateGetSlotsInput(input: GetSlotsInput): Required<GetSlotsInput> {
  const validated = GetSlotsInputSchema.parse(input);
  return {
    ...validated,
    timeZone: validated.timeZone || 'UTC',
  };
}

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
   * Get event types for the authenticated user
   */
  async getEventTypes() {
    const client = this.getCalcomClient();
    return await client.getEventTypes();
  }

  /**
   * Get available slots from Cal.com
   * Validates input for defensive programming (in case called directly)
   */
  async getAvailableSlots(input: GetSlotsInput): Promise<CalcomSlotsResponse> {
    const validatedInput = validateGetSlotsInput(input);
    const client = this.getCalcomClient();

    return await client.getSlots({
      eventTypeId: validatedInput.eventTypeId,
      start: validatedInput.start,
      end: validatedInput.end,
      timeZone: validatedInput.timeZone,
    });
  }
}

/**
 * Export validation function for potential reuse
 */
export { validateGetSlotsInput };

/**
 * Default Cal.com service instance
 */
export const calcomService = new CalcomService();
