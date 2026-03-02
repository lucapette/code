import { defineConfig } from 'vitest/config';
import { spawn } from 'child_process';

const serverPath = process.cwd() + '/node_modules/.bin/tsx';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./tests/integration/setup.ts'],
  },
});
