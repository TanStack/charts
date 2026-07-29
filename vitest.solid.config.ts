import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    include: ['packages/solid-charts/src/Chart.test.tsx'],
  },
})
