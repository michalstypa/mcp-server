# Backtick MCP Server

A Model Context Protocol (MCP) server that provides integration capabilities for various services.

## Features

- **Demo Tools**: Basic testing and utility tools (ECHO, SYSTEM_INFO, RANDOM_UUID)
- **Cal.com Integration**: Get available meeting slots from Cal.com
- **Environment Variable Support**: Configurable via .env file
- **Multiple Transport Modes**: STDIO and HTTP support

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Server
```bash
npm run build
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Cal.com Integration Configuration
CALCOM_API_TOKEN=your_calcom_api_token_here
CALCOM_API_BASE=https://api.cal.com
```

### 4. Run the Server
```bash
# STDIO mode (default)
npm start

# HTTP mode
npm start -- --http --port=3000
```

## Claude Desktop Integration

To use this MCP server with Claude Desktop on Mac:

### 1. Configure Claude Desktop
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "backtick-mcp-server": {
      "command": "node",
      "args": ["/path/to/your/project/dist/index.js"],
      "env": {
        "CALCOM_API_TOKEN": "your_calcom_api_token_here",
        "CALCOM_API_BASE": "https://api.cal.com"
      }
    }
  }
}
```

Replace `/path/to/your/project` with your actual project path.

### 2. Restart Claude Desktop
Completely quit and restart the Claude Desktop application to load the new configuration.

### 3. Available Tools
Once configured, Claude will have access to:
- **ECHO**: Test message formatting with optional uppercase and prefix
- **SYSTEM_INFO**: Get server system information
- **RANDOM_UUID**: Generate random UUIDs (1-10 at a time)
- **GET_AVAILABLE_SLOTS**: Get Cal.com meeting availability

## Development

### Scripts
- `npm run build` - Build TypeScript to JavaScript
- `npm run dev` - Run in development mode with hot reload
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Project Structure
```
src/
├── features/           # Feature implementations
│   ├── demo/          # Demo tools (no external dependencies)
│   └── calcom/        # Cal.com integration
├── infra/             # Infrastructure (config, logging, features)
└── index.ts           # Main entry point
```

## License

UNLICENSED
