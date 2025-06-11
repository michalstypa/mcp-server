import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalcomService } from './calcom.service.js';

// Mock the CalcomClient
const mockGetEventTypeOptions = vi.fn();
const mockGetSlotsForEventType = vi.fn();
const mockGetSlotsByUsername = vi.fn();
const mockGetSlotsByEventTypeId = vi.fn();

vi.mock('./calcom.client.js', () => ({
  CalcomClient: vi.fn().mockImplementation(() => ({
    getEventTypeOptions: mockGetEventTypeOptions,
    getSlotsForEventType: mockGetSlotsForEventType,
    getSlotsByUsername: mockGetSlotsByUsername,
    getSlotsByEventTypeId: mockGetSlotsByEventTypeId,
  })),
}));

describe('CalcomService', () => {
  let service: CalcomService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalcomService();
  });

  describe('Conversational Flow Methods', () => {
    it('should get event type options', async () => {
      const mockEventTypes = [
        {
          id: 1,
          title: 'Quick Chat',
          description: '15 min meeting',
          duration: '15 min',
        },
        {
          id: 2,
          title: 'Strategy Session',
          description: '1 hour meeting • requires confirmation',
          duration: '1 hour',
          requiresConfirmation: true,
        },
      ];

      mockGetEventTypeOptions.mockResolvedValue(mockEventTypes);

      const result = await service.getEventTypeOptions();

      expect(result).toEqual(mockEventTypes);
      expect(mockGetEventTypeOptions).toHaveBeenCalledOnce();
    });

    it('should get slots for event type', async () => {
      const mockInput = {
        eventTypeId: 123,
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
        timeZone: 'UTC',
      };

      const mockResult = {
        eventType: {
          id: 123,
          title: 'Quick Chat',
          length: 15,
        },
        slots: {
          slots: {
            '2024-01-01': [{ time: '09:00:00' }, { time: '10:00:00' }],
          },
        },
      };

      mockGetSlotsForEventType.mockResolvedValue(mockResult);

      const result = await service.getSlotsForEventType(mockInput);

      expect(result).toEqual(mockResult);
      expect(mockGetSlotsForEventType).toHaveBeenCalledWith(
        123,
        '2024-01-01T00:00:00Z',
        '2024-01-07T23:59:59Z',
        'UTC'
      );
    });

    it('should use default timezone when not provided', async () => {
      const mockInput = {
        eventTypeId: 123,
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
      };

      const mockResult = {
        eventType: { id: 123, title: 'Test' },
        slots: { slots: {} },
      };

      mockGetSlotsForEventType.mockResolvedValue(mockResult);

      await service.getSlotsForEventType(mockInput);

      expect(mockGetSlotsForEventType).toHaveBeenCalledWith(
        123,
        '2024-01-01T00:00:00Z',
        '2024-01-07T23:59:59Z',
        'UTC' // Should default to UTC
      );
    });
  });

  describe('Legacy Methods', () => {
    it('should get available slots by username and slug', async () => {
      const mockInput = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
        username: 'testuser',
        eventTypeSlug: 'quick-chat',
        timeZone: 'UTC',
      };

      const mockSlots = {
        slots: {
          '2024-01-01': [{ time: '09:00:00' }],
        },
      };

      mockGetSlotsByUsername.mockResolvedValue(mockSlots);

      const result = await service.getAvailableSlots(mockInput);

      expect(result).toEqual(mockSlots);
      expect(mockGetSlotsByUsername).toHaveBeenCalledWith({
        username: 'testuser',
        eventTypeSlug: 'quick-chat',
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
        timeZone: 'UTC',
      });
    });

    it('should get available slots by event type ID', async () => {
      const mockInput = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
        eventTypeId: 123,
        timeZone: 'UTC',
      };

      const mockSlots = {
        slots: {
          '2024-01-01': [{ time: '09:00:00' }],
        },
      };

      mockGetSlotsByEventTypeId.mockResolvedValue(mockSlots);

      const result = await service.getAvailableSlots(mockInput);

      expect(result).toEqual(mockSlots);
      expect(mockGetSlotsByEventTypeId).toHaveBeenCalledWith({
        eventTypeId: 123,
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
        timeZone: 'UTC',
      });
    });

    it('should throw error when neither username/slug nor eventTypeId provided', async () => {
      const mockInput = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
        timeZone: 'UTC',
      };

      await expect(service.getAvailableSlots(mockInput)).rejects.toThrow(
        'Either username/eventTypeSlug or eventTypeId must be provided'
      );
    });

    it('should use default timezone when not provided in legacy method', async () => {
      const mockInput = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
        eventTypeId: 123,
      };

      const mockSlots = { slots: {} };
      mockGetSlotsByEventTypeId.mockResolvedValue(mockSlots);

      await service.getAvailableSlots(mockInput);

      expect(mockGetSlotsByEventTypeId).toHaveBeenCalledWith({
        eventTypeId: 123,
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-07T23:59:59Z',
        timeZone: 'UTC', // Should default to UTC
      });
    });
  });
});
