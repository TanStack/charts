import { describe, expect, it, vi } from 'vitest'
import { mountChart } from './dom'
import { barY } from './bar'
import { lineY } from './line'
import { createChartRuntime } from './runtime'
import { defineChart } from './scene'
import { renderChartSvgWithResources } from './svg-resources'
import { focusX } from './focus'
import { bandXAxes, linearAxes } from './test-scales'
import type { ChartDefinition, ChartTextMeasurer } from './types'

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
  it('rejects missing dynamic input at the untyped runtime boundary', () => {
    const definition = defineChart<Input>()(({ input }) => ({
      marks: [lineY(input.data, { x: 'x', y: 'y' })],
      ...linearAxes([0, 1], [0, 4]),
    }))
    const container = document.createElement('div')
    const missingInput = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Dynamic chart',
    }

    // @ts-expect-error JavaScript consumers still receive the runtime guard.
    expect(() => mountChart(container, missingInput)).toThrow(
      'Dynamic chart definitions require an input value',
    )

    const host = mountChart(container, {
      ...missingInput,
      input: { data: [{ id: 'a', x: 0, y: 4 }], stroke: 'red' },
    })
    // @ts-expect-error Updates enforce the same dynamic input contract.
    expect(() => host.update(missingInput)).toThrow(
      'Dynamic chart definitions require an input value',
    )
    host.destroy()
  })

  it('compiles dynamic specifications through the strict scale path', () => {
    const definition = {
      chart: ({ input }: { input: Input }) => ({
        marks: [lineY(input.data, { x: 'x', y: 'y' })],
      }),
    } as unknown as ChartDefinition<Datum, Input>
    const runtime = createChartRuntime<Datum, Input>()

    expect(() =>
      runtime.render(
        definition,
        { data: [{ id: 'a', x: 0, y: 4 }], stroke: 'red' },
        { width: 480, height: 260 },
      ),
    ).toThrow(/requires a configured scale/)
    runtime.destroy()
  })

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
        ...linearAxes([0, 2], [0, 12]),
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

  it('adopts a prerender runtime without preparing twice and owns cleanup', () => {
    const signals: AbortSignal[] = []
    const prepare = vi.fn((input: Input, context: { signal: AbortSignal }) => {
      signals.push(context.signal)
      return input.data
    })
    const definition = defineChart<Input>()({
      prepare,
      chart: ({ prepared }) => ({
        marks: [lineY(prepared, { x: 'x', y: 'y' })],
        ...linearAxes([0, 1], [0, 4]),
      }),
    })
    const input = {
      data: [{ id: 'a', x: 0, y: 4 }],
      stroke: 'red',
    }
    const runtime = createChartRuntime<Datum, Input>()
    runtime.render(definition, input, { width: 480, height: 260 })

    const container = document.createElement('div')
    const host = mountChart(
      container,
      {
        definition,
        input,
        width: 480,
        height: 260,
        ariaLabel: 'Dynamic chart',
      },
      runtime,
    )

    expect(prepare).toHaveBeenCalledOnce()
    expect(signals[0]?.aborted).toBe(false)
    host.destroy()
    expect(signals[0]?.aborted).toBe(true)
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
          ...linearAxes([0, 1], [0, 4]),
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
      ...linearAxes([0, 1], [0, 4]),
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
      ...linearAxes([0, 1], [0, 8]),
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

  it('suppresses floating-point artifacts in automatic tooltips', () => {
    const value = 100 / 7
    const definition = defineChart({
      marks: [lineY([{ x: 0, y: value }], { x: 'x', y: 'y' })],
      ...linearAxes([0, 1], [0, 20]),
    })
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Decimal chart',
      tooltip: true,
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const text = container.querySelector('.ts-chart-tooltip')?.textContent
    expect(text).toContain('14.286')
    expect(text).not.toContain(String(value))
    host.destroy()
  })

  it('can pin a tooltip until click or Escape releases it', () => {
    const data = [
      { id: 'a', x: 0, y: 4 },
      { id: 'b', x: 1, y: 8 },
    ]
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [lineY(data, { x: 'x', y: 'y', key: 'id' })],
        ...linearAxes([0, 1], [0, 8]),
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Sticky tooltip chart',
      tooltip: { sticky: true },
    })
    const svg = container.querySelector('svg')
    const [first, second] = host.getScene().points
    if (!svg || !first || !second) throw new Error('Expected chart points')
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

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: first.x,
        clientY: first.y,
      }),
    )
    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: first.x,
        clientY: first.y,
      }),
    )
    container.dispatchEvent(new MouseEvent('mouseleave'))

    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(tooltip?.hidden).toBe(false)
    expect(tooltip?.textContent).toContain('4')

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: second.x,
        clientY: second.y,
      }),
    )
    expect(tooltip?.textContent).toContain('4')

    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    )
    expect(tooltip?.hidden).toBe(true)

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: second.x,
        clientY: second.y,
      }),
    )
    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: second.x,
        clientY: second.y,
      }),
    )
    container.dispatchEvent(new MouseEvent('mouseleave'))
    expect(tooltip?.hidden).toBe(false)
    expect(tooltip?.textContent).toContain('8')

    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: second.x,
        clientY: second.y,
      }),
    )
    container.dispatchEvent(new MouseEvent('mouseleave'))
    expect(tooltip?.hidden).toBe(true)
    host.destroy()
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
      ...bandXAxes(['A', 'B'], [0, 16]),
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
      ...linearAxes([0, 2], [0, 3]),
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
      definition: defineChart({
        marks: [lineY([1, 2, 3])],
        ...linearAxes([0, 2], [0, 3]),
      }),
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
      definition: defineChart({
        marks: [lineY([1, 2, 3])],
        ...linearAxes([0, 2], [0, 3]),
      }),
      aspectRatio: 2,
      ariaLabel: 'Proportional chart',
    })

    expect(host.getScene()).toMatchObject({ width: 480, height: 240 })
    host.destroy()
  })

  it('relayouts when an injected text measurer changes', () => {
    const compact = textMeasurer(0.4)
    const spacious = textMeasurer(1.2)
    const definition = defineChart({
      marks: [lineY([1, 2, 3])],
      x: { ...linearAxes([0, 2], [0, 3]).x, label: 'Release' },
      y: {
        ...linearAxes([0, 2], [0, 3]).y,
        label: 'Downloads',
        format: () => 'Long formatted tick',
      },
    })
    const container = document.createElement('div')
    const options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Measured chart',
      measureText: compact,
    }
    const host = mountChart(container, options)
    const compactLeft = host.getScene().margin.left

    host.update({ ...options, measureText: spacious })

    expect(host.getScene().margin.left).toBeGreaterThan(compactLeft)
    host.destroy()
  })

  it('coalesces font completion events and ignores them after destroy', () => {
    const previousFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
    const fontSet = new EventTarget()
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: fontSet,
    })
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
    const onRender = vi.fn()
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [lineY([1, 2, 3])],
        ...linearAxes([0, 2], [0, 3]),
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Web-font chart',
      onRender,
    })

    fontSet.dispatchEvent(new Event('loadingdone'))
    fontSet.dispatchEvent(new Event('loadingdone'))
    fontSet.dispatchEvent(new Event('loadingdone'))
    expect(frames).toHaveLength(1)
    frames.shift()?.(0)
    expect(onRender).toHaveBeenCalledTimes(2)

    host.destroy()
    fontSet.dispatchEvent(new Event('loadingdone'))
    expect(frames).toHaveLength(0)

    requestFrame.mockRestore()
    cancelFrame.mockRestore()
    if (previousFonts) {
      Object.defineProperty(document, 'fonts', previousFonts)
    } else {
      Reflect.deleteProperty(document, 'fonts')
    }
  })

  it('respects reduced-motion preferences unless explicitly overridden', () => {
    const definition = defineChart<{ value: number }>()(({ input }) => ({
      marks: [lineY([0, input.value])],
      ...linearAxes([0, 1], [0, 12]),
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

function textMeasurer(emWidth: number): ChartTextMeasurer {
  return (text, options) => {
    const width = text.length * options.fontSize * emWidth
    const height = options.fontSize
    return {
      x:
        options.anchor === 'middle'
          ? -width / 2
          : options.anchor === 'end'
            ? -width
            : 0,
      y:
        options.baseline === 'middle'
          ? -height / 2
          : options.baseline === 'hanging'
            ? 0
            : -height * 0.8,
      width,
      height,
    }
  }
}
