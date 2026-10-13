import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [solid({ solid: { hydratable: true } })],
  test: {
    environment: 'jsdom',
    include: ['packages/solid-charts/src/Chart.test.tsx'],
  },
})
