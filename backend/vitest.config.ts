import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    /*
     * Generous, because the first suite pays for a cold TypeScript transform of
     * the whole server plus Fastify plugin registration — measured at roughly
     * fourteen seconds on a cold Windows cache. The default ten leaves a test
     * that works failing on the first run of the day.
     */
    hookTimeout: 30_000,
    testTimeout: 20_000,
  },
});
