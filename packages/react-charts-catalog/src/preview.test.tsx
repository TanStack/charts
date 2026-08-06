import { brotliCompressSync, constants } from 'node:zlib'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalogCases } from './index'
import type { ComponentType } from 'react'
import type { CatalogChartProps } from './index'

const caseModules = import.meta.glob<{
  default: ComponentType<CatalogChartProps>
}>('./cases/*.ts', { eager: true })
const brotliQuality4Options = {
  params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
}
const customViewIds = [
  '80-echarts-axis-pointer',
  '81-recharts-interactive-legend',
  '82-chart-table-selection',
  '83-focus-context-window',
  '84-pinned-nested-chart-tooltip',
  '86-streaming-window-preservation',
  '87-echarts-synchronized-cursors',
  '88-echarts-free-cursor',
  '89-brush-range-selection',
  '90-zoomable-time-window',
  '119-stacked-bar-band-cursor',
] as const

function component(id: string) {
  const module = caseModules[`./cases/${id}.ts`]
  if (!module) throw new Error(`Missing catalog component ${id}`)
  return module.default
}

function renderCatalog(preview: boolean) {
  let html = ''
  const cases = catalogCases.map(({ id }) => {
    const Component = component(id)
    const caseHtml = renderToStaticMarkup(
      <Component
        initialWidth={288}
        aspectRatio={1.5}
        interactive={false}
        preview={preview}
        idPrefix={`preview-${id}`}
      />,
    )
    html += caseHtml
    return {
      id,
      rawBytes: Buffer.byteLength(caseHtml),
      brotliBytes: brotliCompressSync(caseHtml, brotliQuality4Options)
        .byteLength,
      elements: [...caseHtml.matchAll(/<[a-z][^>]*>/g)].length,
      hasSvg: caseHtml.includes('<svg'),
    }
  })

  return {
    rawBytes: Buffer.byteLength(html),
    brotliBytes: brotliCompressSync(html, brotliQuality4Options).byteLength,
    elements: cases.reduce((total, entry) => total + entry.elements, 0),
    cases,
  }
}

describe('catalog previews', () => {
  it('server-renders custom view previews as fluid charts', () => {
    for (const id of customViewIds) {
      const Component = component(id)
      const html = renderToStaticMarkup(
        <Component
          initialWidth={480}
          aspectRatio={1.5}
          interactive={false}
          preview
          idPrefix={`preview-fluid-${id}`}
        />,
      )

      expect(html, id).toContain('<svg')
      expect(html, id).toContain('viewBox="0 0 480 320"')
      expect(html, id).toContain('aspect-ratio:1.5')
      expect(html, id).not.toContain('data-conformance-view="main"')
      expect(html, id).not.toContain('width:480px')
      expect(html, id).not.toContain('height:320px')
    }
  })

  it('keeps legend-heavy landing previews focused on their plot', () => {
    for (const id of [
      '04-stacked-time-area',
      '20-normalized-stacked-area',
      '21-streamgraph',
      '41-waffle-unit-chart',
    ]) {
      const Component = component(id)
      const html = renderToStaticMarkup(
        <Component
          initialWidth={288}
          aspectRatio={1.5}
          interactive={false}
          preview
          idPrefix={`preview-layout-${id}`}
        />,
      )

      expect(html, id).not.toContain('ts-chart__legend')
      expect(html, id).toMatch(/class="ts-chart__(?:area|rect|waffle)/)
    }

    const QuantileRibbon = component('61-quantile-ribbon')
    const quantileHtml = renderToStaticMarkup(
      <QuantileRibbon
        initialWidth={288}
        aspectRatio={1.5}
        interactive={false}
        preview
        idPrefix="preview-layout-61-quantile-ribbon"
      />,
    )
    expect(quantileHtml).not.toContain('Unemployed people by industry')
    expect(quantileHtml).toContain('ts-chart__area')
  })

  it('preserves every server-rendered case while reducing the landing payload', () => {
    const full = renderCatalog(false)
    const preview = renderCatalog(true)
    expect(preview.cases).toHaveLength(full.cases.length)
    expect(preview.cases.every(({ hasSvg }) => hasSvg)).toBe(true)
    expect(preview.rawBytes).toBeLessThanOrEqual(full.rawBytes)
    expect(preview.rawBytes).toBeLessThanOrEqual(1_500_000)
    expect(preview.brotliBytes).toBeLessThanOrEqual(225_000)
    expect(preview.elements).toBeLessThanOrEqual(7_500)
  }, 30_000)
})
