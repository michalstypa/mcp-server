import { featureRegistry } from '../infra/features.js';

import { calcomFeature } from './calcom/index.js';
import { demoFeature } from './demo/index.js';

export function initializeFeatures(): void {
  featureRegistry.addFeature(demoFeature);
  featureRegistry.addFeature(calcomFeature);

  // Future features can be added here:
  // featureRegistry.addFeature(slackFeature);
  // featureRegistry.addFeature(githubFeature);
  // etc.
}

export { featureRegistry } from '../infra/features.js';

export type { Feature, FeatureInfo, FeatureRegistrationResult } from '../infra/features.js';
