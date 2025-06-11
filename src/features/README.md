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

## MCP Capabilities

Features can register four types of MCP capabilities:

### 1. Tools (Model-controlled)
Functions that AI models can call to perform actions. These are **model-controlled**, meaning the AI decides when to invoke them.

**Use cases:**
- API integrations (GitHub, Slack, etc.)
- System operations (file management, command execution)
- Data processing and analysis
- External service interactions

**Example:**
```typescript
server.tool('fetch_weather', 'Get weather for a location', {
  location: z.string().describe('City name')
}, async ({ location }) => {
  const weather = await weatherAPI.get(location);
  return { content: [{ type: 'text', text: JSON.stringify(weather) }] };
});
```

### 2. Resources (Application-controlled)
Data sources that provide context to AI models. These are **application-controlled**, meaning the host application decides when to include them.

**Use cases:**
- File system access
- Database schemas and data
- Configuration files
- Documentation and knowledge bases
- API schemas and specifications

**Example:**
```typescript
server.resource('file://project/{path}', 'Access project files', {
  path: z.string().describe('File path within project')
}, async ({ path }) => {
  const content = await fs.readFile(path, 'utf-8');
  return {
    contents: [{
      uri: `file://project/${path}`,
      mimeType: 'text/plain',
      text: content
    }]
  };
});
```

### 3. Prompts (User-controlled)
Pre-defined templates that users can invoke. These are **user-controlled**, meaning users explicitly select and use them.

**Use cases:**
- Code review templates
- Documentation generation prompts
- Analysis frameworks
- Common query patterns
- Workflow templates

**Example:**
```typescript
server.prompt('code-review', 'Review code for best practices', {
  language: z.string().describe('Programming language'),
  code: z.string().describe('Code to review')
}, async ({ language, code }) => {
  return {
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Please review this ${language} code for best practices, security issues, and potential improvements:\n\n${code}`
      }
    }]
  };
});
```

### 4. Notifications (Server-initiated)
Messages sent from server to client to notify about events or status changes.

**Use cases:**
- Status updates
- Progress notifications
- Error alerts
- Resource change notifications
- Feature lifecycle events

**Example:**
```typescript
// Send notification when feature loads
server.notification('feature/loaded', {
  feature: 'My Feature',
  version: '1.0.0',
  timestamp: new Date().toISOString()
});

// Send progress updates
server.notification('task/progress', {
  taskId: 'task-123',
  progress: 50,
  message: 'Processing data...'
});
```

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
import { z } from 'zod';

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
      const toolsRegistered: string[] = [];
      const resourcesRegistered: string[] = [];
      const promptsRegistered: string[] = [];
      const notificationsRegistered: string[] = [];

      // Register tools (function calls)
      server.tool('MY_TOOL', 'Tool description', schema, handler);
      toolsRegistered.push('MY_TOOL');

      // Register resources (data sources)
      server.resource('my-resource://data/{id}', 'Resource description', {
        id: z.string().describe('Resource ID')
      }, async ({ id }) => {
        return {
          contents: [{
            uri: `my-resource://data/${id}`,
            mimeType: 'application/json',
            text: JSON.stringify({ id, data: 'example' })
          }]
        };
      });
      resourcesRegistered.push('my-resource://data/{id}');

      // Register prompts (templates)
      server.prompt('my-prompt', 'Prompt description', {
        param: z.string().describe('Prompt parameter')
      }, async ({ param }) => {
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Use this parameter: ${param}`
            }
          }]
        };
      });
      promptsRegistered.push('my-prompt');

      // Send notifications (optional)
      server.notification('my-feature/status', { status: 'loaded' });
      notificationsRegistered.push('my-feature/status');

      return {
        success: true,
        toolsRegistered,
        resourcesRegistered,
        promptsRegistered,
        notificationsRegistered,
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
- **Full MCP Support**: Features can register tools, resources, prompts, and notifications

## Complete Example: Multi-Capability Feature

Here's a comprehensive example showing a feature that uses all MCP capabilities:

```typescript
// github.feature.ts
import { Feature, FeatureInfo, FeatureRegistrationResult } from '../../infra/features.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export class GitHubFeature implements Feature {
  getInfo(): FeatureInfo {
    return {
      name: 'GitHub Integration',
      description: 'Provides GitHub repository access, issue management, and code review capabilities',
      version: '1.0.0',
      enabled: true,
    };
  }

  canLoad(): boolean {
    return process.env.GITHUB_TOKEN !== undefined;
  }

  register(server: McpServer): FeatureRegistrationResult {
    try {
      const toolsRegistered: string[] = [];
      const resourcesRegistered: string[] = [];
      const promptsRegistered: string[] = [];
      const notificationsRegistered: string[] = [];

      // 1. TOOLS - Actions the AI can perform
      server.tool('create_github_issue', 'Create a new GitHub issue', {
        repo: z.string().describe('Repository name (owner/repo)'),
        title: z.string().describe('Issue title'),
        body: z.string().describe('Issue description'),
        labels: z.array(z.string()).optional().describe('Issue labels')
      }, async ({ repo, title, body, labels }) => {
        const issue = await this.githubAPI.createIssue(repo, { title, body, labels });
        
        // Send notification about the created issue
        server.notification('github/issue_created', {
          repo,
          issueNumber: issue.number,
          url: issue.html_url
        });

        return {
          content: [{
            type: 'text',
            text: `Created issue #${issue.number}: ${issue.html_url}`
          }]
        };
      });
      toolsRegistered.push('create_github_issue');

      server.tool('search_code', 'Search for code in GitHub repositories', {
        query: z.string().describe('Search query'),
        repo: z.string().optional().describe('Specific repository to search')
      }, async ({ query, repo }) => {
        const results = await this.githubAPI.searchCode(query, repo);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }]
        };
      });
      toolsRegistered.push('search_code');

      // 2. RESOURCES - Data the AI can access
      server.resource('github://repo/{owner}/{repo}/README', 'Access repository README', {
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name')
      }, async ({ owner, repo }) => {
        const readme = await this.githubAPI.getReadme(owner, repo);
        return {
          contents: [{
            uri: `github://repo/${owner}/${repo}/README`,
            mimeType: 'text/markdown',
            text: readme.content
          }]
        };
      });
      resourcesRegistered.push('github://repo/{owner}/{repo}/README');

      server.resource('github://repo/{owner}/{repo}/issues', 'List repository issues', {
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        state: z.enum(['open', 'closed', 'all']).default('open').describe('Issue state')
      }, async ({ owner, repo, state }) => {
        const issues = await this.githubAPI.getIssues(owner, repo, state);
        return {
          contents: [{
            uri: `github://repo/${owner}/${repo}/issues`,
            mimeType: 'application/json',
            text: JSON.stringify(issues, null, 2)
          }]
        };
      });
      resourcesRegistered.push('github://repo/{owner}/{repo}/issues');

      // 3. PROMPTS - Templates users can invoke
      server.prompt('github-code-review', 'Perform a comprehensive code review', {
        pullRequestUrl: z.string().describe('GitHub pull request URL'),
        focusAreas: z.array(z.string()).optional().describe('Specific areas to focus on')
      }, async ({ pullRequestUrl, focusAreas }) => {
        const prData = await this.githubAPI.getPullRequest(pullRequestUrl);
        const focus = focusAreas?.length ? focusAreas.join(', ') : 'general best practices';
        
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please review this GitHub pull request focusing on ${focus}:\n\n` +
                   `**PR Title:** ${prData.title}\n` +
                   `**Description:** ${prData.body}\n\n` +
                   `**Files Changed:**\n${prData.files.map(f => `- ${f.filename}`).join('\n')}\n\n` +
                   `Please provide feedback on code quality, security, performance, and maintainability.`
            }
          }]
        };
      });
      promptsRegistered.push('github-code-review');

      server.prompt('github-issue-template', 'Create a well-structured GitHub issue', {
        type: z.enum(['bug', 'feature', 'documentation']).describe('Type of issue'),
        title: z.string().describe('Brief issue title')
      }, async ({ type, title }) => {
        const templates = {
          bug: `## Bug Report\n\n**Description:** ${title}\n\n**Steps to Reproduce:**\n1. \n2. \n3. \n\n**Expected Behavior:**\n\n**Actual Behavior:**\n\n**Environment:**\n- OS: \n- Browser: \n- Version: `,
          feature: `## Feature Request\n\n**Title:** ${title}\n\n**Problem Statement:**\n\n**Proposed Solution:**\n\n**Alternatives Considered:**\n\n**Additional Context:**`,
          documentation: `## Documentation Issue\n\n**Title:** ${title}\n\n**Section Affected:**\n\n**Current State:**\n\n**Proposed Changes:**\n\n**Reason for Change:**`
        };

        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please help me create a ${type} issue with this template:\n\n${templates[type]}`
            }
          }]
        };
      });
      promptsRegistered.push('github-issue-template');

      // 4. NOTIFICATIONS - Status updates
      server.notification('github/feature_loaded', {
        feature: 'GitHub Integration',
        capabilities: ['issues', 'code_search', 'pull_requests'],
        timestamp: new Date().toISOString()
      });
      notificationsRegistered.push('github/feature_loaded');

      return {
        success: true,
        toolsRegistered,
        resourcesRegistered,
        promptsRegistered,
        notificationsRegistered,
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

  private githubAPI = {
    // Mock GitHub API methods for example
    async createIssue(repo: string, issue: any) { return { number: 123, html_url: 'https://github.com/...' }; },
    async searchCode(query: string, repo?: string) { return []; },
    async getReadme(owner: string, repo: string) { return { content: '# README' }; },
    async getIssues(owner: string, repo: string, state: string) { return []; },
    async getPullRequest(url: string) { return { title: '', body: '', files: [] }; }
  };
}
```

This example demonstrates:
- **Tools**: Interactive functions (create issues, search code)
- **Resources**: Data access (README, issues list)  
- **Prompts**: User workflows (code review, issue templates)
- **Notifications**: Status updates (feature loaded, issue created)

## Example: Cal.com Feature

See `src/features/calcom/` for a complete example of the standardized feature pattern. 