import { z } from 'zod';

const calcomConfigSchema = z.object({
  CALCOM_API_TOKEN: z
    .string()
    .min(1, 'CALCOM_API_TOKEN is required for Cal.com feature')
    .describe('Cal.com API token for authentication'),

  CALCOM_API_BASE: z.string().url().default('https://api.cal.com').describe('Cal.com API base URL'),
});

export type CalcomConfig = z.infer<typeof calcomConfigSchema>;

export function canLoadCalcomFeature(): boolean {
  return !!process.env.CALCOM_API_TOKEN;
}

export function loadCalcomConfig(): CalcomConfig {
  try {
    return calcomConfigSchema.parse({
      CALCOM_API_TOKEN: process.env.CALCOM_API_TOKEN,
      CALCOM_API_BASE: process.env.CALCOM_API_BASE,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new Error(`Cal.com feature configuration error: ${issues}`);
    }
    throw error;
  }
}
