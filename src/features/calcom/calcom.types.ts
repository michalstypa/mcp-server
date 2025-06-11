import { z } from 'zod';

/**
 * Input validation schema for slot requests
 */
export const GetSlotsInputSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  eventTypeId: z.number(),
  timeZone: z.string().default('UTC').optional(),
});

export type GetSlotsInput = z.infer<typeof GetSlotsInputSchema>;

/**
 * Cal.com slot interface (re-exported from client)
 */
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

/**
 * Cal.com slots response interface (re-exported from client)
 */
export interface CalcomSlotsResponse {
  slots: {
    [date: string]: CalcomSlot[];
  };
}

/**
 * Formatted slot data for NDJSON streaming
 */
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
