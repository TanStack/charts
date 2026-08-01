import { describe, expect, it, vi } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import { lineY } from './line'
import { mountChartRenderer } from './renderer'
import { defineChart } from './scene'
import { tooltip as tooltipExtension } from './tooltip'
import { portal as portalExtension } from './tooltip-portal'
import type {
  ChartRenderer,
  ChartSurface,
  ChartSurfaceRenderOptions,
} from './dom-types'
import type { ChartPoint, ChartScene, ChartTooltipAnchorContext } from './types'

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
      definition: {
        ...definition,
        maxFocusDistance: 1_000,
        tooltip: tooltipExtension,
      },
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Renderer-neutral chart',
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
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]?.primary.datum).toBe(data[0])
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      source: 'pointer',
      pinned: false,
    })
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
    expect(fake.paintFocus.mock.calls.at(-1)?.[0]).toMatchObject({
      source: 'keyboard',
      pinned: true,
    })

    host.destroy()
    host.destroy()
    expect(fake.destroy).toHaveBeenCalledOnce()
    expect(container.childElementCount).toBe(0)
  })

  it('lets a spatial index fully own pointer resolution', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const findNearest = vi.fn()
    const spatialIndex = vi.fn(
      (points: readonly ChartPoint<Datum, number, number>[]) => {
        findNearest.mockReturnValue(points[1] ?? null)
        return { findNearest }
      },
    )
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, { spatialIndex }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Indexed chart',
      onFocusChange,
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      }),
    )

    const firstPoint = host.getScene().points[0]!
    expect(findNearest).toHaveBeenCalledWith(firstPoint.x, firstPoint.y, 48)
    expect(onFocusChange).toHaveBeenLastCalledWith(host.getScene().points[1])
    host.destroy()
  })

  it('anchors to the pointer, follows placement fallbacks, and clears pointer state for keyboard focus', () => {
    const fake = createFakeRenderer()
    fake.clientToScene.mockReturnValue({ x: 20, y: 20 })
    const container = document.createElement('div')
    const pointerDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: {
        use: tooltipExtension,
        anchor: 'pointer',
        placement: ['top', 'bottom-right'],
        offset: 12,
      },
    })
    const options = {
      definition: pointerDefinition,
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Positioned tooltip',
    }
    const host = mountChartRenderer(container, options)

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!tooltip) throw new Error('Expected chart tooltip')
    Object.defineProperties(tooltip, {
      offsetWidth: { configurable: true, value: 100 },
      offsetHeight: { configurable: true, value: 40 },
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    expect(tooltip.dataset.placement).toBe('bottom-right')
    expect(tooltip.style.left).toBe('32px')
    expect(tooltip.style.top).toBe('32px')

    const pointers: Array<{ x: number; y: number } | null> = []
    const customDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: {
        use: tooltipExtension,
        anchor(_points, context) {
          pointers.push(context.pointer)
          return { x: 300, y: 120 }
        },
        placement: 'left',
        offset: 5,
      },
    })
    host.update({ ...options, definition: customDefinition })

    expect(pointers.at(-1)).toEqual({ x: 20, y: 20 })
    expect(tooltip.dataset.placement).toBe('left')
    expect(tooltip.style.left).toBe('195px')
    expect(tooltip.style.top).toBe('100px')

    fake.element.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    expect(pointers.at(-1)).toBeNull()
    host.destroy()
  })

  it('resolves tooltip coordinates independently and exposes complete anchor context', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    let anchorContext:
      ChartTooltipAnchorContext<Datum, number, number> | undefined
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: {
          use: tooltipExtension,
          anchor: { x: 'plot-center', y: 'plot-top' },
          placement: 'bottom',
          offset: 12,
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Axis-anchored tooltip',
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!tooltip) throw new Error('Expected chart tooltip')
    expect(tooltip.style.left).toBe('240px')
    expect(tooltip.style.top).toBe('12px')

    host.update({
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: {
          use: tooltipExtension,
          anchor(points, context) {
            anchorContext = context
            return {
              x: context.scales.x.map(points[0]!.xValue),
              y: context.plot.y,
            }
          },
          placement: 'bottom',
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Callback-anchored tooltip',
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    expect(anchorContext).toMatchObject({
      plot: host.getScene().chart,
      surface: { width: 480, height: 260 },
      focus: {
        source: 'pointer',
        pinned: false,
      },
    })
    expect(anchorContext?.focus.primary.datum).toBe(data[0])
    expect(anchorContext?.focus.group).toHaveLength(1)
    host.destroy()
  })

  it('orders tooltip body and anchor points without reordering focus callbacks', () => {
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    const focusedGroups: string[][] = []
    const tooltipGroups: string[][] = []
    const anchorGroups: string[][] = []
    let tooltipContent: unknown
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        focus: {
          resolve: (points) => points,
          group: (points) => points,
          navigation: (points) => points,
        },
        tooltip: {
          use: tooltipExtension,
          sort: (left, right) => right.yValue - left.yValue,
          anchor(points) {
            anchorGroups.push(points.map((point) => point.datum.id))
            return { x: 240, y: 130 }
          },
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Ordered tooltip body',
      onFocusGroupChange(points) {
        focusedGroups.push(points.map((point) => point.datum.id))
      },
      onTooltipBodyChange(target) {
        if (!target) return
        tooltipGroups.push(target.points.map((point) => point.datum.id))
        tooltipContent = target.content
      },
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    expect(focusedGroups.at(-1)).toEqual(['a', 'b'])
    expect(tooltipGroups.at(-1)).toEqual(['b', 'a'])
    expect(anchorGroups.at(-1)).toEqual(['b', 'a'])
    expect(tooltipContent).toMatchObject({
      rows: [{ value: '1 · 8' }, { value: '0 · 4' }],
    })
    host.destroy()
  })

  it('uses the tooltip as a top-layer popover, retains ancestry, and reopens it while active', () => {
    const popover = installPopoverMock(window)
    const viewport = installVisualViewport(window, {
      left: 600,
      top: 100,
      width: 400,
      height: 300,
    })
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    document.body.append(container)
    let surfaceLeft = 800
    vi.spyOn(fake.element, 'getBoundingClientRect').mockImplementation(() => ({
      x: surfaceLeft,
      y: 200,
      top: 200,
      right: surfaceLeft + 240,
      bottom: 330,
      left: surfaceLeft,
      width: 240,
      height: 130,
      toJSON: () => ({}),
    }))
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: {
          use: tooltipExtension,
          portal: portalExtension,
          anchor: () => ({ x: 240, y: 130 }),
          placement: ['right', 'left'],
          offset: 10,
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Portaled tooltip',
    })

    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )
    const tooltip = container.querySelector<HTMLElement>(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="popover"]',
    )
    if (!tooltip) throw new Error('Expected portaled tooltip')
    Object.defineProperties(tooltip, {
      offsetWidth: { configurable: true, value: 200 },
      offsetHeight: { configurable: true, value: 40 },
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )

    expect(container.contains(tooltip)).toBe(true)
    expect(tooltip.getAttribute('popover')).toBe('manual')
    expect(popover.isOpen(tooltip)).toBe(true)
    expect(tooltip.style.position).toBe('fixed')
    expect(tooltip.dataset.placement).toBe('left')
    expect(tooltip.style.left).toBe('710px')
    expect(tooltip.style.top).toBe('245px')

    tooltip.hidePopover()
    expect(popover.isOpen(tooltip)).toBe(false)
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )
    expect(popover.isOpen(tooltip)).toBe(true)
    expect(popover.show).toHaveBeenCalledTimes(2)

    surfaceLeft = 1_200
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )
    expect(tooltip.hidden).toBe(true)
    expect(popover.isOpen(tooltip)).toBe(false)

    surfaceLeft = 800
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 120,
        clientY: 220,
      }),
    )
    expect(tooltip.hidden).toBe(false)
    expect(popover.isOpen(tooltip)).toBe(true)

    host.destroy()
    expect(tooltip.isConnected).toBe(false)
    container.remove()
    viewport.restore()
    popover.restore()
  })

  it('falls back to independent owner-document body portals and cleans up each host', () => {
    const popover = disablePopover(window)
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const first = createFakeRenderer()
    const second = createFakeRenderer()
    const firstContainer = document.createElement('div')
    const secondContainer = document.createElement('div')
    const bounds = {
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    }
    vi.spyOn(first.element, 'getBoundingClientRect').mockReturnValue(bounds)
    vi.spyOn(second.element, 'getBoundingClientRect').mockReturnValue(bounds)
    const portalDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: { use: tooltipExtension, portal: portalExtension },
    })
    const firstHost = mountChartRenderer(firstContainer, {
      definition: portalDefinition,
      renderer: first.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'First portaled tooltip',
    })
    const secondHost = mountChartRenderer(secondContainer, {
      definition: portalDefinition,
      renderer: second.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Second portaled tooltip',
    })

    first.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    second.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )

    const tooltips = document.querySelectorAll(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="fallback"]',
    )
    expect(tooltips).toHaveLength(2)
    expect(tooltips[0]?.parentNode).toBe(document.body)
    expect(tooltips[1]?.parentNode).toBe(document.body)
    expect((tooltips[0] as HTMLElement).style.zIndex).toBe('2147483647')

    firstHost.destroy()
    expect(
      document.querySelectorAll(
        '.ts-chart-tooltip[data-ts-chart-tooltip-portal="fallback"]',
      ),
    ).toHaveLength(1)
    expect(
      removeEventListener.mock.calls.filter(([type]) => type === 'scroll'),
    ).toHaveLength(1)
    secondHost.destroy()
    expect(
      document.querySelector('.ts-chart-tooltip[data-ts-chart-tooltip-portal]'),
    ).toBeNull()
    expect(
      removeEventListener.mock.calls.filter(([type]) => type === 'scroll'),
    ).toHaveLength(2)
    removeEventListener.mockRestore()
    popover.restore()
  })

  it('moves an active tooltip between top-layer and local modes', () => {
    const popover = installPopoverMock(window)
    const fake = createFakeRenderer()
    const container = document.createElement('div')
    document.body.append(container)
    vi.spyOn(fake.element, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    })
    const common = {
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Switchable tooltip',
    }
    const portalDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: { use: tooltipExtension, portal: portalExtension },
    })
    const localDefinition = defineChart(definition, {
      maxFocusDistance: 1_000,
      tooltip: tooltipExtension,
    })
    const host = mountChartRenderer(container, {
      ...common,
      definition: portalDefinition,
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    if (!tooltip) throw new Error('Expected tooltip')

    host.update({ ...common, definition: localDefinition })
    expect(container.contains(tooltip)).toBe(true)
    expect(tooltip.style.position).toBe('absolute')
    expect(tooltip.hasAttribute('popover')).toBe(false)
    expect(tooltip.dataset.tsChartTooltipPortal).toBeUndefined()
    expect(popover.isOpen(tooltip)).toBe(false)

    host.update({ ...common, definition: portalDefinition })
    expect(container.contains(tooltip)).toBe(true)
    expect(tooltip.style.position).toBe('fixed')
    expect(tooltip.getAttribute('popover')).toBe('manual')
    expect(tooltip.dataset.tsChartTooltipPortal).toBe('popover')
    expect(popover.isOpen(tooltip)).toBe(true)

    host.update({
      ...common,
      definition: defineChart(definition, { tooltip: false }),
    })
    expect(tooltip.hidden).toBe(true)
    expect(container.contains(tooltip)).toBe(true)
    expect(tooltip.hasAttribute('popover')).toBe(false)
    expect(tooltip.dataset.tsChartTooltipPortal).toBeUndefined()
    host.destroy()
    container.remove()
    popover.restore()
  })

  it('replaces a renderer without orphaning its portaled tooltip', () => {
    const popover = installPopoverMock(window)
    const first = createFakeRenderer('shared-id')
    const second = createFakeRenderer('shared-id')
    const bounds = {
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    }
    vi.spyOn(first.element, 'getBoundingClientRect').mockReturnValue(bounds)
    vi.spyOn(second.element, 'getBoundingClientRect').mockReturnValue(bounds)
    const container = document.createElement('div')
    document.body.append(container)
    const options = {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: { use: tooltipExtension, portal: portalExtension },
      }),
      renderer: first.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Replaceable portal renderer',
    }
    const host = mountChartRenderer(container, options)
    first.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const previousTooltip = container.querySelector<HTMLElement>(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="popover"]',
    )
    if (!previousTooltip) throw new Error('Expected portaled tooltip')

    host.update({ ...options, renderer: second.renderer })

    const nextTooltips = container.querySelectorAll(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="popover"]',
    )
    expect(previousTooltip.isConnected).toBe(false)
    expect(nextTooltips).toHaveLength(1)
    expect(nextTooltips[0]).not.toBe(previousTooltip)
    expect(popover.isOpen(nextTooltips[0] as HTMLElement)).toBe(true)
    host.destroy()
    expect(
      container.querySelector(
        '.ts-chart-tooltip[data-ts-chart-tooltip-portal]',
      ),
    ).toBeNull()
    container.remove()
    popover.restore()
  })

  it('repositions a portaled tooltip after scroll, resize, and observed content changes', () => {
    const popover = disablePopover(window)
    let resize: ResizeObserverCallback | undefined
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    const originalResizeObserver = window.ResizeObserver
    window.ResizeObserver = TestResizeObserver
    const frames: FrameRequestCallback[] = []
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback)
        return frames.length
      })
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {})
    const fake = createFakeRenderer()
    let surfaceLeft = 100
    vi.spyOn(fake.element, 'getBoundingClientRect').mockImplementation(() => ({
      x: surfaceLeft,
      y: 200,
      top: 200,
      right: surfaceLeft + 240,
      bottom: 330,
      left: surfaceLeft,
      width: 240,
      height: 130,
      toJSON: () => ({}),
    }))
    const container = document.createElement('div')
    const host = mountChartRenderer(container, {
      definition: defineChart(definition, {
        maxFocusDistance: 1_000,
        tooltip: {
          use: tooltipExtension,
          portal: portalExtension,
          anchor: () => ({ x: 240, y: 130 }),
          placement: 'top',
          offset: 10,
        },
      }),
      renderer: fake.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Repositioned portal tooltip',
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    const tooltip = document.querySelector<HTMLElement>(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="fallback"]',
    )
    if (!tooltip) throw new Error('Expected portaled tooltip')
    Object.defineProperties(tooltip, {
      offsetWidth: { configurable: true, value: 100 },
      offsetHeight: { configurable: true, value: 40 },
    })
    fake.element.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    )
    expect(tooltip.style.left).toBe('170px')

    surfaceLeft = 140
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('resize'))
    expect(frames).toHaveLength(1)
    frames.shift()?.(0)
    expect(tooltip.style.left).toBe('210px')

    Object.defineProperty(tooltip, 'offsetWidth', {
      configurable: true,
      value: 160,
    })
    resize?.([], {} as ResizeObserver)
    expect(frames).toHaveLength(1)
    frames.shift()?.(0)
    expect(tooltip.style.left).toBe('180px')

    host.destroy()
    window.ResizeObserver = originalResizeObserver
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
    popover.restore()
  })

  it('replaces a changed renderer once and restores focused tooltip state', () => {
    const first = createFakeRenderer('shared-id')
    const second = createFakeRenderer('shared-id')
    const container = document.createElement('div')
    const options = {
      definition: {
        ...definition,
        maxFocusDistance: 1_000,
        tooltip: tooltipExtension,
        animate: true,
      },
      renderer: first.renderer,
      width: 480,
      height: 260,
      ariaLabel: 'Replaceable renderer',
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
    expect(second.paintFocus.mock.calls.at(-1)?.[0]?.primary.datum).toBe(
      data[0],
    )
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
      definition: defineChart(definition, {
        animate: { duration: 120 },
      }),
      renderer: fake.renderer,
      height: 260,
      ariaLabel: 'Responsive animation',
    }
    const host = mountChartRenderer(container, options)

    width = 480
    resize?.([], {} as ResizeObserver)
    frames.shift()?.(0)

    expect(fake.render.mock.calls[1]?.[1].animation).toBeUndefined()

    host.update({
      ...options,
      definition: defineChart(definition, {
        animate: { duration: 120, resize: true },
      }),
    })
    width = 640
    resize?.([], {} as ResizeObserver)
    frames.shift()?.(0)

    expect(fake.render.mock.calls[3]?.[1].animation).toEqual({
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
      definition: defineChart(definition, {
        animate: { duration: 120 },
      }),
      renderer: fake.renderer,
      width: 320,
      height: 260,
      ariaLabel: 'Explicit size animation',
    }
    const host = mountChartRenderer(container, options)

    host.update({ ...options, width: 480 })
    expect(fake.render.mock.calls[1]?.[1].animation).toBeUndefined()

    host.update({
      ...options,
      width: 640,
      definition: defineChart(definition, {
        animate: { duration: 120, resize: true },
      }),
    })
    expect(fake.render.mock.calls[2]?.[1].animation).toEqual({
      duration: 120,
    })

    host.destroy()
  })
})

