# Cal.com Feature

This feature integrates with the Cal.com API to provide meeting slot availability functionality.

## Available MCP Tools

### `GET_EVENT_TYPES`
Gets all available Cal.com event types.

**Parameters:** None

**Usage:**
```typescript
// Get available event types
const eventTypes = await GET_EVENT_TYPES();
```

**Response:**
```json
{
  "eventTypes": [
    {
      "id": 123,
      "title": "Quick Chat",
      "slug": "quick-chat",
      "length": 15,
      "hidden": false,
      "position": 0,
      "userId": 456
    },
    {
      "id": 124,
      "title": "Strategy Session",
      "slug": "strategy-session", 
      "length": 60,
      "hidden": false,
      "position": 1,
      "userId": 456,
      "requiresConfirmation": true
    }
  ],
  "message": "Available Cal.com event types"
}
```

### `GET_AVAILABLE_SLOTS`
Gets available slots for a specific event type by ID.

**Parameters:**
- `eventTypeId` (number): The ID of the event type
- `start` (string): Start date in ISO 8601 format
- `end` (string): End date in ISO 8601 format  
- `timeZone` (string, optional): Timezone (defaults to UTC)

**Usage:**
```typescript
// Get slots for a specific event type
const slots = await GET_AVAILABLE_SLOTS({
  eventTypeId: 123,
  start: "2024-01-01T00:00:00Z",
  end: "2024-01-07T23:59:59Z",
  timeZone: "America/New_York"
});
```

**Response:**
```json
{
  "slots": {
    "slots": {
      "2024-01-01": [
        { "time": "2024-01-01T14:00:00Z" },
        { "time": "2024-01-01T15:00:00Z" }
      ],
      "2024-01-02": [
        { "time": "2024-01-02T09:00:00Z" },
        { "time": "2024-01-02T10:00:00Z" }
      ]
    }
  },
  "message": "Available meeting slots"
}
```

## Usage Example

Here's how to use the Cal.com feature:

### Step 1: Get Available Event Types
```typescript
const response = await GET_EVENT_TYPES();
```

### Step 2: Select Event Type and Get Slots
```typescript
const slots = await GET_AVAILABLE_SLOTS({
  eventTypeId: 123, // From previous response
  start: "2024-01-01T00:00:00Z",
  end: "2024-01-07T23:59:59Z",
  timeZone: "America/New_York"
});
```

## Configuration

Set the following environment variables:

```env
CALCOM_API_TOKEN=your_cal_com_api_token_here
CALCOM_API_BASE=https://api.cal.com  # Optional, defaults to this
```

For MCP usage, add these to your `.cursor/mcp.json` configuration:

```json
{
  "env": {
    "CALCOM_API_TOKEN": "your_token_here"
  }
}
```

## Direct Service Usage

If you need to use the service directly in code:

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