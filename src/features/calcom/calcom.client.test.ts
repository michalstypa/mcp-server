import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CalcomClient,
  CalcomClientError,
  type CalcomEventType,
  type CalcomSlotsResponse,
  type GetSlotsParams,
} from './calcom.client.js';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: vi.fn(),
    })),
  },
}));

vi.mock('./calcom.config.js', () => ({
  loadCalcomConfig: vi.fn(() => ({
    CALCOM_API_BASE: 'https://api.cal.com',
    CALCOM_API_TOKEN: 'test-token',
  })),
}));

describe('CalcomClient', () => {
  let client: CalcomClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new CalcomClient();
    mockAxiosInstance = (client as any).axiosInstance;
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client).toBeInstanceOf(CalcomClient);
    });

    it('should create client with custom config', () => {
      const customClient = new CalcomClient('custom-token', 'https://custom.cal.com');
      expect(customClient).toBeInstanceOf(CalcomClient);
    });
  });

  describe('getEventTypes', () => {
    it('should fetch event types successfully', async () => {
      const mockEventTypes: CalcomEventType[] = [
        {
          id: 1,
          title: '30 min meeting',
          slug: '30-min-meeting',
          length: 30,
          hidden: false,
          position: 0,
          userId: 123,
        },
      ];

      const mockResponse = {
        data: {
          event_types: mockEventTypes,
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await client.getEventTypes();

      expect(result).toEqual(mockEventTypes);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/v1/event-types',
        params: {
          apiKey: 'test-token',
        },
      });
    });

    it('should handle API errors', async () => {
      const apiError = {
        response: {
          status: 401,
          data: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid API token',
            },
          },
        },
      };

      mockAxiosInstance.request.mockRejectedValueOnce(apiError);

      await expect(client.getEventTypes()).rejects.toThrow(CalcomClientError);
    });
  });

  describe('getSlots', () => {
    const mockParams: GetSlotsParams = {
      eventTypeId: 123,
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-02T00:00:00Z',
      timeZone: 'UTC',
    };

    it('should fetch slots successfully', async () => {
      const mockSlots: CalcomSlotsResponse = {
        slots: {
          '2024-01-01': [{ time: '2024-01-01T10:00:00Z' }, { time: '2024-01-01T11:00:00Z' }],
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce({
        data: mockSlots,
      });

      const result = await client.getSlots(mockParams);

      expect(result).toEqual(mockSlots);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/v2/slots',
        params: {
          eventTypeId: 123,
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-02T00:00:00Z',
          timeZone: 'UTC',
        },
        headers: {
          'cal-api-version': '2024-09-04',
          Accept: 'application/json',
          Authorization: 'Bearer test-token',
        },
      });
    });

    it('should handle API errors', async () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'BAD_REQUEST',
              message: 'Invalid date range',
            },
          },
        },
      };

      mockAxiosInstance.request.mockRejectedValueOnce(apiError);

      await expect(client.getSlots(mockParams)).rejects.toThrow(CalcomClientError);
    });

    it('should handle network errors', async () => {
      const networkError = {
        request: {},
        message: 'Network Error',
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      await expect(client.getSlots(mockParams)).rejects.toThrow(CalcomClientError);
    });
  });

  describe('retry logic', () => {
    it('should retry on 5xx errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Server error',
            },
          },
        },
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          data: {
            event_types: [],
          },
        });

      const result = await client.getEventTypes();

      expect(result).toEqual([]);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx errors', async () => {
      const clientError = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'BAD_REQUEST',
              message: 'Bad request',
            },
          },
        },
      };

      mockAxiosInstance.request.mockRejectedValueOnce(clientError);

      await expect(client.getEventTypes()).rejects.toThrow(CalcomClientError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });
  });
});
