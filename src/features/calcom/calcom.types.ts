import { z } from 'zod';

/**
 * Input validation schema for slot requests
 */
export const GetSlotsInputSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  username: z.string().optional(),
  eventTypeSlug: z.string().optional(),
  eventTypeId: z.number().optional(),
  timeZone: z.string().default('UTC').optional(),
});

export type GetSlotsInput = z.infer<typeof GetSlotsInputSchema>;

/**
 * Input validation schema for getting slots by event type ID (conversational flow)
 */
export const GetEventTypeSlotsInputSchema = z.object({
  eventTypeId: z.number(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  timeZone: z.string().default('UTC').optional(),
});

export type GetEventTypeSlotsInput = z.infer<
  typeof GetEventTypeSlotsInputSchema
>;

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
