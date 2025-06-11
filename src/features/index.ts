import { featureRegistry } from '../infra/features.js';

// Import all available features
import { calcomFeature } from './calcom/index.js';

/**
 * Initialize and register all available features
 */
export function initializeFeatures(): void {
  // Register Cal.com feature
  featureRegistry.addFeature(calcomFeature);

  // Future features can be added here:
  // featureRegistry.addFeature(slackFeature);
  // featureRegistry.addFeature(githubFeature);
  // etc.
}

// Export the registry for use in server
export { featureRegistry } from '../infra/features.js';

// Re-export feature interfaces for convenience
export type {
  Feature,
  FeatureInfo,
  FeatureRegistrationResult,
} from '../infra/features.js';
