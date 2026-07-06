import { defineConfig } from 'vitest/config'

// Scoped to this package so vitest doesn't walk up and pick up an unrelated Vite config.
export default defineConfig({
  root: __dirname,
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
