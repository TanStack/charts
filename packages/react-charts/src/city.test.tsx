// @vitest-environment node
import * as React from 'react'
import { fileURLToPath } from 'node:url'
import { renderToString } from 'react-dom/server'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { CityMap, CityChart, defineCityChart, type CityDatum } from './city'

const rows: CityDatum[] = [
  {
    id: 7,
    name: 'Store',
    metric: { label: 'Orders', value: 42 },
    categories: [{ label: 'Retail', value: 'retail' }],
    status: 'critical',
  },
]

describe('React city integration', () => {
  it('server renders the complete map and composable chart without WebGL', () => {
    const map = renderToString(<CityMap data={rows} ariaLabel="Store health" />)
    expect(map).toContain('Store health')
    expect(map).toContain('data-city-surface')
    expect(map).toContain('Camera controls')
    expect(map).not.toContain('<canvas')
    const chart = renderToString(
      <CityChart definition={defineCityChart(rows)} />,
    )
    expect(chart).toContain('data-city-surface')
    expect(chart).not.toContain('<canvas')
  })

  it('keeps Three.js and city code out of ordinary React chart bundles', async () => {
    const result = await build({
      stdin: {
        contents: "export { Chart } from '@tanstack/react-charts'",
        resolveDir: fileURLToPath(new URL('.', import.meta.url)),
        loader: 'ts',
      },
      bundle: true,
      format: 'esm',
      write: false,
      metafile: true,
      external: ['react', 'react-dom'],
    })
    expect(
      Object.keys(result.metafile!.inputs).some(
        (path) => path.includes('/city') || path.includes('/three/'),
      ),
    ).toBe(false)
  })
})
