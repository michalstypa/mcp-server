import { z } from 'zod';

/**
 * Cal.com feature configuration schema
 * Only validates Cal.com specific environment variables
 */
const calcomConfigSchema = z.object({
  CALCOM_API_TOKEN: z
    .string()
    .min(1, 'CALCOM_API_TOKEN is required for Cal.com feature')
    .describe('Cal.com API token for authentication'),

  CALCOM_API_BASE: z
    .string()
    .url()
    .default('https://api.cal.com')
    .describe('Cal.com API base URL'),
});

export type CalcomConfig = z.infer<typeof calcomConfigSchema>;

/**
 * Check if Cal.com feature can be loaded (has required config)
 */
export function canLoadCalcomFeature(): boolean {
  return !!process.env.CALCOM_API_TOKEN;
}

/**
 * Load and validate Cal.com configuration
 * Throws if configuration is invalid
 */
export function loadCalcomConfig(): CalcomConfig {
  try {
    return calcomConfigSchema.parse({
      CALCOM_API_TOKEN: process.env.CALCOM_API_TOKEN,
      CALCOM_API_BASE: process.env.CALCOM_API_BASE,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Cal.com feature configuration error: ${issues}`);
    }
    throw error;
  }
}
