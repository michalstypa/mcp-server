import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('Configuration', () => {
  beforeAll(() => {
    vi.stubEnv('PORT', '3000');
    vi.stubEnv('LOG_LEVEL', 'debug');
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('should have a valid configuration when server environment is provided', async () => {
    const { config } = await import('./config');

    expect(typeof config.PORT).toBe('number');
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.PORT).toBeLessThan(65536);
    expect(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).toContain(config.LOG_LEVEL);
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

    const trueCount = [prod, dev, test].filter(Boolean).length;
    expect(trueCount).toBe(1);
  });

  it('should have proper TypeScript types', async () => {
    const { config } = await import('./config');

    expect(config).toHaveProperty('PORT');
    expect(config).toHaveProperty('LOG_LEVEL');
    expect(config).toHaveProperty('NODE_ENV');
  });
});
