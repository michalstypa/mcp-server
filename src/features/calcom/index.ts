// Export the main feature
export { calcomFeature } from './calcom.feature.js';

// Export the service for direct usage if needed
export { calcomService } from './calcom.service.js';

// Export client types and interfaces
export type {
  CalcomEventType,
  CalcomSlotsResponse,
  GetSlotsParams,
} from './calcom.client.js';

// Export service types
export type {
  GetSlotsInput,
  CalcomSlot,
  FormattedSlotData,
} from './calcom.types.js';
