import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// The Solid 2 entry (`@tanstack/solid-charts/solid2`) lives next to the
// Solid 1 adapter, while the workspace toolchain stays on Solid 1. The
// private `@charts-internal/solid-2-compat` package holds the Solid 2 runtime
// and compiler; these helpers point the Solid 2 sources at it.
export const solid2CompatRoot = resolve(
  import.meta.dirname,
  '..',
  'packages',
  'solid-2-compat',
)
export const solid2SourceRoot = resolve(
  import.meta.dirname,
  '..',
  'packages',
  'solid-charts',
  'src',
  'solid2',
)
const solid2Runtime = /^(?:solid-js|@solidjs\/web)(?:\/|$)/u
const compatImporter = resolve(solid2CompatRoot, 'package.json')

export async function loadSolid2VitePlugin() {
  const entry = createRequire(compatImporter).resolve('@solidjs/vite-plugin')
  const module = await import(
    pathToFileURL(entry.replace(/cjs\/index\.cjs$/u, 'esm/index.mjs')).href
  )
  return module.default
}

export function solid2RuntimeResolver() {
  return {
    name: 'charts:solid-2-runtime',
    enforce: 'pre',
    resolveId(source, _importer, options) {
      if (!solid2Runtime.test(source)) return null
      return this.resolve(source, compatImporter, {
        ...options,
        skipSelf: true,
      })
    },
  }
}
