import { describe, expect, it, vi } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { createChartAdapter, resolveChartAdapterLayout } from './adapter'
import { createChartRendererAdapter } from './adapter-renderer'
import { lineY } from './line'
import { defineChart } from './scene'
import { createSvgChartRenderer } from './svg-surface'
import { renderChartSvg } from './svg'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]

const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})
const focusDisabledDefinition = defineChart(definition, { focus: false })

describe('chart adapter controller', () => {
  it('mounts a prerendered dynamic definition', () => {
    const dynamic = defineChart(() => ({
      marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scaleLinear().domain([0, 4]) },
    }))
    const adapter = createChartAdapter({
      definition: dynamic,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
    })
    const markup = adapter.prerender()
    const container = document.createElement('div')
    container.innerHTML = markup

    adapter.mount(container)

    expect(container.querySelector('svg')).not.toBeNull()
    adapter.destroy()
  })

  it('stores updates that arrive before mount', () => {
    const onRender = vi.fn()
    const adapter = createChartAdapter({
      definition,
      width: 320,
      height: 180,
      ariaLabel: 'Initial',
    })
    adapter.update({
      definition,
      width: 640,
      height: 360,
      ariaLabel: 'Updated',
      onRender,
    })
    const container = document.createElement('div')

    adapter.mount(container)

    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Updated',
    )
    expect(adapter.getScene()?.width).toBe(640)
    expect(onRender).toHaveBeenCalledOnce()
    adapter.destroy()
  })

  it('forwards the surface class during prerender', () => {
    const adapter = createChartAdapter({
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
      className: 'revenue-surface',
    })
    const container = document.createElement('div')
    container.innerHTML = adapter.prerender()

    expect(
      container.querySelector('svg')?.classList.contains('revenue-surface'),
    ).toBe(true)
    adapter.destroy()
  })

  it('supports renderer-neutral framework adapters', () => {
    const adapter = createChartRendererAdapter({
      definition,
      renderer: createSvgChartRenderer<(typeof rows)[number], number, number>(
        renderChartSvg,
      ),
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
      className: 'revenue-surface',
    })
    const container = document.createElement('div')
    container.innerHTML = adapter.prerender()

    expect(
      container.querySelector('svg')?.classList.contains('revenue-surface'),
    ).toBe(true)
    adapter.mount(container)

    expect(adapter.getScene()?.points).toHaveLength(2)
    expect(container.querySelector('svg')).not.toBeNull()
    adapter.destroy()
  })

  it('forces a non-focusable SVG prerender when focus is disabled', () => {
    const adapter = createChartAdapter({
      definition: focusDisabledDefinition,
      width: 480,
      height: 260,
      ariaLabel: 'Static revenue',
      tabIndex: 4,
    })
    const container = document.createElement('div')
    container.innerHTML = adapter.prerender()

    expect(container.querySelector('svg')?.getAttribute('tabindex')).toBe('-1')
    expect(container.querySelector('[data-ts-focus-layer]')).toBeNull()
    adapter.destroy()
  })

  it('forces a non-focusable renderer prerender when focus is disabled', () => {
    const adapter = createChartRendererAdapter({
      definition: focusDisabledDefinition,
      renderer: createSvgChartRenderer<(typeof rows)[number], number, number>(
        renderChartSvg,
      ),
      width: 480,
      height: 260,
      ariaLabel: 'Static revenue',
      tabIndex: 4,
    })
    const container = document.createElement('div')
    container.innerHTML = adapter.prerender()

    expect(container.querySelector('svg')?.getAttribute('tabindex')).toBe('-1')
    expect(container.querySelector('[data-ts-focus-layer]')).toBeNull()
    adapter.destroy()
  })

  it('normalizes initial adapter geometry', () => {
    expect(
      resolveChartAdapterLayout({
        width: 900,
        initialWidth: 480,
        aspectRatio: 3,
      }),
    ).toEqual({
      aspectRatio: 3,
      initialWidth: 900,
      initialHeight: 300,
    })
    expect(
      resolveChartAdapterLayout({
        width: 480,
        aspectRatio: Number.NaN,
      }),
    ).toEqual({
      aspectRatio: undefined,
      initialWidth: 480,
      initialHeight: 320,
    })
  })
})
