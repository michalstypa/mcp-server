import { z } from 'zod';

export const GetSlotsInputSchema = z.object({
  start: z.string().datetime().describe('Start date and time in ISO 8601 format'),
  end: z.string().datetime().describe('End date and time in ISO 8601 format'),
  eventTypeId: z.number().describe('Event type ID (required)'),
  timeZone: z.string().default('UTC').optional().describe('Time zone (default: UTC)'),
});

export type GetSlotsInput = z.infer<typeof GetSlotsInputSchema>;

export interface CalcomSlot {
  time: string;
  attendees?: number;
  bookingUid?: string;
  users?: Array<{
    id: number;
    username: string;
    name: string;
  }>;
}

export interface CalcomSlotsResponse {
  slots: {
    [date: string]: CalcomSlot[];
  };
}

export interface FormattedSlotData {
  date: string;
  time: string;
  attendees?: number;
  bookingUid?: string;
  users?: Array<{
    id: number;
    username: string;
    name: string;
  }>;
}
