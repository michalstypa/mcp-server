import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('Configuration', () => {
  beforeAll(() => {
    // Set required environment variable for tests
    vi.stubEnv('CALCOM_API_TOKEN', 'test_token_123');
  });

  it('should have a valid configuration when CALCOM_API_TOKEN is provided', async () => {
    const { config } = await import('./config');

    expect(config.CALCOM_API_TOKEN).toBe('test_token_123');
    expect(typeof config.PORT).toBe('number');
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.PORT).toBeLessThan(65536);
    expect(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).toContain(
      config.LOG_LEVEL
    );
    expect(config.CALCOM_API_BASE).toMatch(/^https?:\/\/.+/);
    expect(['development', 'production', 'test']).toContain(config.NODE_ENV);
  });

  it('should export utility functions', async () => {
    const { isProduction, isDevelopment, isTest } = await import('./config');

    expect(typeof isProduction).toBe('function');
    expect(typeof isDevelopment).toBe('function');
    expect(typeof isTest).toBe('function');

    const prod = isProduction();
    const dev = isDevelopment();
    const test = isTest();

    expect(typeof prod).toBe('boolean');
    expect(typeof dev).toBe('boolean');
    expect(typeof test).toBe('boolean');

    // Only one should be true
    const trueCount = [prod, dev, test].filter(Boolean).length;
    expect(trueCount).toBe(1);
  });

  it('should have proper TypeScript types', async () => {
    const { config } = await import('./config');

    // Verify the config object has the expected structure
    expect(config).toHaveProperty('CALCOM_API_TOKEN');
    expect(config).toHaveProperty('PORT');
    expect(config).toHaveProperty('LOG_LEVEL');
    expect(config).toHaveProperty('CALCOM_API_BASE');
    expect(config).toHaveProperty('NODE_ENV');
  });
});
