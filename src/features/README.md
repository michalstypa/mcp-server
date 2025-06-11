# Feature System

This directory contains the standardized feature system for the MCP server. Features are modular components that extend the server's capabilities by providing MCP tools and functionality.

## Architecture

### Feature Interface

All features must implement the `Feature` interface:

```typescript
interface Feature {
  getInfo(): FeatureInfo;
  canLoad(): boolean;
  register(server: McpServer): Promise<FeatureRegistrationResult> | FeatureRegistrationResult;
  cleanup?(): Promise<void> | void;
}
```

### Feature Registry

The `FeatureRegistry` manages all features and provides:
- Automatic feature discovery and registration
- Configuration validation
- Error handling and reporting
- Cleanup management

## Creating a New Feature

### 1. Create Feature Directory

```
src/features/my-feature/
├── index.ts              # Feature exports
├── my-feature.feature.ts # Feature implementation
├── my-feature.config.ts  # Configuration handling
├── my-feature.service.ts # Business logic
├── my-feature.types.ts   # Type definitions
└── my-feature.test.ts    # Tests
```

### 2. Implement Feature Class

```typescript
// my-feature.feature.ts
import { Feature, FeatureInfo, FeatureRegistrationResult } from '../../infra/features.js';

export class MyFeature implements Feature {
  getInfo(): FeatureInfo {
    return {
      name: 'My Feature',
      description: 'Description of what this feature does',
      version: '1.0.0',
      enabled: true,
    };
  }

  canLoad(): boolean {
    // Check if required configuration/dependencies are available
    return process.env.MY_FEATURE_API_KEY !== undefined;
  }

  register(server: McpServer): FeatureRegistrationResult {
    try {
      // Register your MCP tools here
      server.tool('MY_TOOL', 'Tool description', schema, handler);

      return {
        success: true,
        toolsRegistered: ['MY_TOOL'],
        info: this.getInfo(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        info: this.getInfo(),
      };
    }
  }

  async cleanup(): Promise<void> {
    // Optional: cleanup resources when feature is unloaded
  }
}

export const myFeature = new MyFeature();
```

### 3. Export from Feature Index

```typescript
// index.ts
export { myFeature, MyFeature } from './my-feature.feature.js';
export { myService } from './my-feature.service.js';
export * from './my-feature.types.js';
```

### 4. Register in Feature Registry

```typescript
// src/features/index.ts
import { myFeature } from './my-feature/index.js';

export function initializeFeatures(): void {
  featureRegistry.addFeature(calcomFeature);
  featureRegistry.addFeature(myFeature); // Add your feature here
}
```

## Configuration Pattern

Features should handle their own configuration:

```typescript
// my-feature.config.ts
import { z } from 'zod';

const MyFeatureConfigSchema = z.object({
  API_KEY: z.string().min(1),
  API_BASE: z.string().url().default('https://api.example.com'),
});

export type MyFeatureConfig = z.infer<typeof MyFeatureConfigSchema>;

export function canLoadMyFeature(): boolean {
  return process.env.MY_FEATURE_API_KEY !== undefined;
}

export function loadMyFeatureConfig(): MyFeatureConfig {
  const config = {
    API_KEY: process.env.MY_FEATURE_API_KEY,
    API_BASE: process.env.MY_FEATURE_API_BASE,
  };

  try {
    return MyFeatureConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`My Feature configuration error: ${issues}`);
    }
    throw error;
  }
}
```

## Testing Features

Create comprehensive tests for your feature:

```typescript
// my-feature.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MyFeature } from './my-feature.feature.js';

describe('MyFeature', () => {
  let feature: MyFeature;
  let mockServer: McpServer;

  beforeEach(() => {
    feature = new MyFeature();
    mockServer = new McpServer({ name: 'test', version: '1.0.0' });
    vi.stubEnv('MY_FEATURE_API_KEY', 'test-key');
  });

  it('should provide correct feature info', () => {
    const info = feature.getInfo();
    expect(info.name).toBe('My Feature');
    expect(info.version).toBe('1.0.0');
  });

  it('should register successfully when config is available', () => {
    const result = feature.register(mockServer);
    expect(result.success).toBe(true);
    expect(result.toolsRegistered).toContain('MY_TOOL');
  });
});
```

## Benefits

- **Consistency**: All features follow the same pattern
- **Modularity**: Features are self-contained and independent
- **Configuration**: Each feature manages its own config validation
- **Error Handling**: Standardized error reporting and handling
- **Testing**: Uniform testing patterns across features
- **Discovery**: Automatic feature discovery and registration
- **Monitoring**: Built-in feature status monitoring

## Example: Cal.com Feature

See `src/features/calcom/` for a complete example of the standardized feature pattern. 