import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalcomService } from './calcom.service.js';

// Mock the CalcomClient
const mockGetEventTypes = vi.fn();
const mockGetSlots = vi.fn();

vi.mock('./calcom.client.js', () => ({
  CalcomClient: vi.fn(() => ({
    getEventTypes: mockGetEventTypes,
    getSlots: mockGetSlots,
  })),
}));

describe('CalcomService', () => {
  let service: CalcomService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalcomService();
  });

  describe('getEventTypes', () => {
    it('should fetch event types from client', async () => {
      const mockEventTypes = [
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

      mockGetEventTypes.mockResolvedValue(mockEventTypes);

      const result = await service.getEventTypes();

      expect(result).toEqual(mockEventTypes);
      expect(mockGetEventTypes).toHaveBeenCalledOnce();
    });
  });

  describe('getAvailableSlots', () => {
    it('should fetch slots using event type ID', async () => {
      const mockInput = {
        eventTypeId: 123,
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
        timeZone: 'UTC',
      };

      const mockSlots = {
        slots: {
          '2024-01-01': [{ time: '2024-01-01T10:00:00Z' }],
        },
      };

      mockGetSlots.mockResolvedValue(mockSlots);

      const result = await service.getAvailableSlots(mockInput);

      expect(result).toEqual(mockSlots);
      expect(mockGetSlots).toHaveBeenCalledWith({
        eventTypeId: 123,
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
        timeZone: 'UTC',
      });
    });

    it('should throw error when eventTypeId is missing', async () => {
      const mockInput = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
        timeZone: 'UTC',
      };

      // This should fail at validation level due to missing eventTypeId
      await expect(
        service.getAvailableSlots(mockInput as any)
      ).rejects.toThrow();
    });
  });
});
