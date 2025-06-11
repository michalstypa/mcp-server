# Cal.com Feature Usage Examples

## Multi-Step Meeting Booking Workflow

This Cal.com integration now provides a guided multi-step process for booking meetings using MCP prompts and resources.

### New Capabilities Added

1. **Prompts** - Guided conversation templates
2. **Resources** - Workflow documentation for the LLM
3. **Enhanced Tools** - Same GET_EVENT_TYPES and GET_AVAILABLE_SLOTS

### How the Multi-Step Flow Works

#### Step 1: User Requests Meeting
**User:** "I'd like to book a meeting"

**LLM Should:** Invoke the `MEETING_BOOKING_FLOW` prompt
```json
{
  "prompt": "MEETING_BOOKING_FLOW",
  "arguments": {
    "startDate": "2024-01-15T09:00:00Z",
    "endDate": "2024-01-19T17:00:00Z", 
    "timeZone": "America/New_York"
  }
}
```

**Result:** The prompt automatically:
- Fetches available event types
- Presents them in a user-friendly format
- Asks the user to select their preferred meeting type

#### Step 2: User Selects Meeting Type
**User:** "I want the 30-minute consultation" or "I'll take option 2"

**LLM Should:** Parse the selection to identify the event type ID, then use `GET_AVAILABLE_SLOTS`
```json
{
  "tool": "GET_AVAILABLE_SLOTS",
  "arguments": {
    "eventTypeId": 123,
    "start": "2024-01-15T09:00:00Z",
    "end": "2024-01-19T17:00:00Z",
    "timeZone": "America/New_York"
  }
}
```

#### Step 3: Present Available Slots
**LLM Should:** Show the available time slots in a user-friendly format

### If User Selection is Unclear

Use the `EVENT_TYPE_SELECTION` prompt to clarify:
```json
{
  "prompt": "EVENT_TYPE_SELECTION",
  "arguments": {
    "userInput": "I want something quick"
  }
}
```

### MCP Resource Available

The LLM can access workflow documentation at:
- **Resource URI:** `calcom://booking-workflow`
- **Purpose:** Provides detailed guidance on the multi-step booking process

## Traditional Direct Tool Usage (Still Available)

### Get Event Types
```bash
# Via MCP tool
GET_EVENT_TYPES
```

### Get Available Slots  
```bash
# Via MCP tool  
GET_AVAILABLE_SLOTS
{
  "eventTypeId": 123,
  "start": "2024-01-15T09:00:00Z", 
  "end": "2024-01-19T17:00:00Z",
  "timeZone": "America/New_York"
}
```

## Key Benefits of the New Approach

1. **Guided Experience:** Prompts create a natural conversation flow
2. **Context Awareness:** Resources provide the LLM with workflow knowledge
3. **Error Prevention:** Built-in validation and clear error messages
4. **Flexibility:** Supports various user input styles and preferences
5. **Fallback Options:** Traditional tool usage still available

## Implementation Notes

- Event type IDs are extracted from the GET_EVENT_TYPES response
- User selections are parsed flexibly (numbers, titles, partial matches)
- The workflow handles missing or invalid inputs gracefully
- Timezone handling is built into the flow

This creates a much more natural and user-friendly meeting booking experience compared to requiring users to know event type IDs upfront.

## Direct Service Usage

If you need to use the service directly in your code:

```typescript
import { calcomService } from './calcom/index.js';

// Get event types
const eventTypes = await calcomService.getEventTypes();

// Get slots for specific event type  
const slots = await calcomService.getAvailableSlots({
  eventTypeId: 123,
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-07T23:59:59Z',
  timeZone: 'UTC'
});
```

## Error Handling

```typescript
try {
  const eventTypes = await GET_EVENT_TYPES();
  console.log('Event types:', eventTypes);
} catch (error) {
  console.error('Failed to get event types:', error);
}

try {
  const slots = await GET_AVAILABLE_SLOTS({
    eventTypeId: 123,
    start: "2024-01-01T00:00:00Z",
    end: "2024-01-07T23:59:59Z",
    timeZone: "UTC"
  });
  console.log('Available slots:', slots);
} catch (error) {
  console.error('Failed to get slots:', error);
} 