import { describe, expect, it } from 'vitest'
import {
  extractCatalogPreviewSvg,
  themeCatalogPreviewSvg,
  validateCatalogPreviewSvg,
} from './catalog-preview.mjs'

const svg =
  '<svg class="ts-chart" viewBox="0 0 288 192"><g class="ts-chart__grid"></g></svg>'

describe('catalog previews', () => {
  it('extracts the canonical 288 by 192 chart SVG', () => {
    expect(extractCatalogPreviewSvg(`<div>${svg}</div>`, 'line')).toBe(svg)
  })

  it('adds portable light and dark chart themes deterministically', () => {
    const left = themeCatalogPreviewSvg(svg)
    const right = themeCatalogPreviewSvg(svg)

    expect(left).toBe(right)
    expect(left).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(left).toContain('--ts-chart-background:#ffffff')
    expect(left).toContain('@media(prefers-color-scheme:dark)')
    expect(left).toContain('--ts-chart-background:#071219')
    expect(() => validateCatalogPreviewSvg(left, 'line')).not.toThrow()
  })

  it('rejects a preview with dimensions outside the published contract', () => {
    expect(() =>
      validateCatalogPreviewSvg(
        svg.replace('0 0 288 192', '0 0 640 480'),
        'line',
        false,
      ),
    ).toThrow('invalid dimensions')
  })
})
