import { octane } from 'octane/compiler/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [octane({ hmr: false, ssr: false })],
  resolve: {
    extensions: ['.tsrx', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
  ssr: {
    noExternal: ['@plot-poc/octane-host', '@tanstack/octane-charts'],
  },
  test: {
    environment: 'jsdom',
    include: [
      'packages/octane/**/*.client.test.tsrx',
      'packages/octane-charts/**/*.client.test.tsrx',
    ],
  },
})
