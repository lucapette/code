/* ==========================================================================
   seta — Vite / Vitest config
   The build output is what `make build` embeds (frontend/dist → backend/dist).
   In dev, Vite serves the app and proxies /api to the Go service, so the two
   processes can be run separately.
   ========================================================================== */

import { defineConfig } from 'vitest/config';

/** Where the Go service listens (`make start`, `go run .`). Override with BACKEND_URL. */
const backend = process.env.BACKEND_URL ?? 'http://localhost:8080';

export default defineConfig({
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
    },
  },
  build: {
    // Modern targets only, and no inline module-preload polyfill: the Go
    // service serves a strict-ish CSP, so keep scripts external.
    target: 'es2022',
    modulePreload: { polyfill: false },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
