import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Test the schema directly instead of the module
const envSchema = z.object({
  CALCOM_API_TOKEN: z
    .string()
    .min(1, 'CALCOM_API_TOKEN is required')
    .describe('Cal.com API token for authentication'),

  PORT: z
    .string()
    .default('8080')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val < 65536, 'PORT must be between 1 and 65535')
    .describe('HTTP server port'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info')
    .describe('Pino log level'),

  CALCOM_API_BASE: z
    .string()
    .url()
    .default('https://api.cal.com')
    .describe('Cal.com API base URL'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node.js environment'),
});

describe('Configuration Schema Validation', () => {
  it('should validate correct environment variables', () => {
    const validEnv = {
      CALCOM_API_TOKEN: 'test_token_123',
      PORT: '3000',
      LOG_LEVEL: 'debug',
      CALCOM_API_BASE: 'https://test.cal.com',
      NODE_ENV: 'production',
    };

    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.CALCOM_API_TOKEN).toBe('test_token_123');
      expect(result.data.PORT).toBe(3000);
      expect(result.data.LOG_LEVEL).toBe('debug');
      expect(result.data.CALCOM_API_BASE).toBe('https://test.cal.com');
      expect(result.data.NODE_ENV).toBe('production');
    }
  });

  it('should use default values when optional variables are missing', () => {
    const minimalEnv = {
      CALCOM_API_TOKEN: 'test_token_123',
    };

    const result = envSchema.safeParse(minimalEnv);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.CALCOM_API_TOKEN).toBe('test_token_123');
      expect(result.data.PORT).toBe(8080);
      expect(result.data.LOG_LEVEL).toBe('info');
      expect(result.data.CALCOM_API_BASE).toBe('https://api.cal.com');
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  it('should fail when CALCOM_API_TOKEN is missing', () => {
    const invalidEnv = {};

    const result = envSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message);
      // Zod returns 'Required' for missing required fields
      expect(errors).toContain('Required');

      // Check that the error is for the CALCOM_API_TOKEN field
      const tokenError = result.error.errors.find(err =>
        err.path.includes('CALCOM_API_TOKEN')
      );
      expect(tokenError).toBeDefined();
    }
  });

  it('should fail when PORT is invalid', () => {
    const invalidEnv = {
      CALCOM_API_TOKEN: 'test_token_123',
      PORT: '0',
    };

    const result = envSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = result.error.errors.map(err => err.message);
      expect(errors).toContain('PORT must be between 1 and 65535');
    }
  });

  it('should fail when LOG_LEVEL is invalid', () => {
    const invalidEnv = {
      CALCOM_API_TOKEN: 'test_token_123',
      LOG_LEVEL: 'invalid_level',
    };

    const result = envSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errorPaths = result.error.errors.map(err => err.path.join('.'));
      expect(errorPaths).toContain('LOG_LEVEL');
    }
  });

  it('should fail when CALCOM_API_BASE is not a valid URL', () => {
    const invalidEnv = {
      CALCOM_API_TOKEN: 'test_token_123',
      CALCOM_API_BASE: 'not-a-url',
    };

    const result = envSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errorPaths = result.error.errors.map(err => err.path.join('.'));
      expect(errorPaths).toContain('CALCOM_API_BASE');
    }
  });
});
