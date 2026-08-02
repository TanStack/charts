import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { build } from 'esbuild'

const root = resolve(import.meta.dirname, '..')
const outputDirectory = resolve(root, '.bundle-output')
const outfile = resolve(outputDirectory, 'pointer-resolution.mjs')

await mkdir(outputDirectory, { recursive: true })
await build({
  entryPoints: [resolve(root, 'benchmarks/interaction/nearest.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  legalComments: 'none',
  logLevel: 'silent',
})

await import(`${pathToFileURL(outfile).href}?time=${Date.now()}`)
