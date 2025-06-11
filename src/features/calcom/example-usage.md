# Cal.com Conversational Flow Example

This example demonstrates how the enhanced Cal.com client works with the new conversational flow.

## Scenario: LLM helping a user schedule a meeting

### Step 1: User asks for meeting availability
**User:** "What meeting slots are available this week?"

### Step 2: LLM gets available meeting types
```javascript
// LLM calls the GET_EVENT_TYPE_OPTIONS MCP tool
const response = await mcp.callTool('GET_EVENT_TYPE_OPTIONS', {});

// Response:
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
    },
    {
      "id": 125,
      "title": "Consultation Call",
      "description": "30 min meeting • team meeting • $50",
      "duration": "30 min"
    }
  ],
  "message": "Available meeting types. Ask the user which type they prefer."
}
```

### Step 3: LLM presents options to user
**LLM:** "I found several meeting types available:

1. **Quick Chat** - 15 min meeting
2. **Strategy Session** - 1 hour meeting • requires confirmation  
3. **Consultation Call** - 30 min meeting • team meeting • $50

Which type of meeting would you like to schedule?"

### Step 4: User selects meeting type
**User:** "I'd like the Strategy Session"

### Step 5: LLM gets slots for selected meeting type
```javascript
// LLM calls the GET_SLOTS_FOR_EVENT_TYPE MCP tool
const response = await mcp.callTool('GET_SLOTS_FOR_EVENT_TYPE', {
  eventTypeId: 124, // Strategy Session ID from step 2
  start: "2024-01-01T00:00:00Z",
  end: "2024-01-07T23:59:59Z",
  timeZone: "America/New_York"
});

// Response:
{
  "eventType": {
    "id": 124,
    "title": "Strategy Session",
    "length": 60,
    "slug": "strategy-session",
    "requiresConfirmation": true
  },
  "slots": {
    "slots": {
      "2024-01-01": [
        { "time": "09:00:00" },
        { "time": "14:00:00" }
      ],
      "2024-01-03": [
        { "time": "10:00:00" },
        { "time": "15:00:00" }
      ]
    }
  },
  "message": "Available slots for \"Strategy Session\" (60 minutes)"
}
```

### Step 6: LLM presents available time slots
**LLM:** "Here are the available Strategy Session slots (1 hour) for this week:

**Monday, January 1st:**
- 9:00 AM EST
- 2:00 PM EST

**Wednesday, January 3rd:**
- 10:00 AM EST
- 3:00 PM EST

Please note: This meeting requires confirmation before it's finalized.

Which time works best for you?"

## Benefits of this approach:

1. **Natural conversation flow** - No need for user to know Cal.com specifics
2. **Discovery-based** - LLM learns about available meeting types dynamically
3. **Rich context** - Both event type details and slots are returned together
4. **Error handling** - Clear validation and helpful error messages
5. **Flexible** - Works with any Cal.com setup without prior configuration

## Direct service usage (for developers):

```typescript
import { calcomService } from './features/calcom/index.js';

// Get all available meeting types
const eventTypes = await calcomService.getEventTypeOptions();
console.log('Available meeting types:', eventTypes);

// Get slots for a specific event type
const result = await calcomService.getSlotsForEventType({
  eventTypeId: 123,
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-07T23:59:59Z',
  timeZone: 'America/New_York'
});

console.log('Event type:', result.eventType);
console.log('Available slots:', result.slots);
``` 