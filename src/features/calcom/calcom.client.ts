import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { loadCalcomConfig } from './calcom.config.js';

/**
 * Cal.com API error response interface
 */
interface CalcomErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Cal.com event type interface
 */
export interface CalcomEventType {
  id: number;
  title: string;
  slug: string;
  length: number;
  hidden: boolean;
  position: number;
  userId: number;
  teamId?: number;
  eventName?: string;
  timeZone?: string;
  periodType?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  periodDays?: number;
  periodCountCalendarDays?: boolean;
  requiresConfirmation?: boolean;
  recurringEvent?: any;
  disableGuests?: boolean;
  hideCalendarNotes?: boolean;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  schedulingType?: string;
  price?: number;
  currency?: string;
  slotInterval?: number;
  metadata?: any;
  successRedirectUrl?: string;
  workflows?: any[];
  hosts?: any[];
  users?: any[];
}

/**
 * Cal.com event types response interface
 */
export interface CalcomEventTypesResponse {
  event_types: CalcomEventType[];
}

/**
 * Cal.com slot interface
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
 * Cal.com slots response interface
 */
export interface CalcomSlotsResponse {
  slots: {
    [date: string]: CalcomSlot[];
  };
}

/**
 * Parameters for getting slots by username/slug
 */
export interface GetSlotsByUsernameParams {
  username: string;
  eventTypeSlug: string;
  start: string; // ISO 8601 date string
  end: string; // ISO 8601 date string
  timeZone: string;
}

/**
 * Parameters for getting slots by event type ID
 */
export interface GetSlotsByEventTypeIdParams {
  eventTypeId: number;
  start: string; // ISO 8601 date string
  end: string; // ISO 8601 date string
  timeZone: string;
}

/**
 * Retry configuration interface
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

/**
 * Cal.com client error class
 */
export class CalcomClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'CalcomClientError';
  }
}

/**
 * Formatted event type for user selection
 */
export interface EventTypeOption {
  id: number;
  title: string;
  description: string;
  duration: string;
  requiresConfirmation?: boolean;
}

/**
 * Cal.com API client with retry logic
 */
export class CalcomClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly retryConfig: RetryConfig;

  constructor(
    apiToken?: string,
    baseURL?: string,
    retryConfig: Partial<RetryConfig> = {}
  ) {
    // Load feature-specific config if not provided
    const config = loadCalcomConfig();

    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      ...retryConfig,
    };

    this.axiosInstance = axios.create({
      baseURL: baseURL || config.CALCOM_API_BASE,
      headers: {
        Authorization: `Bearer ${apiToken || config.CALCOM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Get event types for the authenticated user
   */
  async getEventTypes(): Promise<CalcomEventType[]> {
    const response = await this.makeRequest<CalcomEventTypesResponse>({
      method: 'GET',
      url: '/v1/event-types',
    });

    return response.data.event_types;
  }

  /**
   * Get available slots by username and event type slug
   */
  async getSlotsByUsername(
    params: GetSlotsByUsernameParams
  ): Promise<CalcomSlotsResponse> {
    const response = await this.makeRequest<CalcomSlotsResponse>({
      method: 'GET',
      url: '/v2/slots',
      params: {
        username: params.username,
        eventTypeSlug: params.eventTypeSlug,
        start: params.start,
        end: params.end,
        timeZone: params.timeZone,
      },
      headers: {
        'cal-api-version': '2024-09-04',
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Get available slots by event type ID
   */
  async getSlotsByEventTypeId(
    params: GetSlotsByEventTypeIdParams
  ): Promise<CalcomSlotsResponse> {
    const response = await this.makeRequest<CalcomSlotsResponse>({
      method: 'GET',
      url: '/v2/slots',
      params: {
        eventTypeId: params.eventTypeId,
        start: params.start,
        end: params.end,
        timeZone: params.timeZone,
      },
      headers: {
        'cal-api-version': '2024-09-04',
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    config: AxiosRequestConfig,
    attempt: number = 1
  ): Promise<AxiosResponse<T>> {
    try {
      const response = await this.axiosInstance.request<T>(config);
      return response;
    } catch (error) {
      // Handle error and determine if we should retry
      if (attempt >= this.retryConfig.maxRetries || !this.shouldRetry(error)) {
        throw this.handleError(error);
      }

      // Retry with exponential backoff
      const delay = this.calculateDelay(attempt);
      await this.sleep(delay);
      return this.makeRequest<T>(config, attempt + 1);
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: any): boolean {
    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on 5xx server errors
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle axios errors and convert to CalcomClientError
   */
  private handleError(error: any): CalcomClientError {
    if (error.response) {
      // Server responded with error status
      const statusCode = error.response.status;
      const errorData = error.response.data as CalcomErrorResponse;

      const message = errorData?.error?.message || `HTTP ${statusCode} error`;
      const code = errorData?.error?.code || 'HTTP_ERROR';

      return new CalcomClientError(message, statusCode, code);
    } else if (error.request) {
      // Network error
      return new CalcomClientError(
        'Network error: Unable to reach Cal.com API'
      );
    } else {
      // Request setup error
      return new CalcomClientError(`Request error: ${error.message}`);
    }
  }

  /**
   * Get event types formatted for user selection in conversational flow
   */
  async getEventTypeOptions(): Promise<EventTypeOption[]> {
    const eventTypes = await this.getEventTypes();

    return eventTypes
      .filter(eventType => !eventType.hidden) // Only show non-hidden events
      .map(eventType => ({
        id: eventType.id,
        title: eventType.title,
        description: this.formatEventTypeDescription(eventType),
        duration: this.formatDuration(eventType.length),
        requiresConfirmation: eventType.requiresConfirmation,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)); // Sort alphabetically
  }

  /**
   * Get available slots for a specific event type ID (for the final step in conversational flow)
   */
  async getSlotsForEventType(
    eventTypeId: number,
    start: string,
    end: string,
    timeZone: string
  ): Promise<{
    eventType: CalcomEventType;
    slots: CalcomSlotsResponse;
  }> {
    // First get the event type details
    const allEventTypes = await this.getEventTypes();
    const eventType = allEventTypes.find(et => et.id === eventTypeId);

    if (!eventType) {
      throw new CalcomClientError(
        `Event type with ID ${eventTypeId} not found`
      );
    }

    // Get the slots
    const slots = await this.getSlotsByEventTypeId({
      eventTypeId,
      start,
      end,
      timeZone,
    });

    return {
      eventType,
      slots,
    };
  }

  /**
   * Helper method to format event type description for user selection
   */
  private formatEventTypeDescription(eventType: CalcomEventType): string {
    const parts: string[] = [];

    // Add duration
    parts.push(`${this.formatDuration(eventType.length)} meeting`);

    // Add confirmation requirement
    if (eventType.requiresConfirmation) {
      parts.push('requires confirmation');
    }

    // Add team info if applicable
    if (eventType.teamId) {
      parts.push('team meeting');
    }

    // Add price if applicable
    if (eventType.price && eventType.price > 0) {
      parts.push(`${eventType.currency || '$'}${eventType.price}`);
    }

    return parts.join(' • ');
  }

  /**
   * Helper method to format duration in a user-friendly way
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    } else if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }
}
