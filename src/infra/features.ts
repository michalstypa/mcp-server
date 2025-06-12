import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createFeatureLogger } from './logger.js';

export interface FeatureInfo {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

export interface FeatureRegistrationResult {
  success: boolean;
  error?: string;
  toolsRegistered?: string[];
  resourcesRegistered?: string[];
  promptsRegistered?: string[];
  notificationsRegistered?: string[];
  info?: FeatureInfo;
}

export interface Feature {
  getInfo(): FeatureInfo;
  canLoad(): boolean;
  register(server: McpServer): Promise<FeatureRegistrationResult> | FeatureRegistrationResult;
  cleanup?(): Promise<void> | void;
}

export class FeatureRegistry {
  private features = new Map<string, Feature>();
  private registeredFeatures = new Map<string, FeatureRegistrationResult>();
  private logger = createFeatureLogger('registry');

  addFeature(feature: Feature): void {
    const info = feature.getInfo();
    this.features.set(info.name, feature);
  }

  getFeatures(): Feature[] {
    return Array.from(this.features.values());
  }

  getFeature(name: string): Feature | undefined {
    return this.features.get(name);
  }

  async registerAllFeatures(server: McpServer): Promise<FeatureRegistrationResult[]> {
    const results: FeatureRegistrationResult[] = [];

    for (const feature of this.features.values()) {
      const info = feature.getInfo();

      try {
        if (!feature.canLoad()) {
          const result: FeatureRegistrationResult = {
            success: false,
            error: `Feature ${info.name} cannot be loaded (missing configuration or dependencies)`,
            info,
          };
          results.push(result);
          this.registeredFeatures.set(info.name, result);
          continue;
        }

        const result = await feature.register(server);
        results.push(result);
        this.registeredFeatures.set(info.name, result);

        if (result.success) {
          const capabilities: string[] = [];
          if (result.toolsRegistered?.length) {
            capabilities.push(`Tools: ${result.toolsRegistered.join(', ')}`);
          }
          if (result.resourcesRegistered?.length) {
            capabilities.push(`Resources: ${result.resourcesRegistered.join(', ')}`);
          }
          if (result.promptsRegistered?.length) {
            capabilities.push(`Prompts: ${result.promptsRegistered.join(', ')}`);
          }
          if (result.notificationsRegistered?.length) {
            capabilities.push(`Notifications: ${result.notificationsRegistered.join(', ')}`);
          }

          this.logger.info(
            `✅ Feature ${info.name} (v${info.version}) loaded successfully` +
              (capabilities.length ? ` - ${capabilities.join(' | ')}` : '')
          );
        } else {
          this.logger.error(`❌ Feature ${info.name} failed to load: ${result.error}`);
        }
      } catch (error) {
        const result: FeatureRegistrationResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          info,
        };
        results.push(result);
        this.registeredFeatures.set(info.name, result);
        this.logger.error(`❌ Feature ${info.name} failed to load: ${result.error}`);
      }
    }

    return results;
  }

  getRegistrationResults(): Map<string, FeatureRegistrationResult> {
    return new Map(this.registeredFeatures);
  }

  getSuccessfullyRegisteredFeatures(): FeatureRegistrationResult[] {
    return Array.from(this.registeredFeatures.values()).filter(result => result.success);
  }

  getFailedFeatureRegistrations(): FeatureRegistrationResult[] {
    return Array.from(this.registeredFeatures.values()).filter(result => !result.success);
  }

  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.features.values())
      .filter(feature => feature.cleanup)
      .map(feature => feature.cleanup!());

    await Promise.all(cleanupPromises);
    this.registeredFeatures.clear();
  }
}

export const featureRegistry = new FeatureRegistry();
