import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalcomService } from './calcom.service.js';
import { CalcomClient } from './calcom.client.js';

// Mock the CalcomClient class
vi.mock('./calcom.client.js', () => ({
  CalcomClient: vi.fn(),
}));

describe('Calcom Service', () => {
  let calcomService: CalcomService;
  let mockCalcomClient: {
    getSlotsByUsername: ReturnType<typeof vi.fn>;
    getSlotsByEventTypeId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create a new service instance for each test
    calcomService = new CalcomService();

    // Create the mock client instance
    mockCalcomClient = {
      getSlotsByUsername: vi.fn(),
      getSlotsByEventTypeId: vi.fn(),
    };

    // Mock the constructor to return our mock client
    vi.mocked(CalcomClient).mockImplementation(() => mockCalcomClient as any);
  });

  describe('getAvailableSlots', () => {
    it('should call getSlotsByUsername when username and eventTypeSlug provided', async () => {
      const mockResponse = {
        slots: {
          '2025-01-01': [{ time: '10:00:00', attendees: 0 }],
        },
      };

      mockCalcomClient.getSlotsByUsername.mockResolvedValue(mockResponse);

      const input = {
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-02T00:00:00Z',
        username: 'testuser',
        eventTypeSlug: 'meeting',
        timeZone: 'UTC',
      };

      const result = await calcomService.getAvailableSlots(input);

      expect(mockCalcomClient.getSlotsByUsername).toHaveBeenCalledWith({
        username: 'testuser',
        eventTypeSlug: 'meeting',
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-02T00:00:00Z',
        timeZone: 'UTC',
      });

      expect(result).toEqual(mockResponse);
    });

    it('should call getSlotsByEventTypeId when eventTypeId provided', async () => {
      const mockResponse = {
        slots: {
          '2025-01-01': [{ time: '14:00:00', attendees: 0 }],
        },
      };

      mockCalcomClient.getSlotsByEventTypeId.mockResolvedValue(mockResponse);

      const input = {
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-02T00:00:00Z',
        eventTypeId: 123,
        timeZone: 'UTC',
      };

      const result = await calcomService.getAvailableSlots(input);

      expect(mockCalcomClient.getSlotsByEventTypeId).toHaveBeenCalledWith({
        eventTypeId: 123,
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-02T00:00:00Z',
        timeZone: 'UTC',
      });

      expect(result).toEqual(mockResponse);
    });

    it('should throw error when neither username/eventTypeSlug nor eventTypeId provided', async () => {
      const input = {
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-02T00:00:00Z',
      };

      await expect(calcomService.getAvailableSlots(input)).rejects.toThrow(
        'Either username/eventTypeSlug or eventTypeId must be provided'
      );
    });

    it('should use default timeZone when not provided', async () => {
      const mockResponse = { slots: {} };
      mockCalcomClient.getSlotsByEventTypeId.mockResolvedValue(mockResponse);

      const input = {
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-02T00:00:00Z',
        eventTypeId: 123,
      };

      await calcomService.getAvailableSlots(input);

      expect(mockCalcomClient.getSlotsByEventTypeId).toHaveBeenCalledWith({
        eventTypeId: 123,
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-02T00:00:00Z',
        timeZone: 'UTC',
      });
    });

    it('should validate input and throw error for invalid datetime', async () => {
      const input = {
        start: 'invalid-date',
        end: '2025-01-02T00:00:00Z',
        eventTypeId: 123,
      };

      await expect(calcomService.getAvailableSlots(input)).rejects.toThrow();
    });
  });
});
