import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: [
      'tests/**/*.rules.test.ts',
      'tests/**/*.emulator.test.{ts,tsx}',
      'tests/**/*.pyodide.test.ts',
      'node_modules/**',
    ],
    css: false,
  },
})
