import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { loadCalcomConfig } from './calcom.config.js';

interface CalcomErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

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

export interface CalcomEventTypesResponse {
  event_types: CalcomEventType[];
}

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

export interface GetSlotsParams {
  eventTypeId: number;
  start: string;
  end: string;
  timeZone: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

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

export class CalcomClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly retryConfig: RetryConfig;
  private readonly apiToken: string;

  constructor(apiToken?: string, baseURL?: string, retryConfig: Partial<RetryConfig> = {}) {
    const config = loadCalcomConfig();

    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      ...retryConfig,
    };

    this.apiToken = apiToken || config.CALCOM_API_TOKEN;

    this.axiosInstance = axios.create({
      baseURL: baseURL || config.CALCOM_API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async getEventTypes(): Promise<CalcomEventType[]> {
    const response = await this.makeRequest<CalcomEventTypesResponse>({
      method: 'GET',
      url: '/v1/event-types',
      params: {
        apiKey: this.apiToken,
      },
    });

    return response.data.event_types;
  }

  async getSlots(params: GetSlotsParams): Promise<CalcomSlotsResponse> {
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
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    return response.data;
  }

  private async makeRequest<T>(config: AxiosRequestConfig, attempt: number = 1): Promise<AxiosResponse<T>> {
    try {
      const response = await this.axiosInstance.request<T>(config);
      return response;
    } catch (error) {
      if (attempt >= this.retryConfig.maxRetries || !this.shouldRetry(error)) {
        throw this.handleError(error);
      }

      const delay = this.calculateDelay(attempt);
      await this.sleep(delay);
      return this.makeRequest<T>(config, attempt + 1);
    }
  }

  private shouldRetry(error: any): boolean {
    if (!error.response) {
      return true;
    }

    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleError(error: any): CalcomClientError {
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data as CalcomErrorResponse;

      const message = errorData?.error?.message || `HTTP ${statusCode} error`;
      const code = errorData?.error?.code || 'HTTP_ERROR';

      return new CalcomClientError(message, statusCode, code);
    } else if (error.request) {
      return new CalcomClientError('Network error: Unable to reach Cal.com API');
    } else {
      return new CalcomClientError(`Request error: ${error.message}`);
    }
  }
}