function installPopoverMock(view: Window & typeof globalThis) {
  const prototype = view.HTMLElement.prototype
  const showDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'showPopover',
  )
  const hideDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'hidePopover',
  )
  const matchesDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'matches',
  )
  const matches = prototype.matches
  const open = new WeakSet<HTMLElement>()
  const show = vi.fn(function (this: HTMLElement) {
    if (
      !this.isConnected ||
      this.hidden ||
      this.getAttribute('popover') !== 'manual'
    ) {
      throw new Error('Popover is not ready to show')
    }
    open.add(this)
  })
  const hide = vi.fn(function (this: HTMLElement) {
    open.delete(this)
  })
  Object.defineProperties(prototype, {
    showPopover: { configurable: true, value: show },
    hidePopover: { configurable: true, value: hide },
    matches: {
      configurable: true,
      value(this: HTMLElement, selector: string) {
        return selector === ':popover-open'
          ? open.has(this)
          : matches.call(this, selector)
      },
    },
  })
  return {
    show,
    hide,
    isOpen: (element: HTMLElement) => open.has(element),
    restore() {
      restoreProperty(prototype, 'showPopover', showDescriptor)
      restoreProperty(prototype, 'hidePopover', hideDescriptor)
      restoreProperty(prototype, 'matches', matchesDescriptor)
    },
  }
}

