import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'benchmarks/conformance/**/*.test.ts',
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
      'examples/conformance/**/*.test.ts',
      'examples/sandbox/**/*.test.ts',
    ],
    restoreMocks: true,
  },
})
