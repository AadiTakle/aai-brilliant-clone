import { defineConfig } from 'vitest/config'

// Config for Pyodide integration tests. These run in a Node environment (no
// jsdom/window) so the runner uses the installed `pyodide` package, and they
// get a long timeout because the first Pyodide load is slow.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.pyodide.test.ts'],
    testTimeout: 120000,
    hookTimeout: 120000,
  },
})
