import { defineConfig } from 'vitest/config'
import {
  loadSolid2VitePlugin,
  solid2CompatRoot,
  solid2RuntimeResolver,
  solid2SourceRoot,
} from './scripts/solid-2-compat.mjs'

const solid = await loadSolid2VitePlugin()

export default defineConfig({
  root: solid2CompatRoot,
  plugins: [solid2RuntimeResolver(), solid({ solid: { hydratable: true } })],
  test: {
    dir: solid2SourceRoot,
    environment: 'jsdom',
    include: ['**/*.test.tsx'],
    exclude: ['**/*.ssr.test.tsx'],
  },
})
