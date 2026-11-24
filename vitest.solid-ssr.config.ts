import solid from 'vite-plugin-solid'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [solid({ ssr: true })],
  test: {
    environment: 'node',
    include: ['packages/solid-charts/**/*.ssr.test.tsx'],
    exclude: [...configDefaults.exclude, 'packages/solid-charts/src/solid2/**'],
  },
})
