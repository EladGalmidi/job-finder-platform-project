import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    modules: {
      // Readable class names in dev, hashed in prod.
      generateScopedName:
        process.env.NODE_ENV === 'production'
          ? '[hash:base64:6]'
          : '[name]__[local]__[hash:base64:4]',
    },
  },
  /*
   * Fail rather than fall back to the next free port.
   *
   * The fallback is quiet and costs more than it saves: a second `npm run dev`
   * comes up on 5174 looking identical, but the port is part of the origin, so
   * it gets its own localStorage — a separate mock database and a separate
   * session. Work done in one window silently fails to appear in the other.
   * An "address already in use" error names the problem immediately.
   */
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    env: {
      // Simulated network latency is a dev-experience feature, not something
      // tests should wait on.
      VITE_MOCK_LATENCY: '0',
    },
  },
});
