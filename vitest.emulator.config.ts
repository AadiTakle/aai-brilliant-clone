import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config for tests that require the Firebase Emulator Suite.
// Run via: npm run test:emulator (wraps this in `firebase emulators:exec`).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.rules.test.ts', 'tests/**/*.emulator.test.{ts,tsx}'],
    css: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
