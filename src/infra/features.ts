import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Feature metadata interface
 */
export interface FeatureInfo {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

/**
 * Feature registration result
 */
export interface FeatureRegistrationResult {
  success: boolean;
  error?: string;
  toolsRegistered?: string[];
  info?: FeatureInfo;
}

/**
 * Standard feature interface that all features must implement
 */
export interface Feature {
  /**
   * Get feature information
   */
  getInfo(): FeatureInfo;

  /**
   * Check if the feature can be loaded (e.g., has required config)
   */
  canLoad(): boolean;

  /**
   * Register the feature with the MCP server
   * @param server - The MCP server instance
   * @returns Registration result with success status and details
   */
  register(
    server: McpServer
  ): Promise<FeatureRegistrationResult> | FeatureRegistrationResult;

  /**
   * Optional cleanup when the feature is unloaded
   */
  cleanup?(): Promise<void> | void;
}

/**
 * Feature registry to manage all features
 */
export class FeatureRegistry {
  private features = new Map<string, Feature>();
  private registeredFeatures = new Map<string, FeatureRegistrationResult>();

  /**
   * Register a feature with the registry
   */
  addFeature(feature: Feature): void {
    const info = feature.getInfo();
    this.features.set(info.name, feature);
  }

  /**
   * Get all available features
   */
  getFeatures(): Feature[] {
    return Array.from(this.features.values());
  }

  /**
   * Get a specific feature by name
   */
  getFeature(name: string): Feature | undefined {
    return this.features.get(name);
  }

  /**
   * Register all available features with the MCP server
   */
  async registerAllFeatures(
    server: McpServer
  ): Promise<FeatureRegistrationResult[]> {
    const results: FeatureRegistrationResult[] = [];

    for (const feature of this.features.values()) {
      const info = feature.getInfo();

      try {
        // Check if feature can be loaded
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

        // Register the feature
        const result = await feature.register(server);
        results.push(result);
        this.registeredFeatures.set(info.name, result);

        if (result.success) {
          console.error(
            `✅ Feature ${info.name} (v${info.version}) loaded successfully` +
              (result.toolsRegistered?.length
                ? ` - Tools: ${result.toolsRegistered.join(', ')}`
                : '')
          );
        } else {
          console.error(
            `❌ Feature ${info.name} failed to load: ${result.error}`
          );
        }
      } catch (error) {
        const result: FeatureRegistrationResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          info,
        };
        results.push(result);
        this.registeredFeatures.set(info.name, result);
        console.error(
          `❌ Feature ${info.name} failed to load: ${result.error}`
        );
      }
    }

    return results;
  }

  /**
   * Get registration results for all features
   */
  getRegistrationResults(): Map<string, FeatureRegistrationResult> {
    return new Map(this.registeredFeatures);
  }

  /**
   * Get successfully registered features
   */
  getSuccessfullyRegisteredFeatures(): FeatureRegistrationResult[] {
    return Array.from(this.registeredFeatures.values()).filter(
      result => result.success
    );
  }

  /**
   * Get failed feature registrations
   */
  getFailedFeatureRegistrations(): FeatureRegistrationResult[] {
    return Array.from(this.registeredFeatures.values()).filter(
      result => !result.success
    );
  }

  /**
   * Clean up all registered features
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.features.values())
      .filter(feature => feature.cleanup)
      .map(feature => feature.cleanup!());

    await Promise.all(cleanupPromises);
    this.registeredFeatures.clear();
  }
}

/**
 * Global feature registry instance
 */
export const featureRegistry = new FeatureRegistry();
