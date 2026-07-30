import { describe, expect, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { lineY } from './line'
import { mountChartRenderer } from './renderer'
import { defineChart } from './scene'
import type {
  ChartRenderer,
  ChartScene,
  ChartSurface,
  ChartSurfaceRenderOptions,
} from './types'

interface Datum {
  id: string
  x: number
  y: number
}

const data = [
  { id: 'a', x: 0, y: 4 },
  { id: 'b', x: 1, y: 8 },
]

const definition = defineChart({
  marks: [
    lineY(data, {
      x: 'x',
      y: 'y',
      key: 'id',
      stroke: '#2563eb',
    }),
  ],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 8]) },
  guides: false,
})

describe('renderer-neutral chart host', () => {
  it('delegates rendering, coordinates, focus, keyboard, and selection to a surface', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const query = vi.spyOn(container, 'querySelector')
    const onFocusChange = vi.fn()
    const onSelect = vi.fn()
    const onRender = vi.fn()
    const host = mountChartRenderer(container, {
      definition,
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Renderer-neutral chart',
      maxFocusDistance: 1_000,
      tooltip: true,
      onFocusChange,
      onSelect,
      onRender,
    })

    expect(fake.mount).toHaveBeenCalledOnce()
    expect(fake.render).toHaveBeenCalledOnce()
    expect(fake.render.mock.calls[0]?.[0]).toBe(host.getScene())
    expect(fake.render.mock.calls[0]?.[1]).toMatchObject({
      ariaLabel: 'Renderer-neutral chart',
      tabIndex: 0,
    })
    expect(onRender).toHaveBeenCalledWith({
      container,
      scene: host.getScene(),
      surface: fake.surface,
    })
    expect(query).not.toHaveBeenCalledWith('svg')
    expect(query).not.toHaveBeenCalledWith('svg.ts-chart')
    expect(query).not.toHaveBeenCalledWith('[data-ts-chart-focus]')

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 123,
        clientY: 45,
      }),
    )

    expect(fake.clientToScene).toHaveBeenLastCalledWith(
      host.getScene(),
      123,
      45,
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(
      container.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden,
    ).toBe(false)

    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!tooltip) throw new Error('Expected chart tooltip')
    Object.defineProperties(tooltip, {
      offsetWidth: { configurable: true, value: 200 },
      offsetHeight: { configurable: true, value: 40 },
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 123,
        clientY: 45,
      }),
    )
    const firstPoint = host.getScene().points[0]
    if (!firstPoint) throw new Error('Expected first chart point')
    expect(tooltip.style.left).toBe(
      `${Math.max(8, Math.min(272, firstPoint.x - 100))}px`,
    )
    expect(Number.parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(8)
    expect(Number.parseFloat(tooltip.style.left) + 200).toBeLessThanOrEqual(472)
    expect(Number.parseFloat(tooltip.style.top)).toBeGreaterThanOrEqual(8)
    expect(Number.parseFloat(tooltip.style.top) + 40).toBeLessThanOrEqual(252)

    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])

    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
    )
    expect(onSelect.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])

    host.destroy()
    host.destroy()
    expect(fake.destroy).toHaveBeenCalledOnce()
    expect(container.childElementCount).toBe(0)
  })

  it('replaces a changed renderer once and restores focused tooltip state', () => {
    const first = createFakeRenderer('shared-id')
    const second = createFakeRenderer('shared-id')
    const container = document.createElement('div')
    const options = {
      definition,
      renderer: first.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Replaceable renderer',
      maxFocusDistance: 1_000,
      tooltip: true,
      animate: true,
    }
    const host = mountChartRenderer(container, options)

    first.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 30,
      }),
    )
    const previousTooltip =
      container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(previousTooltip?.hidden).toBe(false)

    host.update({ ...options, renderer: second.renderer })

    expect(first.destroy).toHaveBeenCalledOnce()
    expect(first.element.isConnected).toBe(false)
    expect(second.mount).toHaveBeenCalledOnce()
    expect(second.render).toHaveBeenCalledOnce()
    expect(second.render.mock.calls[0]?.[1].animation).toBeUndefined()
    expect(second.paintFocus.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    const nextTooltip =
      container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(nextTooltip).not.toBe(previousTooltip)
    expect(nextTooltip && container.contains(nextTooltip)).toBe(true)
    expect(nextTooltip?.hidden).toBe(false)

    host.update({
      ...options,
      renderer: second.renderer,
      ariaLabel: 'Updated renderer',
    })

    expect(second.mount).toHaveBeenCalledOnce()
    expect(second.render).toHaveBeenCalledTimes(2)
    expect(second.render.mock.calls[1]?.[1]).toMatchObject({
      ariaLabel: 'Updated renderer',
      animation: {},
    })
    host.destroy()
    expect(second.destroy).toHaveBeenCalledOnce()
  })

  it('coalesces render requests made by the active surface', () => {
    const fake = createFakeRenderer()
    const callbacks: FrameRequestCallback[] = []
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callbacks.push(callback)
        return callbacks.length
      })
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    const container = document.createElement('div')
    const host = mountChartRenderer(container, {
      definition,
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Requested render',
    })

    fake.requestRender?.(true)
    fake.requestRender?.(true)
    fake.requestRender?.(true)

    expect(callbacks).toHaveLength(1)
    callbacks.shift()?.(0)
    expect(fake.render).toHaveBeenCalledTimes(2)

    host.destroy()
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('skips resize animation by default and supports an explicit opt-in', () => {
    let resize: ResizeObserverCallback | undefined
    let width = 320
    const frames: FrameRequestCallback[] = []
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
      }
      observe() {}
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
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    vi.spyOn(container, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      top: 0,
      right: width,
      bottom: 260,
      left: 0,
      width,
      height: 260,
      toJSON: () => ({}),
    }))
    const options = {
      definition,
      renderer: fake.renderer,
      height: 260,
      ariaLabel: 'Responsive animation',
      animate: { duration: 120 },
    }
    const host = mountChartRenderer(container, options)

    width = 480
    resize?.([], {} as ResizeObserver)
    frames.shift()?.(0)

    expect(fake.render.mock.calls[1]?.[1].animation).toBeUndefined()

    host.update({
      ...options,
      animate: { duration: 120, resize: true },
    })
    width = 640
    resize?.([], {} as ResizeObserver)
    frames.shift()?.(0)

    expect(fake.render.mock.calls[2]?.[1].animation).toEqual({
      duration: 120,
    })

    host.destroy()
    window.ResizeObserver = originalResizeObserver
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('applies resize animation policy to explicit size updates', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const options = {
      definition,
      renderer: fake.renderer,
      width: 320,
      height: 260,
      ariaLabel: 'Explicit size animation',
      animate: { duration: 120 },
    }
    const host = mountChartRenderer(container, options)

    host.update({ ...options, width: 480 })
    expect(fake.render.mock.calls[1]?.[1].animation).toBeUndefined()

    host.update({
      ...options,
      width: 640,
      animate: { duration: 120, resize: true },
    })
    expect(fake.render.mock.calls[2]?.[1].animation).toEqual({
      duration: 120,
    })

    host.destroy()
  })
})

