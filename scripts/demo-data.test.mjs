// @vitest-environment node

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { demoDatasetMetadata } from '@tanstack/charts-data/metadata'
import {
  autoTypeValue,
  parseCsvRows,
} from '../packages/charts-demo-data/src/parse-csv.js'

const workspace = resolve(import.meta.dirname, '..')
const supportExports = [
  './country-atlas',
  './learning-poverty-geography',
  './shadcn',
  './shadcn-area-interactive-data',
  './simplify-geo',
]

describe('demo data', () => {
  it('parses quoted CSV rows without code generation', () => {
    expect(
      parseCsvRows('name,note\r\nalpha,"one,two"\r\nbeta,"line\n""two"""'),
    ).toEqual([
      ['name', 'note'],
      ['alpha', 'one,two'],
      ['beta', 'line\n"two"'],
    ])
    expect(
      ['', '42', 'true', '2026-08-02', ' text '].map(autoTypeValue),
    ).toEqual([null, 42, true, new Date('2026-08-02'), ' text '])
  })

  it('records a reproducible schema and provenance for every exact export', async () => {
    const packageJson = JSON.parse(
      await readFile(
        resolve(workspace, 'packages/charts-demo-data/package.json'),
        'utf8',
      ),
    )
    const exactExports = Object.keys(packageJson.exports)
    const datasetExports = exactExports
      .filter(
        (specifier) =>
          specifier !== './metadata' && !supportExports.includes(specifier),
      )
      .map((specifier) => specifier.slice(2))
      .sort()

    expect(
      exactExports
        .filter((specifier) => supportExports.includes(specifier))
        .sort(),
    ).toEqual([...supportExports].sort())
    expect(demoDatasetMetadata.map(({ id }) => id).sort()).toEqual(
      datasetExports,
    )
    for (const dataset of demoDatasetMetadata) {
      expect(dataset.records).toBeGreaterThan(0)
      expect(dataset.fields).not.toHaveLength(0)
      expect(dataset.schema.map(({ name }) => name)).toEqual(dataset.fields)
      expect(dataset.sha256).toMatch(/^[a-f0-9]{64}$/u)
      expect(dataset.observableRevision).toMatch(/^[a-f0-9]{40}$/u)
      expect(dataset.specifier).toBe(`@tanstack/charts-data/${dataset.id}`)
    }
  })

  it('keeps sibling datasets and CSV parsing out of exact-subpath bundles', async () => {
    const result = await build({
      absWorkingDir: workspace,
      stdin: {
        contents:
          "import { alphabet } from '@tanstack/charts-data/alphabet'; console.log(alphabet.length)",
        resolveDir: workspace,
      },
      bundle: true,
      format: 'esm',
      platform: 'browser',
      write: false,
      metafile: true,
      logLevel: 'silent',
    })
    const inputs = Object.keys(result.metafile.inputs)

    expect(inputs.some((path) => path.endsWith('/src/alphabet.js'))).toBe(true)
    expect(
      inputs.some(
        (path) =>
          path.includes('/charts-demo-data/src/') &&
          !path.endsWith('/src/alphabet.js'),
      ),
    ).toBe(false)
    expect(inputs.some((path) => path.includes('d3-dsv'))).toBe(false)
  })

  it('keeps a complete large CSV snapshot worker-safe and below the catalog asset limit', async () => {
    const result = await build({
      absWorkingDir: workspace,
      stdin: {
        contents:
          "import { olympians } from '@tanstack/charts-data/olympians'; console.log(olympians.length)",
        resolveDir: workspace,
      },
      bundle: true,
      format: 'esm',
      minify: true,
      platform: 'browser',
      write: false,
      metafile: true,
      logLevel: 'silent',
    })

    expect(
      Object.keys(result.metafile.inputs).some((path) =>
        path.includes('d3-dsv'),
      ),
    ).toBe(false)
    const output = new TextDecoder().decode(result.outputFiles[0]?.contents)
    expect(output).not.toContain('new Function')
    expect(output).not.toMatch(/\beval\s*\(/u)
    expect(result.outputFiles[0]?.contents.byteLength).toBeLessThan(1024 * 1024)
  })
})
