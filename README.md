# Backtick MCP Server

A minimal yet extensible MCP server that provides calendar availability functionality through Cal.com API integration.

## Features

- **GET_AVAILABLE_SLOTS**: Retrieve available meeting slots from Cal.com
- **Dual Transport**: Supports both STDIO (NDJSON) and HTTP (chunked response) protocols
- **Production Ready**: Docker support, structured logging, and Prometheus metrics
- **Type Safe**: Written in TypeScript with strict mode enabled

## Quick Start

### Prerequisites

- Node.js 20+
- Cal.com API token

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```bash
CALCOM_API_TOKEN=your_cal_com_api_token_here
PORT=8080
LOG_LEVEL=info
CALCOM_API_BASE=https://api.cal.com
```

### Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Usage

#### STDIO Mode

```bash
echo '{"id":"123","type":"GET_AVAILABLE_SLOTS","payload":{"start":"2025-06-12T00:00:00Z","end":"2025-06-13T00:00:00Z"}}' | npm run dev -- stdio
```

#### HTTP Mode

```bash
# Start HTTP server
npm run dev -- http

# Query available slots
curl "http://localhost:8080/slots?start=2025-06-12T00:00:00Z&end=2025-06-13T00:00:00Z"
```

## Docker

```bash
# Build and run with docker-compose
docker-compose up

# Or build manually
docker build -t backtick-mcp-server .
docker run -e CALCOM_API_TOKEN=your_token backtick-mcp-server
```

## API Reference

### STDIO Protocol

Request format:
```json
{
  "id": "unique-request-id",
  "type": "GET_AVAILABLE_SLOTS",
  "payload": {
    "start": "2025-06-12T00:00:00Z",
    "end": "2025-06-13T00:00:00Z"
  }
}
```

Response format:
```json
{
  "id": "unique-request-id",
  "ok": true,
  "payload": [
    {
      "start": "2025-06-12T10:00:00Z",
      "end": "2025-06-12T11:00:00Z"
    }
  ]
}
```

### HTTP API

- `GET /slots?start=<ISO8601>&end=<ISO8601>` - Get available slots
- `GET /metrics` - Prometheus metrics
- `GET /health` - Health check

## Architecture

```
src/
├── features/
│   └── availability/
│       ├── availability.controller.ts
│       ├── availability.service.ts
│       ├── availability.mapper.ts
│       ├── availability.test.ts
│       └── index.ts
├── infra/
│   ├── calcom/
│   │   └── calcom.client.ts
│   ├── transport/
│   │   ├── http.server.ts
│   │   └── stdio.server.ts
│   ├── logger.ts
│   ├── metrics.ts
│   └── config.ts
├── app.ts
└── index.ts
```

## License

UNLICENSED
