# Cal.com Feature

This feature integrates with the Cal.com API to provide meeting slot availability functionality. It supports both a legacy direct approach and a new conversational flow designed for better user experience with LLMs.

## Available MCP Tools

### Conversational Flow (Recommended)

The conversational flow provides a better user experience by first showing available meeting types, then allowing users to select one and get slots for it.

#### 1. `GET_EVENT_TYPE_OPTIONS`
Gets all available meeting types for user selection.

**Parameters:** None

**Usage:**
```typescript
// Step 1: LLM calls this when user asks "What meeting slots are available?"
const eventTypes = await GET_EVENT_TYPE_OPTIONS();
```

**Response:**
```json
{
  "eventTypes": [
    {
      "id": 123,
      "title": "Quick Chat",
      "description": "15 min meeting",
      "duration": "15 min"
    },
    {
      "id": 124,
      "title": "Strategy Session", 
      "description": "1 hour meeting • requires confirmation",
      "duration": "1 hour",
      "requiresConfirmation": true
    }
  ],
  "message": "Available meeting types. Ask the user which type they prefer."
}
```

#### 2. `GET_SLOTS_FOR_EVENT_TYPE`
Gets available slots for a specific event type by ID.

**Parameters:**
- `eventTypeId` (number): The ID of the selected event type
- `start` (string): Start date in ISO 8601 format
- `end` (string): End date in ISO 8601 format  
- `timeZone` (string, optional): Timezone (defaults to UTC)

**Usage:**
```typescript
// Step 2: After user selects meeting type, LLM calls this
const slots = await GET_SLOTS_FOR_EVENT_TYPE({
  eventTypeId: 123,
  start: "2024-01-01T00:00:00Z",
  end: "2024-01-07T23:59:59Z",
  timeZone: "America/New_York"
});
```

**Response:**
```json
{
  "eventType": {
    "id": 123,
    "title": "Quick Chat",
    "length": 15,
    "slug": "quick-chat"
  },
  "slots": {
    "slots": {
      "2024-01-01": [
        { "time": "09:00:00" },
        { "time": "10:00:00" }
      ]
    }
  },
  "message": "Available slots for \"Quick Chat\" (15 minutes)"
}
```

### Legacy Method

#### `GET_AVAILABLE_SLOTS`
Direct slot retrieval (requires prior knowledge of event type details).

**Parameters:**
- `start` (string): Start date in ISO 8601 format
- `end` (string): End date in ISO 8601 format
- `username` (string, optional): Cal.com username
- `eventTypeSlug` (string, optional): Event type slug
- `eventTypeId` (number, optional): Event type ID
- `timeZone` (string, optional): Timezone (defaults to UTC)

**Note:** Either `username`+`eventTypeSlug` OR `eventTypeId` must be provided.

## Conversational Flow Example

Here's how the conversational flow works in practice:

### Step 1: User Request
**User:** "What meeting slots are available this week?"

### Step 2: LLM Gets Event Types
```typescript
const response = await GET_EVENT_TYPE_OPTIONS();
```

### Step 3: LLM Presents Options
**LLM:** "I found several meeting types available:

1. **Quick Chat** - 15 min meeting
2. **Strategy Session** - 1 hour meeting • requires confirmation  
3. **Consultation Call** - 30 min meeting • team meeting • $50

Which type of meeting would you like to schedule?"

### Step 4: User Selects
**User:** "I'd like the Strategy Session"

### Step 5: LLM Gets Slots
```typescript
const slots = await GET_SLOTS_FOR_EVENT_TYPE({
  eventTypeId: 124, // Strategy Session ID
  start: "2024-01-01T00:00:00Z",
  end: "2024-01-07T23:59:59Z",
  timeZone: "America/New_York"
});
```

### Step 6: LLM Shows Available Times
**LLM:** "Here are the available Strategy Session slots (1 hour) for this week:

**Monday, Jan 1st:**
- 9:00 AM
- 2:00 PM

**Wednesday, Jan 3rd:**
- 10:00 AM
- 3:00 PM

Which time works best for you?"

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

## Benefits of Conversational Flow

1. **No Prior Knowledge Required:** LLM doesn't need to know specific event type IDs or slugs
2. **Better User Experience:** Natural conversation flow with clear options
3. **Automatic Discovery:** Dynamically discovers available meeting types  
4. **Rich Context:** Returns both event type details and slots for better responses
5. **Error Handling:** Clear error messages and validation

## Direct Service Usage

If you need to use the service directly in code:

```typescript
import { calcomService } from './calcom/index.js';

// Get event type options
const eventTypes = await calcomService.getEventTypeOptions();

// Get slots for specific event type
const result = await calcomService.getSlotsForEventType({
  eventTypeId: 123,
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-07T23:59:59Z',
  timeZone: 'UTC'
});
``` 