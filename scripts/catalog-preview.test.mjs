import { describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  catalogPreviewHeight,
  catalogPreviewSourceHashInput,
  catalogPreviewWidth,
  catalogGuidePreviewCaseIds,
  catalogLegendPreviewCaseIds,
  catalogMarginPreviewCaseIds,
  catalogTextPreviewCaseIds,
  createCatalogPreviewSourceHash,
  createPortableCatalogPreviewSvg,
  isTransientCatalogPreviewBrowserError,
  retryCatalogPreviewBrowserRender,
  resolveCatalogPreviewDarkPaint,
  validateCatalogPreviewPresentation,
  validateCatalogPreviewSvg,
  validateCatalogPreviewXml,
} from './catalog-preview.mjs'

const renderedChart = `<svg class="ts-chart" viewBox="0 0 288 192"><path fill="#2563eb" stroke="#172033" d="M0 0h288v192H0z"></path><circle fill="#f97316" cx="24" cy="24" r="12"></circle></svg>`
const darkRenderedChart = renderedChart
  .replace('#2563eb', '#6ea8fe')
  .replace('#172033', '#edf2fb')

function portable(
  light = renderedChart,
  dark = darkRenderedChart,
  presentation = {},
) {
  return createPortableCatalogPreviewSvg(
    light,
    dark,
    'line-gaps',
    JSDOM,
    presentation,
  )
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
    expect(preview).toContain('--background:#ffffff')
    expect(preview).toContain('--background:#151a24')
    expect(preview).toContain('--foreground:#172033')
    expect(preview).toContain('--foreground:#edf2fb')
    expect(preview).toContain('--muted:#f7f8fb')
    expect(preview).toContain('--muted:#10151e')
    expect(preview).toContain('--muted-foreground:#697386')
    expect(preview).toContain('--muted-foreground:#9aa6b9')
    expect(preview).toContain('--ts-catalog-preview-paint-0:#2563eb')
    expect(preview).toContain('--ts-catalog-preview-paint-0:#6ea8fe')
    expect(preview).toContain('--ts-catalog-preview-paint-1:#172033')
    expect(preview).toContain('--ts-catalog-preview-paint-1:#edf2fb')
    expect(preview).toContain('fill="var(--ts-catalog-preview-paint-0)"')
    expect(preview).toContain('stroke="var(--ts-catalog-preview-paint-1)"')
    expect(preview).toContain('--ts-catalog-preview-paint-2:#f97316')
    expect(preview).toContain('--ts-catalog-preview-paint-2:#ff9b65')
    expect(preview).toContain('fill="var(--ts-catalog-preview-paint-2)"')
    expect(preview).toContain(
      "font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    )
    expect(preview).not.toMatch(/(?:^|[{;])background\s*:/u)
  })

  it('adapts fixed authored paint only when the dark surface needs it', () => {
    expect(resolveCatalogPreviewDarkPaint('#2563eb')).toBe('#6ea8fe')
    expect(resolveCatalogPreviewDarkPaint('#0f172a')).toMatch(/^#[\da-f]{6}$/u)
    expect(resolveCatalogPreviewDarkPaint('#0f172a')).not.toBe('#0f172a')
    expect(resolveCatalogPreviewDarkPaint('#f59e0b')).not.toBe('#f59e0b')
    expect(
      resolveCatalogPreviewDarkPaint('var(--premium-kpi-accent, #6d5dfc)'),
    ).toMatch(/^var\(--premium-kpi-accent, #[\da-f]{6}\)$/u)
    expect(resolveCatalogPreviewDarkPaint('none')).toBeUndefined()
    expect(resolveCatalogPreviewDarkPaint('var(--chart-1)')).toBeUndefined()

    const fixed = renderedChart.replace('#2563eb', '#0f172a')
    const preview = portable(fixed, fixed)
    expect(preview).toContain('--ts-catalog-preview-paint-0:#0f172a')
    expect(preview).toContain('fill="var(--ts-catalog-preview-paint-0)"')
  })

  it('binds shadcn text and surface tokens inside the standalone SVG', () => {
    const tokenChart = renderedChart
      .replace(
        '<path fill="#2563eb" stroke="#172033"',
        '<path fill="var(--background)" stroke="var(--muted)"',
      )
      .replace(
        '</svg>',
        '<text fill="var(--foreground)">Total</text><text fill="var(--muted-foreground)">Visitors</text></svg>',
      )
    const preview = portable(tokenChart, tokenChart, { text: 'retain' })

    expect(preview).toContain('fill="var(--background)"')
    expect(preview).toContain('stroke="var(--muted)"')
    expect(preview).toContain('fill="var(--foreground)"')
    expect(preview).toContain('fill="var(--muted-foreground)"')
    expect(preview).toContain('--background:#ffffff')
    expect(preview).toContain('--background:#151a24')
    expect(preview).toContain('--foreground:#172033')
    expect(preview).toContain('--foreground:#edf2fb')
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

  it('does not treat semantic background IDs as CSS background paint', () => {
    expect(() =>
      validateCatalogPreviewSvg(
        portable().replace(
          '<g data-ts-key="marks"',
          '<g data-ts-key="radial-background:object"',
        ),
        'line-gaps',
      ),
    ).not.toThrow()
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
      '120-themed-interactive-area',
      '121-active-bar-dashboard',
      '130-shadcn-radar-multiple',
      '80-echarts-axis-pointer',
      'bar-horizontal-ranking',
    ])
    expect(catalogLegendPreviewCaseIds).toEqual([
      '81-recharts-interactive-legend',
    ])
    expect(catalogMarginPreviewCaseIds).toEqual([
      '115-definition-motion',
      '118-token-usage-calendar',
      '128-shadcn-bar-multiple',
      '132-shadcn-tooltip-advanced',
      '80-echarts-axis-pointer',
      '81-recharts-interactive-legend',
      '88-echarts-free-cursor',
      '120-themed-interactive-area',
      '121-active-bar-dashboard',
      '122-premium-kpi-sparklines',
      '124-theme-palette-matrix',
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
      '120-themed-interactive-area',
      '121-active-bar-dashboard',
      '123-active-donut-metric',
      '125-sales-funnel',
      '126-drillable-sunburst',
      '129-shadcn-pie-donut-text',
      '130-shadcn-radar-multiple',
      '131-shadcn-radial-text',
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
        '<g class="ts-chart__axes"><text x="0">label</text></g>',
        'shadcn-collection-case',
        { guides: true, legend: true, text: 'retain' },
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

  it('requires the active bar dashboard preview composition', () => {
    const bars = Array.from(
      { length: 24 },
      (_, index) =>
        `<rect data-ts-key="daily-visitors:null:${String(index + 1).padStart(2, '0')}"></rect>`,
    ).join('')
    const preview = `${bars}<linearGradient data-ts-key="gradient:visitor-bars"></linearGradient><text x="0">May 1</text>`

    expect(() =>
      validateCatalogPreviewPresentation(preview, '121-active-bar-dashboard'),
    ).not.toThrow()
    expect(() =>
      validateCatalogPreviewPresentation(
        preview.replace('daily-visitors:null:24', 'missing-bar:null:24'),
        '121-active-bar-dashboard',
      ),
    ).toThrow('must retain all 24 keyed bars')
    expect(() =>
      validateCatalogPreviewPresentation(
        preview.replace('gradient:visitor-bars', 'gradient:missing'),
        '121-active-bar-dashboard',
      ),
    ).toThrow('must retain all 24 keyed bars')
  })

  it('validates selected-point geometry independently of themed paint', () => {
    expect(() =>
      validateCatalogPreviewPresentation(
        '<g data-ts-key="selected-observation"><circle fill="var(--ts-catalog-preview-paint-0)" r="7"/></g>',
        '82-chart-table-selection',
      ),
    ).not.toThrow()
    expect(() =>
      validateCatalogPreviewPresentation(
        '<g data-ts-key="selected-observation"><circle fill="var(--ts-catalog-preview-paint-0)" r="6"/></g>',
        '82-chart-table-selection',
      ),
    ).toThrow('must retain its native selected point')
  })

  it('requires the active donut preview composition', () => {
    const arcs = ['chrome', 'safari', 'firefox', 'edge', 'other']
      .map((id) => `<path data-ts-key="browser-arcs:null:${id}"></path>`)
      .join('')
    const preview = `${arcs}<path data-ts-key="selected-browser-wedge:null:chrome"></path><path data-ts-key="selected-browser-ring:null:chrome"></path><text data-ts-key="donut-center-value:null:chrome:value">500</text><text data-ts-key="donut-center-label:null:chrome:label">Chrome</text>`

    expect(() =>
      validateCatalogPreviewPresentation(preview, '123-active-donut-metric'),
    ).not.toThrow()
    expect(() =>
      validateCatalogPreviewPresentation(
        preview.replace('browser-arcs:null:other', 'missing-arc:null:other'),
        '123-active-donut-metric',
      ),
    ).toThrow('must retain five base arcs')
    expect(() =>
      validateCatalogPreviewPresentation(
        preview.replace('donut-center-label:', 'missing-center-label:'),
        '123-active-donut-metric',
      ),
    ).toThrow('must retain five base arcs')
  })

  it('guards every new multi-layer theme preview contract', () => {
    const area =
      '<g data-ts-key="visitor-crosshair:x-rule"></g><circle data-ts-key="visitor-points:null:2026-06-29"></circle><text x="0">Jun 29</text>'
    expect(() =>
      validateCatalogPreviewPresentation(area, '120-themed-interactive-area'),
    ).not.toThrow()
    expect(() =>
      validateCatalogPreviewPresentation(
        area.replace('visitor-crosshair:x-rule', 'missing-crosshair:x-rule'),
        '120-themed-interactive-area',
      ),
    ).toThrow('must retain its focused source point')

    const kpis =
      '<svg class="ts-chart" data-tanstack-catalog-preview-surfaces><svg class="ts-chart"><path data-ts-key="revenue-line:null"></path></svg><svg class="ts-chart"><path data-ts-key="customers-line:null"></path></svg><svg class="ts-chart"><path data-ts-key="churn-line:null"></path></svg></svg>'
    expect(() =>
      validateCatalogPreviewPresentation(kpis, '122-premium-kpi-sparklines'),
    ).not.toThrow()
    expect(() =>
      validateCatalogPreviewPresentation(
        kpis.replace('customers-line', 'missing-series'),
        '122-premium-kpi-sparklines',
      ),
    ).toThrow('must retain all three real chart surfaces')

    const palettes =
      '<svg class="ts-chart" data-tanstack-catalog-preview-surfaces><svg class="ts-chart"><path data-ts-key="value-area:neutral"></path></svg><svg class="ts-chart"><path data-ts-key="value-area:vibrant"></path></svg><svg class="ts-chart"><path data-ts-key="value-area:monochrome"></path></svg></svg>'
    expect(() =>
      validateCatalogPreviewPresentation(palettes, '124-theme-palette-matrix'),
    ).not.toThrow()
    expect(() =>
      validateCatalogPreviewPresentation(
        palettes.replace('class="ts-chart"', 'class="missing-chart"'),
        '124-theme-palette-matrix',
      ),
    ).toThrow('must retain all three themed chart surfaces')
  })

  it('fingerprints the complete rendering path', async () => {
    await expect(createCatalogPreviewSourceHash()).resolves.toMatch(
      /^[a-f0-9]{64}$/u,
    )
  })

  it('ignores package release versions without ignoring manifest contracts', () => {
    const input = (version, exports = { '.': './src/index.ts' }) =>
      Buffer.from(
        JSON.stringify({ name: '@tanstack/charts', version, exports }),
      )

    expect(
      catalogPreviewSourceHashInput(
        'packages/charts-core/package.json',
        input('0.8.0'),
      ),
    ).toBe(
      catalogPreviewSourceHashInput(
        'packages/charts-core/package.json',
        input('0.9.0'),
      ),
    )
    expect(
      catalogPreviewSourceHashInput(
        'packages/charts-core/package.json',
        input('0.9.0', { '.': './src/next.ts' }),
      ),
    ).not.toBe(
      catalogPreviewSourceHashInput(
        'packages/charts-core/package.json',
        input('0.9.0'),
      ),
    )
  })

  it('retries only known transient Chromium failures', async () => {
    const contextErrorMessage =
      'locator.evaluateAll: Execution context was destroyed, most likely because of a navigation'

    expect(
      isTransientCatalogPreviewBrowserError(
        new Error('Failed to load resource: net::ERR_NETWORK_IO_SUSPENDED'),
      ),
    ).toBe(true)
    expect(
      isTransientCatalogPreviewBrowserError(
        new Error('Failed to load resource: net::ERR_SOCKET_NOT_CONNECTED'),
      ),
    ).toBe(true)
    expect(
      isTransientCatalogPreviewBrowserError(new Error(contextErrorMessage)),
    ).toBe(true)
    expect(
      isTransientCatalogPreviewBrowserError(
        new Error('Failed to load resource: net::ERR_CONNECTION_REFUSED'),
      ),
    ).toBe(false)
    expect(
      isTransientCatalogPreviewBrowserError(
        new Error('Catalog preview has clipped SVG labels'),
      ),
    ).toBe(false)

    const render = vi
      .fn()
      .mockRejectedValueOnce(new Error(contextErrorMessage))
      .mockResolvedValue('<svg></svg>')
    const replaceContext = vi.fn().mockResolvedValue(undefined)

    await expect(
      retryCatalogPreviewBrowserRender(
        'line-gaps (light)',
        render,
        replaceContext,
      ),
    ).resolves.toBe('<svg></svg>')
    expect(render).toHaveBeenCalledTimes(2)
    expect(replaceContext).toHaveBeenCalledTimes(1)
  })

  it('keeps chart errors and repeated transient failures hard', async () => {
    const chartError = new Error('Catalog preview has clipped SVG labels')
    const chartRender = vi.fn().mockRejectedValue(chartError)
    const chartContext = vi.fn()

    await expect(
      retryCatalogPreviewBrowserRender(
        'line-gaps (light)',
        chartRender,
        chartContext,
      ),
    ).rejects.toBe(chartError)
    expect(chartRender).toHaveBeenCalledTimes(1)
    expect(chartContext).not.toHaveBeenCalled()

    const contextErrorMessage =
      'locator.evaluateAll: Execution context was destroyed, most likely because of a navigation'
    const firstError = new Error(contextErrorMessage)
    const secondError = new Error(contextErrorMessage)
    const transientRender = vi
      .fn()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError)

    await expect(
      retryCatalogPreviewBrowserRender(
        'line-gaps (dark)',
        transientRender,
        vi.fn().mockResolvedValue(undefined),
      ),
    ).rejects.toMatchObject({
      errors: [firstError, secondError],
      message: expect.stringContaining('failed after a fresh-context retry'),
    })
  })
})
