import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    /*
     * pdfjs needs its character maps and standard font data as files at runtime.
     * Without them, any PDF using CID fonts or relying on the standard 14 fonts
     * decodes to empty strings — the document looks like a scan when it is
     * perfectly readable. They are copied rather than bundled because pdfjs
     * fetches them by URL.
     */
    viteStaticCopy({
      targets: [
        { src: 'node_modules/pdfjs-dist/cmaps/*', dest: 'pdfjs/cmaps' },
        { src: 'node_modules/pdfjs-dist/standard_fonts/*', dest: 'pdfjs/standard_fonts' },
      ],
    }),
  ],
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
    /*
     * Stands in for the nginx /api/ location that exists only in the frontend
     * image. Without it the dev server treats /api/auth/me as a file request,
     * finds nothing, and returns 404 — the backend never sees it.
     *
     * The rewrite strips the prefix exactly as the trailing slash on nginx's
     * proxy_pass does, so the same relative paths work in both environments and
     * the application code never needs to know which one it is running in.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
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
