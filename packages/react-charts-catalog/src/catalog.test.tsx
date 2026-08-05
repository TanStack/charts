import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { catalogCases } from './index'
import type { ComponentType } from 'react'
import type { CatalogChartProps } from './index'

const caseModules = import.meta.glob<{
  default: ComponentType<CatalogChartProps>
}>('./cases/*.ts', { eager: true })
const caseComponents = new Map<string, ComponentType<CatalogChartProps>>()
for (const [path, module] of Object.entries(caseModules)) {
  caseComponents.set(
    path.slice('./cases/'.length, -'.ts'.length),
    module.default,
  )
}

function component(id: string) {
  const Component = caseComponents.get(id)
  if (!Component) throw new Error(`Missing catalog component ${id}`)
  return Component
}

const MultiLineEndLabels = component('02-multi-line-end-labels')
const GroupedReducerBars = component('59-grouped-reducer-bars')
const InteractiveLegend = component('81-recharts-interactive-legend')
const ComparativeRadar = component('99-comparative-radar')

describe('@tanstack/react-charts-catalog', () => {
  it('server-renders complete chart SVG', () => {
    const html = renderToStaticMarkup(
      <MultiLineEndLabels
        initialWidth={480}
        height={270}
        idPrefix="catalog-multi-line-end-labels"
      />,
    )

    expect(html).toContain('<svg')
    expect(html).toContain('viewBox="0 0 480 270"')
    expect(html).toContain('Unemployment by industry with direct end labels')
    expect(html).toContain('<path')
  })

  it('server-renders a responsive aspect-ratio chart', () => {
    const html = renderToStaticMarkup(
      <MultiLineEndLabels
        initialWidth={480}
        aspectRatio={1.5}
        idPrefix="catalog-responsive-multi-line-end-labels"
      />,
    )

    expect(html).toContain('viewBox="0 0 480 320"')
    expect(html).toContain('aspect-ratio:1.5')
    expect(html).not.toContain('aspect-ratio:1.5px')
    expect(html).not.toContain('height:320px')
  })

  it('server-renders a responsive aspect-ratio custom view', () => {
    const html = renderToStaticMarkup(
      <InteractiveLegend
        initialWidth={480}
        aspectRatio={1.5}
        idPrefix="catalog-responsive-interactive-legend"
      />,
    )

    expect(html).toContain('aspect-ratio:1.5')
    expect(html).toContain('contain:size')
    expect(html).not.toContain('aspect-ratio:1.5px')
    expect(html).toContain('width:480px;height:320px')
  })

  it('uses a fixed width in the initial chart definition and SVG', () => {
    const html = renderToStaticMarkup(
      <GroupedReducerBars
        initialWidth={640}
        width={360}
        height={240}
        revision={1}
        interactive
        idPrefix="catalog-grouped-reducer-bars"
      />,
    )

    expect(html).toContain('viewBox="0 0 360 240"')
    expect(html).toContain('Mean penguin body mass by species')
    expect(html).toContain('<rect')
  })

  it('rebuilds descriptor definitions from an omitted-width measurement', async () => {
    let resize: ResizeObserverCallback | undefined
    let observer: ResizeObserver | undefined
    let observed: Element | undefined
    let measuredWidth = 640
    const frames: FrameRequestCallback[] = []
    class TestResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
        observer = this
      }
      observe(target: Element) {
        observed = target
      }
      disconnect() {}
      unobserve() {}
    }
    const originalResizeObserver = window.ResizeObserver
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback)
        return frames.length
      })
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    window.ResizeObserver = TestResizeObserver
    const target = document.createElement('div')
    const root = createRoot(target)

    try {
      await act(async () => {
        root.render(
          <ComparativeRadar
            initialWidth={640}
            height={270}
            idPrefix="responsive-comparative-radar"
          />,
        )
      })
      const surface = target.querySelector<HTMLElement>('.ts-chart-surface')
      if (!surface || !resize || !observer) {
        throw new Error('Expected a responsive catalog chart')
      }
      expect(observed).toBe(surface)
      vi.spyOn(surface, 'getBoundingClientRect').mockImplementation(() => ({
        x: 0,
        y: 0,
        top: 0,
        right: measuredWidth,
        bottom: 270,
        left: 0,
        width: measuredWidth,
        height: 270,
        toJSON: () => ({}),
      }))
      const wideSvg = surface.querySelector('svg')?.outerHTML
      const expected = document.createElement('div')
      expected.innerHTML = renderToStaticMarkup(
        <ComparativeRadar
          width={360}
          height={270}
          idPrefix="responsive-comparative-radar"
        />,
      )
      const expectedSvg = expected.querySelector('svg')?.outerHTML
      const resizeChart = resize
      const chartObserver = observer

      measuredWidth = 360
      await act(async () => {
        resizeChart([], chartObserver)
        frames.shift()?.(0)
      })

      expect(surface.querySelector('svg')?.outerHTML).not.toBe(wideSvg)
      expect(surface.querySelector('svg')?.outerHTML).toBe(expectedSvg)
    } finally {
      await act(async () => root.unmount())
      window.ResizeObserver = originalResizeObserver
      requestFrame.mockRestore()
      cancelFrame.mockRestore()
    }
  })

  it('updates custom views from an omitted-width measurement', async () => {
    let resize: ResizeObserverCallback | undefined
    let observer: ResizeObserver | undefined
    let observed: Element | undefined
    let measuredWidth = 640
    class TestResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
        observer = this
      }
      observe(target: Element) {
        observed = target
      }
      disconnect() {}
      unobserve() {}
    }
    const originalResizeObserver = window.ResizeObserver
    window.ResizeObserver = TestResizeObserver
    const target = document.createElement('div')
    const root = createRoot(target)

    try {
      await act(async () => {
        root.render(
          <InteractiveLegend
            initialWidth={640}
            height={270}
            idPrefix="responsive-interactive-legend"
          />,
        )
      })
      const container = target.firstElementChild
      if (!(container instanceof HTMLElement) || !resize || !observer) {
        throw new Error('Expected a responsive custom catalog view')
      }
      expect(observed).toBe(container)
      vi.spyOn(container, 'getBoundingClientRect').mockImplementation(() => ({
        x: 0,
        y: 0,
        top: 0,
        right: measuredWidth,
        bottom: 270,
        left: 0,
        width: measuredWidth,
        height: 270,
        toJSON: () => ({}),
      }))
      const resizeView = resize
      const viewObserver = observer

      measuredWidth = 360
      await act(async () => resizeView([], viewObserver))

      expect(
        container.querySelector<HTMLElement>('[data-conformance-view="main"]')
          ?.style.width,
      ).toBe('360px')
      expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
        '0 0 360 208',
      )
    } finally {
      await act(async () => root.unmount())
      window.ResizeObserver = originalResizeObserver
    }
  })

  it('publishes every conformance case in catalog order', () => {
    expect(catalogCases).toHaveLength(109)
    expect(caseComponents.size).toBe(catalogCases.length)
    expect([...caseComponents.keys()].sort()).toEqual(
      catalogCases.map(({ id }) => id).sort(),
    )
    expect(catalogCases.map(({ order }) => order)).toEqual(
      [...catalogCases]
        .map(({ order }) => order)
        .sort((left, right) => left - right),
    )
  })

  it('server-renders all cases together without duplicate or broken IDs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let html = ''
    try {
      html = renderToStaticMarkup(
        <>
          {catalogCases.map(({ id }) => {
            const Component = component(id)
            return (
              <section key={id} data-catalog-case={id}>
                <Component
                  initialWidth={480}
                  height={270}
                  idPrefix={`catalog-${id}`}
                />
              </section>
            )
          })}
        </>,
      )
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }

    for (const { id } of catalogCases) {
      const start = html.indexOf(`<section data-catalog-case="${id}">`)
      const end = html.indexOf('</section>', start)
      expect(start, id).toBeGreaterThanOrEqual(0)
      expect(html.slice(start, end), id).toContain('<svg')
    }

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
    expect(new Set(ids).size).toBe(ids.length)
    const knownIds = new Set(ids)
    for (const match of html.matchAll(/url\(#([^)]+)\)|\shref="#([^"]+)"/g)) {
      const reference = match[1] ?? match[2]
      if (reference) expect(knownIds.has(reference), reference).toBe(true)
    }
    for (const match of html.matchAll(
      /\s(aria-labelledby|aria-describedby)="([^"]+)"/g,
    )) {
      for (const reference of match[2]?.split(/\s+/) ?? []) {
        expect(knownIds.has(reference), `${match[1]}=${reference}`).toBe(true)
      }
    }
  }, 30_000)

  it('keeps each generated wrapper responsive to a fixed width', () => {
    for (const { id } of catalogCases) {
      const Component = component(id)
      const html = renderToStaticMarkup(
        <Component
          initialWidth={480}
          width={360}
          height={270}
          idPrefix={`responsive-${id}`}
        />,
      )
      const expectedViewportWidth =
        id === '84-pinned-nested-chart-tooltip' ? 336 : 360
      expect(html, id).toContain(`viewBox="0 0 ${expectedViewportWidth} `)
      if (id === '84-pinned-nested-chart-tooltip') {
        expect(html, id).toContain('width:360px')
      }
    }
  }, 30_000)
})