interface FakeRenderer {
  renderer: ChartRenderer<Datum, number, number>
  surface: ChartSurface<Datum, number, number>
  element: HTMLDivElement
  mount: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
  clientToScene: ReturnType<typeof vi.fn>
  paintFocus: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  requestRender?: (force?: boolean) => void
}

function createFakeRenderer(id = 'fake'): FakeRenderer {
  const element = document.createElement('div')
  element.className = 'test-chart-surface'
  const render = vi.fn(
    (
      _scene: ChartScene<Datum, number, number>,
      options: ChartSurfaceRenderOptions,
    ) => {
      element.tabIndex = options.tabIndex ?? 0
      element.setAttribute('aria-label', options.ariaLabel)
    },
  )
  const clientToScene = vi.fn((scene: ChartScene<Datum, number, number>) => {
    const point = scene.points[0]
    return point ? { x: point.x, y: point.y } : null
  })
  const paintFocus = vi.fn()
  const destroy = vi.fn()
  let renderer!: ChartRenderer<Datum, number, number>
  const surface: ChartSurface<Datum, number, number> = {
    get renderer() {
      return renderer
    },
    element,
    render,
    clientToScene,
    paintFocus,
    destroy,
  }
  const result = {} as FakeRenderer
  const mount = vi.fn(
    (container: HTMLElement, requestRender: (force?: boolean) => void) => {
      result.requestRender = requestRender
      container.append(element)
      return surface
    },
  )
  renderer = {
    id,
    prerender: () => '<div class="test-chart-surface"></div>',
    mount,
  }
  Object.assign(result, {
    renderer,
    surface,
    element,
    mount,
    render,
    clientToScene,
    paintFocus,
    destroy,
  })
  return result
}

interface CategoricalDatum {
  id: string
  category: string
  value: number
}

const categoricalRows: readonly CategoricalDatum[] = [
  { id: 'a', category: 'Alpha', value: 4 },
]
const categoricalDefinition = defineChart({
  marks: [
    lineY(categoricalRows, {
      x: 'category',
      y: 'value',
      key: 'id',
    }),
  ],
  x: { scale: scaleBand<string>().domain(['Alpha']) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

if (false) {
  const container = document.createElement('div')
  mountChartRenderer(container, {
    definition: categoricalDefinition,
    ariaLabel: 'Inferred renderer',
    renderer: {
      id: 'inferred',
      prerender(scene) {
        expectTypeOf(scene.points).items.toMatchTypeOf<{
          datum: CategoricalDatum
          xValue: string
          yValue: number
        }>()
        return ''
      },
      mount() {
        return null as unknown as ChartSurface<CategoricalDatum, string, number>
      },
    },
  })

  const numericRenderer = null as unknown as ChartRenderer<
    CategoricalDatum,
    number,
    number
  >
  mountChartRenderer<CategoricalDatum, string, number>(container, {
    definition: categoricalDefinition,
    ariaLabel: 'Incompatible renderer',
    // @ts-expect-error A numeric-x renderer cannot consume a string-x scene.
    renderer: numericRenderer,
  })
}
