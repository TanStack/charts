import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  catalogPreviewHeight,
  catalogPreviewWidth,
  catalogGuidePreviewCaseIds,
  catalogLegendPreviewCaseIds,
  catalogMarginPreviewCaseIds,
  catalogTextPreviewCaseIds,
  createCatalogPreviewSourceHash,
  createPortableCatalogPreviewSvg,
  validateCatalogPreviewPresentation,
  validateCatalogPreviewSvg,
  validateCatalogPreviewXml,
} from './catalog-preview.mjs'

const renderedChart = `<svg class="ts-chart" viewBox="0 0 288 192"><path fill="#2563eb" stroke="#172033" d="M0 0h288v192H0z"></path><circle fill="#f97316" cx="24" cy="24" r="12"></circle></svg>`
const darkRenderedChart = renderedChart
  .replace('#2563eb', '#6ea8fe')
  .replace('#172033', '#edf2fb')

function portable(light = renderedChart, dark = darkRenderedChart) {
  return createPortableCatalogPreviewSvg(light, dark, 'line-gaps', JSDOM)
}

describe('catalog previews', () => {
  it('turns a rendered TanStack chart into a portable transparent asset', () => {
    const preview = portable()

    expect(preview).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(preview).toContain('data-tanstack-catalog-preview-theme')
    expect(preview).toContain('--ts-chart-1:#2563eb')
    expect(preview).toContain('--ts-chart-6:#06b6d4')
    expect(preview).toContain('--ts-chart-1:#6ea8fe')
    expect(preview).toContain('--ts-chart-6:#4fd4e7')
    expect(preview).toContain('color-scheme:light')
    expect(preview).toContain('color-scheme:dark')
    expect(preview).toContain('--panel:#ffffff')
    expect(preview).toContain('--panel:#151a24')
    expect(preview).toContain('--ts-catalog-preview-paint-0:#2563eb')
    expect(preview).toContain('--ts-catalog-preview-paint-0:#6ea8fe')
    expect(preview).toContain('--ts-catalog-preview-paint-1:#172033')
    expect(preview).toContain('--ts-catalog-preview-paint-1:#edf2fb')
    expect(preview).toContain('fill="var(--ts-catalog-preview-paint-0)"')
    expect(preview).toContain('stroke="var(--ts-catalog-preview-paint-1)"')
    expect(preview).toContain('fill="#f97316"')
    expect(preview).toContain(
      "font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    )
    expect(preview).not.toContain('background:')
  })

  it('requires the fixed 3:2 TanStack chart surface', () => {
    expect(catalogPreviewWidth).toBe(288)
    expect(catalogPreviewHeight).toBe(192)
    expect(() =>
      portable(renderedChart.replace('288 192', '640 480'), darkRenderedChart),
    ).toThrow('must use a 288×192 viewBox')
    expect(() =>
      portable(
        renderedChart.replace('class="ts-chart"', 'class="other"'),
        darkRenderedChart,
      ),
    ).toThrow('did not render a TanStack chart SVG')
  })

  it('rejects light and dark renders that differ beyond paint', () => {
    expect(() =>
      portable(renderedChart, darkRenderedChart.replace('cx="24"', 'cx="25"')),
    ).toThrow('changed non-paint attribute cx')
  })

  it('rejects stored assets without the portable theme', () => {
    expect(() => validateCatalogPreviewSvg(renderedChart, 'line-gaps')).toThrow(
      'is missing its portable catalog theme',
    )
  })

  it('requires standalone XML rather than browser-tolerated HTML markup', () => {
    expect(() =>
      validateCatalogPreviewXml(
        '<svg xmlns="http://www.w3.org/2000/svg"><style data-theme></style></svg>',
        'line-gaps',
        JSDOM,
      ),
    ).toThrow('is not valid XML')
    expect(() =>
      validateCatalogPreviewXml(
        '<svg xmlns="http://www.w3.org/2000/svg"><style data-theme=""></style></svg>',
        'line-gaps',
        JSDOM,
      ),
    ).not.toThrow()
  })

  it('rejects guides and legends except for feature-defining cases', () => {
    expect(catalogGuidePreviewCaseIds).toEqual([
      '115-definition-motion',
      '118-token-usage-calendar',
      '80-echarts-axis-pointer',
      'bar-horizontal-ranking',
    ])
    expect(catalogLegendPreviewCaseIds).toEqual([
      '81-recharts-interactive-legend',
    ])
    expect(catalogMarginPreviewCaseIds).toEqual([
      '115-definition-motion',
      '118-token-usage-calendar',
      '80-echarts-axis-pointer',
      '81-recharts-interactive-legend',
      '88-echarts-free-cursor',
      'bar-horizontal-ranking',
    ])
    expect(catalogTextPreviewCaseIds).toEqual([
      '02-multi-line-end-labels',
      '30-slopegraph',
      '36-hierarchy-tree',
      '58-select-extrema',
      '59-grouped-reducer-bars',
      '80-echarts-axis-pointer',
      '81-recharts-interactive-legend',
      '88-echarts-free-cursor',
      '93-labeled-pie',
      '94-center-donut',
      '98-needle-gauge',
      '115-definition-motion',
      '117-focus-cursor-motion',
      '118-token-usage-calendar',
      '119-stacked-bar-band-cursor',
      'bar-horizontal-ranking',
      'heatmap-labeled',
    ])
    expect(() =>
      validateCatalogPreviewPresentation(
        '<g class="ts-chart__axes"></g>',
        'line-gaps',
      ),
    ).toThrow('must omit axes and grids')
    expect(() =>
      validateCatalogPreviewPresentation(
        '<g class="ts-chart__legend"></g>',
        'line-gaps',
      ),
    ).toThrow('must omit its legend')
    expect(() =>
      validateCatalogPreviewPresentation(
        '<g class="ts-chart__axes"><text x="0">label</text></g>',
        '115-definition-motion',
      ),
    ).not.toThrow()
    expect(() =>
      validateCatalogPreviewPresentation(
        '<text x="0">label</text>',
        '40-force-directed-network',
      ),
    ).toThrow('must omit non-defining text')
    expect(() =>
      validateCatalogPreviewPresentation('', '93-labeled-pie'),
    ).toThrow('must retain its feature-defining text')
  })

  it('fingerprints the complete rendering path', async () => {
    await expect(createCatalogPreviewSourceHash()).resolves.toMatch(
      /^[a-f0-9]{64}$/u,
    )
  })
})
