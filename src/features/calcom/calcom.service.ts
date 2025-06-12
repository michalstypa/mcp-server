import { CalcomClient } from './calcom.client.js';
import { GetSlotsInput, GetSlotsInputSchema, CalcomSlotsResponse } from './calcom.types.js';

function validateGetSlotsInput(input: GetSlotsInput): Required<GetSlotsInput> {
  const validated = GetSlotsInputSchema.parse(input);
  return {
    ...validated,
    timeZone: validated.timeZone || 'UTC',
  };
}

export class CalcomService {
  private calcomClient: CalcomClient | null = null;

  private getCalcomClient(): CalcomClient {
    if (!this.calcomClient) {
      this.calcomClient = new CalcomClient();
    }
    return this.calcomClient;
  }

  async getEventTypes() {
    const client = this.getCalcomClient();
    return await client.getEventTypes();
  }

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

export { validateGetSlotsInput };

export const calcomService = new CalcomService();
