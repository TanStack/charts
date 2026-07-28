import { describe, expect, it, vi } from 'vitest'
import { mountChart } from './dom'
import { barY } from './bar'
import { lineY } from './line'
import { createChartRuntime } from './runtime'
import { defineChart } from './scene'
import { renderChartSvgWithResources } from './svg-resources'
import { focusX } from './focus'

interface Datum {
  id: string
  x: number
  y: number
}

interface Input {
  data: readonly Datum[]
  stroke: string
}

describe('dynamic chart runtime', () => {
  it('separates input invalidation from prepared-data invalidation', () => {
    const firstData = [
      { id: 'a', x: 0, y: 4 },
      { id: 'b', x: 1, y: 8 },
    ]
    const secondData = [...firstData, { id: 'c', x: 2, y: 12 }]
    const prepare = vi.fn((input: Input) => input.data)
    const chart = vi.fn(
      ({ input, prepared }: { input: Input; prepared: readonly Datum[] }) => ({
        marks: [
          lineY(prepared, {
            x: 'x',
            y: 'y',
            key: 'id',
            stroke: input.stroke,
          }),
        ],
      }),
    )
    const definition = defineChart<Input>()({
      prepare,
      prepareEqual: (previous, next) => previous.data === next.data,
      chart,
    })
    const runtime = createChartRuntime<Datum, Input>()

    const first = runtime.render(
      definition,
      { data: firstData, stroke: 'red' },
      { width: 480, height: 260 },
    )
    const visualUpdate = runtime.render(
      definition,
      { data: firstData, stroke: 'blue' },
      { width: 480, height: 260 },
    )
    runtime.render(
      definition,
      { data: secondData, stroke: 'blue' },
      { width: 480, height: 260 },
    )

    expect(prepare).toHaveBeenCalledTimes(2)
    expect(chart).toHaveBeenCalledTimes(3)
    expect(first.points).toHaveLength(2)
    expect(visualUpdate.points[0]?.color).toBe('blue')
    runtime.destroy()
  })

  it('aborts prepared work when its definition changes or is destroyed', () => {
    const signals: AbortSignal[] = []
    const makeDefinition = () =>
      defineChart<Input>()({
        prepare(input, context) {
          signals.push(context.signal)
          return input.data
        },
        chart: ({ prepared }) => ({
          marks: [lineY(prepared, { x: 'x', y: 'y' })],
        }),
      })
    const runtime = createChartRuntime<Datum, Input>()
    const input = { data: [{ id: 'a', x: 0, y: 4 }], stroke: 'red' }

    runtime.render(makeDefinition(), input, { width: 480, height: 260 })
    expect(signals[0]?.aborted).toBe(false)
    runtime.render(makeDefinition(), input, { width: 480, height: 260 })
    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
    runtime.destroy()
    expect(signals[1]?.aborted).toBe(true)
  })

  it('does not replace DOM for shallow-equal dynamic input', () => {
    const data = [{ id: 'a', x: 0, y: 4 }]
    const definition = defineChart<Input>()(({ input }) => ({
      marks: [
        lineY(input.data, {
          x: 'x',
          y: 'y',
          stroke: input.stroke,
        }),
      ],
    }))
    const container = document.createElement('div')
    const options = {
      definition,
      input: { data, stroke: 'red' },
      width: 480,
      height: 260,
      ariaLabel: 'Dynamic chart',
    }
    const host = mountChart(container, options)
    const initialSvg = container.querySelector('svg')

    host.update({
      ...options,
      input: { data, stroke: 'red' },
    })

    expect(container.querySelector('svg')).toBe(initialSvg)
    host.update({
      ...options,
      input: { data, stroke: 'red' },
      keyboard: false,
    })
    expect(container.querySelector('svg')).toBe(initialSvg)
    expect(initialSvg?.getAttribute('tabindex')).toBe('-1')
    host.destroy()
  })

  it('supports keyboard navigation and an automatic tooltip', () => {
    const data = [
      { id: 'a', x: 0, y: 4 },
      { id: 'b', x: 1, y: 8 },
    ]
    const definition = defineChart({
      marks: [lineY(data, { x: 'x', y: 'y', key: 'id' })],
    })
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const onSelect = vi.fn()
    const host = mountChart(container, {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Keyboard chart',
      tooltip: true,
      onFocusChange,
      onSelect,
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')

    expect(svg.getAttribute('tabindex')).toBe('0')
    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(
      container.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden,
    ).toBe(false)
    expect(container.style.position).toBe('relative')

    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])
    expect(container.querySelector('.ts-chart-tooltip')?.textContent).toContain(
      '8',
    )
    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
    )
    expect(onSelect.mock.calls.at(-1)?.[0]?.datum).toBe(data[1])
    host.destroy()
    expect(container.style.position).toBe('')
  })

  it('groups focus by channel value and exposes the rendered SVG', () => {
    const data = [
      { id: 'a:query', period: 'A', series: 'Query', value: 12 },
      { id: 'a:router', period: 'A', series: 'Router', value: 8 },
      { id: 'b:query', period: 'B', series: 'Query', value: 16 },
      { id: 'b:router', period: 'B', series: 'Router', value: 10 },
    ]
    const definition = defineChart({
      marks: [
        barY(data, {
          x: 'period',
          y: 'value',
          z: 'series',
          key: 'id',
        }),
      ],
    })
    const container = document.createElement('div')
    const onFocusGroupChange = vi.fn()
    const onRender = vi.fn()
    const host = mountChart(container, {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Grouped downloads',
      focus: focusX,
      maxFocusDistance: 1_000,
      tooltip: {
        formatGroup: (points) =>
          points.map((point) => point.groupLabel).join(', '),
      },
      onFocusGroupChange,
      onRender,
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
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
    const first = host.getScene().points[0]
    if (!first) throw new Error('Expected a point')

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: first.x,
        clientY: first.y,
      }),
    )

    const focused = onFocusGroupChange.mock.calls.at(-1)?.[0]
    expect(focused).toHaveLength(2)
    expect(focused.map((point: { xValue: unknown }) => point.xValue)).toEqual([
      'A',
      'A',
    ])
    expect(container.querySelector('.ts-chart-tooltip')?.textContent).toContain(
      'Query',
    )
    expect(container.querySelector('.ts-chart-tooltip')?.textContent).toContain(
      'Router',
    )
    expect(onRender).toHaveBeenCalledWith(
      expect.objectContaining({ container, svg }),
    )
    host.destroy()
  })

  it('scopes SVG resource IDs for each vanilla host', () => {
    const definition = defineChart({
      marks: [
        lineY([1, 2, 3], {
          stroke: 'url(#line-gradient)',
        }),
      ],
      gradients: [
        {
          id: 'line-gradient',
          stops: [
            { offset: 0, color: 'red' },
            { offset: 1, color: 'blue' },
          ],
        },
      ],
      clip: true,
    })
    const firstContainer = document.createElement('div')
    const secondContainer = document.createElement('div')
    const options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Scoped chart',
      renderSvg: renderChartSvgWithResources,
    }
    const firstHost = mountChart(firstContainer, {
      ...options,
      idPrefix: 'first',
    })
    const secondHost = mountChart(secondContainer, {
      ...options,
      idPrefix: 'second',
    })
    const firstGradient = firstContainer.querySelector('linearGradient')
    const secondGradient = secondContainer.querySelector('linearGradient')
    const firstId = firstGradient?.id
    const secondId = secondGradient?.id

    expect(firstId).toBeTruthy()
    expect(secondId).toBeTruthy()
    expect(firstId).not.toBe(secondId)
    expect(
      firstContainer
        .querySelector('.ts-chart__line path')
        ?.getAttribute('stroke'),
    ).toBe(`url(#${firstId})`)
    expect(
      secondContainer
        .querySelector('.ts-chart__line path')
        ?.getAttribute('stroke'),
    ).toBe(`url(#${secondId})`)
    firstHost.destroy()
    secondHost.destroy()
  })

  it('recovers from zero width and coalesces rapid resize notifications', () => {
    let resize: ResizeObserverCallback | undefined
    let width = 0
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
    const host = mountChart(container, {
      definition: defineChart({ marks: [lineY([1, 2, 3])] }),
      initialWidth: 320,
      height: 260,
      ariaLabel: 'Responsive chart',
    })

    expect(host.getScene().width).toBe(320)
    width = 640
    resize?.([], {} as ResizeObserver)
    resize?.([], {} as ResizeObserver)
    expect(frames).toHaveLength(1)
    frames.shift()?.(0)
    expect(host.getScene().width).toBe(640)

    host.destroy()
    window.ResizeObserver = originalResizeObserver
    requestFrame.mockRestore()
    cancelFrame.mockRestore()
  })

  it('derives proportional height from the measured container width', () => {
    const container = document.createElement('div')
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 240,
      left: 0,
      width: 480,
      height: 240,
      toJSON: () => ({}),
    })
    const host = mountChart(container, {
      definition: defineChart({ marks: [lineY([1, 2, 3])] }),
      aspectRatio: 2,
      ariaLabel: 'Proportional chart',
    })

    expect(host.getScene()).toMatchObject({ width: 480, height: 240 })
    host.destroy()
  })

  it('respects reduced-motion preferences unless explicitly overridden', () => {
    const definition = defineChart<{ value: number }>()(({ input }) => ({
      marks: [lineY([0, input.value])],
    }))
    const originalMatchMedia = window.matchMedia
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1)
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const container = document.createElement('div')
    const options = {
      definition,
      input: { value: 4 },
      width: 480,
      height: 260,
      ariaLabel: 'Motion chart',
    }
    const host = mountChart(container, options)

    host.update({ ...options, input: { value: 8 }, animate: true })
    expect(requestFrame).not.toHaveBeenCalled()

    host.update({
      ...options,
      input: { value: 12 },
      animate: { respectReducedMotion: false },
    })
    expect(requestFrame).toHaveBeenCalled()

    host.destroy()
    window.matchMedia = originalMatchMedia
    requestFrame.mockRestore()
  })
})