function disablePopover(view: Window & typeof globalThis) {
  const prototype = view.HTMLElement.prototype
  const showDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'showPopover',
  )
  const hideDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'hidePopover',
  )
  Object.defineProperties(prototype, {
    showPopover: { configurable: true, value: undefined },
    hidePopover: { configurable: true, value: undefined },
  })
  return {
    restore() {
      restoreProperty(prototype, 'showPopover', showDescriptor)
      restoreProperty(prototype, 'hidePopover', hideDescriptor)
    },
  }
}

function installVisualViewport(
  view: Window & typeof globalThis,
  bounds: { left: number; top: number; width: number; height: number },
) {
  const descriptor = Object.getOwnPropertyDescriptor(view, 'visualViewport')
  const viewport = new EventTarget()
  Object.defineProperties(viewport, {
    offsetLeft: { value: bounds.left },
    offsetTop: { value: bounds.top },
    width: { value: bounds.width },
    height: { value: bounds.height },
  })
  Object.defineProperty(view, 'visualViewport', {
    configurable: true,
    value: viewport,
  })
  return {
    restore() {
      restoreProperty(view, 'visualViewport', descriptor)
    },
  }
}

function restoreProperty(
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) Object.defineProperty(target, key, descriptor)
  else Reflect.deleteProperty(target, key)
}

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
