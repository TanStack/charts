import { octane } from 'octane/compiler/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [octane({ hmr: false, ssr: false })],
  resolve: {
    extensions: ['.tsrx', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
  ssr: {
    noExternal: ['@tanstack/charts', '@tanstack/octane-charts'],
  },
  test: {
    environment: 'jsdom',
    include: ['packages/octane-charts/**/*.client.test.tsrx'],
  },
})
