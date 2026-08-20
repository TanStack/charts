import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'benchmarks/comparison/**/*.test.ts',
      'benchmarks/conformance/**/*.test.ts',
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
      'examples/conformance/**/*.test.ts',
      'examples/conformance/**/*.test.tsx',
      'examples/sandbox/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
    exclude: [
      ...configDefaults.exclude,
      'packages/solid-charts/**/*.test.tsx',
      'packages/svelte-charts/**/*.test.ts',
    ],
    restoreMocks: true,
  },
})
