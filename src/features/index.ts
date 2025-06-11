import { featureRegistry } from '../infra/features.js';

// Import all available features
import { calcomFeature } from './calcom/index.js';
import { demoFeature } from './demo/index.js';

/**
 * Initialize and register all available features
 */
export function initializeFeatures(): void {
  // Register Demo feature (always available, no external dependencies)
  featureRegistry.addFeature(demoFeature);

  // Register Cal.com feature (requires CALCOM_API_TOKEN)
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
