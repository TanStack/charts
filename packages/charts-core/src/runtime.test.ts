import { describe, expect, it, vi } from 'vitest'
import { mountChart } from './dom'
import { barX, barY } from './bar'
import { lineY } from './line'
import { rect } from './rect'
import { createChartRuntime } from './runtime'
import { defineChart } from './scene'
import { renderChartSvgWithResources } from './svg-resources'
import { focusX } from './focus'
import { bandXAxes, bandYAxes, linearAxes, utcXAxes } from './test-scales'
import { tooltip as tooltipExtension } from './tooltip'
import { portal as portalExtension } from './tooltip-portal'
import type {
  ChartDefinition,
  ChartDefinitionOptions,
  ChartPoint,
  ChartTextMeasurer,
  ChartValue,
} from './types'

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
  it('compiles dynamic specifications through the strict scale path', () => {
    const definition = {
      chart: () => ({
        marks: [lineY([{ id: 'a', x: 0, y: 4 }], { x: 'x', y: 'y' })],
      }),
    } as unknown as ChartDefinition<Datum>
    const runtime = createChartRuntime<Datum>()

    expect(() =>
      runtime.render(definition, { width: 480, height: 260 }),
    ).toThrow(/requires a configured scale/)
    runtime.destroy()
  })

  it('builds each scene from captured values and the current size', () => {
    const firstData = [
      { id: 'a', x: 0, y: 4 },
      { id: 'b', x: 1, y: 8 },
    ]
    const createDefinition = (input: Input) =>
      defineChart(
        vi.fn(({ width }) => ({
          marks: [
            lineY(input.data, {
              x: 'x',
              y: 'y',
              key: 'id',
              stroke: width < 400 ? 'red' : input.stroke,
            }),
          ],
          ...linearAxes([0, 2], [0, 12]),
        })),
      )
    const runtime = createChartRuntime<Datum>()

    const narrow = runtime.render(
      createDefinition({ data: firstData, stroke: 'red' }),
      { width: 320, height: 260 },
    )
    const wide = runtime.render(
      createDefinition({ data: firstData, stroke: 'blue' }),
      { width: 640, height: 260 },
    )

    expect(narrow.points).toHaveLength(2)
    expect(wide.points[0]?.color).toBe('blue')
    runtime.destroy()
  })

  it('uses definition identity as the application update boundary', () => {
    const data = [{ id: 'a', x: 0, y: 4 }]
    const createDefinition = (stroke: string) =>
      defineChart(() => ({
        marks: [
          lineY(data, {
            x: 'x',
            y: 'y',
            stroke,
          }),
        ],
        ...linearAxes([0, 1], [0, 4]),
      }))
    const container = document.createElement('div')
    const onRender = vi.fn()
    const definition = createDefinition('red')
    const options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Dynamic chart',
      onRender,
    }
    const host = mountChart(container, options)
    const initialSvg = container.querySelector('svg')

    host.update({ ...options })

    expect(container.querySelector('svg')).toBe(initialSvg)
    expect(onRender).toHaveBeenCalledOnce()
    host.update({ ...options, definition: createDefinition('blue') })
    expect(onRender).toHaveBeenCalledTimes(2)
    expect(host.getScene().points[0]?.color).toBe('blue')
    host.destroy()
  })

  it('reuses bars keyed by an inferred datum id across reorder updates', () => {
    const first = [
      { id: 'a', category: 'Alpha', value: 4 },
      { id: 'b', category: 'Beta', value: 8 },
      { id: 'c', category: 'Gamma', value: 6 },
    ]
    const next = [
      { id: 'c', category: 'Gamma', value: 9 },
      { id: 'a', category: 'Alpha', value: 5 },
      { id: 'd', category: 'Delta', value: 7 },
    ]
    const createDefinition = (rows: typeof first) =>
      defineChart({
        marks: [barY(rows, { x: 'category', y: 'value' })],
        ...bandXAxes(
          rows.map((row) => row.category),
          [0, 10],
        ),
      })
    const container = document.createElement('div')
    const options = {
      definition: createDefinition(first),
      width: 480,
      height: 260,
      ariaLabel: 'Reordered bars',
    }
    const host = mountChart(container, options)
    const initialNodes = new Map(
      host
        .getScene()
        .points.map((point) => [
          point.datum.id,
          container.querySelector(`[data-ts-key="${point.key}"]`),
        ]),
    )

    host.update({ ...options, definition: createDefinition(next) })

    for (const point of host.getScene().points) {
      const node = container.querySelector(`[data-ts-key="${point.key}"]`)
      if (point.datum.id === 'a' || point.datum.id === 'c') {
        expect(node).toBe(initialNodes.get(point.datum.id))
      } else {
        expect(node).not.toBeNull()
      }
    }
    host.destroy()
  })

  it('honors an explicit SVG tab index when keyboard interaction is enabled', () => {
    const definition = defineChart({
      marks: [lineY([2, 4, 3])],
      ...linearAxes([0, 2], [0, 4]),
    })
    const container = document.createElement('div')
    const options = {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Custom tab order chart',
      tabIndex: 3,
    }
    const host = mountChart(container, options)
    const svg = container.querySelector('svg')

    expect(svg?.getAttribute('tabindex')).toBe('3')

    host.update({ ...options, tabIndex: 5 })
    expect(svg?.getAttribute('tabindex')).toBe('5')

    host.update({
      ...options,
      definition: withChartOptions(definition, { keyboard: false }),
      tabIndex: 5,
    })
    expect(svg?.getAttribute('tabindex')).toBe('-1')
    host.destroy()
  })

  it('repaints focused UI when the spatial index and tooltip change together', () => {
    const data = [{ id: 'a', x: 0, y: 4 }]
    const definition = defineChart({
      marks: [lineY(data, { x: 'x', y: 'y', key: 'id' })],
      ...linearAxes([0, 1], [0, 4]),
    })
    const firstIndex = vi.fn((points: readonly ChartPoint<Datum>[]) => ({
      findNearest: () => points[0] ?? null,
    }))
    const nextIndex = vi.fn((points: readonly ChartPoint<Datum>[]) => ({
      findNearest: () => points[0] ?? null,
    }))
    const container = document.createElement('div')
    const options = {
      definition: withChartOptions(definition, {
        tooltip: tooltipExtension,
        spatialIndex: firstIndex,
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Focused update chart',
    }
    const host = mountChart(container, options)
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(tooltip?.hidden).toBe(false)

    host.update({
      ...options,
      definition: withChartOptions(definition, {
        tooltip: false,
        spatialIndex: nextIndex,
      }),
    })

    expect(nextIndex).toHaveBeenCalledOnce()
    expect(tooltip?.hidden).toBe(true)
    host.destroy()
  })

  it('keeps duplicate-key line focus on the point nearest the pointer', () => {
    const data = [
      { id: 'a', series: 'requests', x: 0, y: 4 },
      { id: 'b', series: 'requests', x: 1, y: 8 },
      { id: 'c', series: 'requests', x: 2, y: 6 },
    ]
    const definition = defineChart({
      marks: [
        lineY(data, {
          x: 'x',
          y: 'y',
          key: 'series',
        }),
      ],
      ...linearAxes([0, 2], [0, 8]),
    })
    const container = document.createElement('div')
    const onFocusChange = vi.fn()
    const format = (point: ChartPoint<(typeof data)[number]>) => point.datum.id
    const options = {
      definition: withChartOptions(definition, {
        tooltip: { use: tooltipExtension, format },
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Duplicate point key chart',
      onFocusChange,
    }
    const host = mountChart(container, options)
    const svg = container.querySelector('svg')
    const line = container.querySelector<SVGPathElement>('.ts-chart__line path')
    const last = host.getScene().points.at(-1)
    if (!svg || !line || !last) throw new Error('Expected line chart')
    const bounds = vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
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

    expect(new Set(host.getScene().points.map((point) => point.key)).size).toBe(
      1,
    )
    line.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: last.x,
        clientY: last.y,
      }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[2])
    expect(container.querySelector('.ts-chart-tooltip')?.textContent).toBe('c')

    host.update({
      ...options,
      definition: withChartOptions(definition, {
        tooltip: { use: tooltipExtension, format },
      }),
    })
    expect(container.querySelector('.ts-chart-tooltip')?.textContent).toBe('c')

    host.update({
      ...options,
      width: 600,
    })
    bounds.mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 600,
      bottom: 260,
      left: 0,
      width: 600,
      height: 260,
      toJSON: () => ({}),
    })
    const first = host.getScene().points[0]
    expect(container.querySelector('.ts-chart-tooltip')?.textContent).toBe('c')
    expect(
      Number(
        container
          .querySelector('[data-ts-focus-layer] circle[visibility="visible"]')
          ?.getAttribute('cx'),
      ),
    ).toBeCloseTo(host.getScene().points.at(-1)?.x ?? Number.NaN)

    if (!first) throw new Error('Expected first point')
    container
      .querySelector<SVGPathElement>('.ts-chart__line path')
      ?.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: first.x,
          clientY: first.y,
        }),
      )
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(container.querySelector('.ts-chart-tooltip')?.textContent).toBe('a')
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
      definition: withChartOptions(definition, {
        tooltip: tooltipExtension,
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Keyboard chart',
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

  it('portals the native tooltip into the chart owner document', () => {
    const frame = document.createElement('iframe')
    document.body.append(frame)
    const chartDocument = frame.contentDocument
    if (!chartDocument) throw new Error('Expected iframe document')
    const chartView = chartDocument.defaultView
    if (!chartView) throw new Error('Expected iframe window')
    const prototype = chartView.HTMLElement.prototype
    const showPopover = Object.getOwnPropertyDescriptor(
      prototype,
      'showPopover',
    )
    const hidePopover = Object.getOwnPropertyDescriptor(
      prototype,
      'hidePopover',
    )
    Object.defineProperties(prototype, {
      showPopover: { configurable: true, value: undefined },
      hidePopover: { configurable: true, value: undefined },
    })
    const container = chartDocument.createElement('div')
    container.style.overflow = 'hidden'
    chartDocument.body.append(container)
    const host = mountChart(container, {
      definition: defineChart({
        marks: [lineY([{ x: 0, y: 4 }], { x: 'x', y: 'y' })],
        ...linearAxes([0, 1], [0, 4]),
        tooltip: { use: tooltipExtension, portal: portalExtension },
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Owner document portal',
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 20,
      y: 30,
      top: 30,
      right: 500,
      bottom: 290,
      left: 20,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    })

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const tooltip = chartDocument.querySelector<HTMLElement>(
      '.ts-chart-tooltip[data-ts-chart-tooltip-portal="fallback"]',
    )
    expect(tooltip?.parentNode).toBe(chartDocument.body)
    expect(tooltip ? container.contains(tooltip) : null).toBe(false)
    expect(
      document.querySelector('.ts-chart-tooltip[data-ts-chart-tooltip-portal]'),
    ).toBeNull()

    host.destroy()
    expect(
      chartDocument.querySelector(
        '.ts-chart-tooltip[data-ts-chart-tooltip-portal]',
      ),
    ).toBeNull()
    if (showPopover)
      Object.defineProperty(prototype, 'showPopover', showPopover)
    else Reflect.deleteProperty(prototype, 'showPopover')
    if (hidePopover)
      Object.defineProperty(prototype, 'hidePopover', hidePopover)
    else Reflect.deleteProperty(prototype, 'hidePopover')
    frame.remove()
  })

  it('suppresses floating-point artifacts in automatic tooltips', () => {
    const value = 100 / 7
    const definition = defineChart({
      marks: [lineY([{ x: 0, y: value }], { x: 'x', y: 'y' })],
      ...linearAxes([0, 1], [0, 20]),
    })
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: withChartOptions(definition, {
        tooltip: tooltipExtension,
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Decimal chart',
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const text = container.querySelector('.ts-chart-tooltip')?.textContent
    expect(text).toContain('14.286')
    expect(text).not.toContain(String(value))
    host.destroy()
  })

  it('formats automatic date values as stable UTC dates', () => {
    const date = new Date('2024-05-26T00:00:00.000Z')
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [lineY([{ date, value: 4 }], { x: 'date', y: 'value' })],
        ...utcXAxes([new Date('2024-05-01T00:00:00.000Z'), date], [0, 4]),
        tooltip: tooltipExtension,
      }),
      width: 480,
      height: 260,
      ariaLabel: 'UTC date chart',
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const text = container
      .querySelector('.ts-chart-tooltip')
      ?.getAttribute('aria-label')
    expect(text).toContain('2024-05-26')
    expect(text).not.toContain('PM')
    host.destroy()
  })

  it('renders grouped tooltip rows with scale labels, formatting, and swatches', () => {
    const data = [
      { id: 'a:query', period: 'A', series: 'Query', value: 8 },
      { id: 'a:router', period: 'A', series: 'Router', value: 12 },
    ]
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [
          lineY(data, {
            x: 'period',
            y: 'value',
            z: 'series',
            key: 'id',
          }),
        ],
        x: { ...bandXAxes(['A'], [0, 12]).x, axis: { label: 'Period' } },
        y: {
          ...linearAxes([0, 1], [0, 12]).y,
          axis: {
            ticks: { format: (value) => `${value}k` },
            label: 'Downloads',
          },
        },
        focus: 'group-x',
        tooltip: {
          use: tooltipExtension,
          anchor: 'group-center',
          placement: 'right',
          offset: 0,
        },
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Grouped downloads',
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    const rows = tooltip?.querySelectorAll('.ts-chart-tooltip__row')
    expect(tooltip?.querySelector('div')?.textContent).toBe('Period: A')
    expect(rows).toHaveLength(2)
    expect(rows?.[0]?.textContent).toContain('Router')
    expect(rows?.[0]?.textContent).toContain('12')
    expect(rows?.[1]?.textContent).toContain('Query')
    expect(rows?.[1]?.textContent).toContain('8')
    expect(tooltip?.querySelectorAll('.ts-chart-tooltip__swatch')).toHaveLength(
      2,
    )
    expect(tooltip?.getAttribute('aria-label')).toBe(
      'Period: A\nRouter: 12\nQuery: 8',
    )
    const focusedPoints = host.getScene().points
    expect(Number.parseFloat(tooltip?.style.left ?? '')).toBeCloseTo(
      focusedPoints[0]?.x ?? 0,
    )
    expect(Number.parseFloat(tooltip?.style.top ?? '')).toBeCloseTo(
      ((focusedPoints[0]?.y ?? 0) + (focusedPoints[1]?.y ?? 0)) / 2,
    )
    host.destroy()
  })

  it('orders y-grouped tooltip rows left-to-right by default', () => {
    const data = [
      { id: 'a:long', category: 'A', series: 'Long', value: 12 },
      { id: 'a:short', category: 'A', series: 'Short', value: 4 },
    ]
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [
          barX(data, {
            x: 'value',
            y: 'category',
            z: 'series',
            key: 'id',
            layout: { type: 'group' },
          }),
        ],
        ...bandYAxes([0, 12], ['A']),
        focus: 'group-y',
        tooltip: { use: tooltipExtension },
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Grouped horizontal bars',
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const rows = container.querySelectorAll('.ts-chart-tooltip__row')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.textContent).toContain('Short')
    expect(rows[0]?.textContent).toContain('4')
    expect(rows[1]?.textContent).toContain('Long')
    expect(rows[1]?.textContent).toContain('12')
    host.destroy()
  })

  it('formats interval ranges and stacked lengths automatically', () => {
    const rangeContainer = document.createElement('div')
    const rangeHost = mountChart(rangeContainer, {
      definition: defineChart({
        marks: [
          rect([{ x1: 2, x2: 4, y1: 1, y2: 3 }], {
            x1: 'x1',
            x2: 'x2',
            y1: 'y1',
            y2: 'y2',
          }),
        ],
        ...linearAxes([0, 4], [0, 3]),
        tooltip: tooltipExtension,
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Interval',
    })
    const rangeSvg = rangeContainer.querySelector('svg')
    if (!rangeSvg) throw new Error('Expected SVG')
    rangeSvg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(
      rangeContainer.querySelector('.ts-chart-tooltip')?.textContent,
    ).toContain('2–4')
    expect(
      rangeContainer.querySelector('.ts-chart-tooltip')?.textContent,
    ).toContain('1–3')
    rangeHost.destroy()

    const stackContainer = document.createElement('div')
    const stackHost = mountChart(stackContainer, {
      definition: defineChart({
        marks: [
          barY([{ period: 'A', start: 10, end: 16 }], {
            x: 'period',
            y1: 'start',
            y: 'end',
          }),
        ],
        x: bandXAxes(['A'], [0, 20]).x,
        y: {
          ...linearAxes([0, 1], [0, 20]).y,
          axis: {
            ticks: { format: (value) => `${value} units` },
            label: 'Change',
          },
        },
        tooltip: tooltipExtension,
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Stacked interval',
    })
    const stackSvg = stackContainer.querySelector('svg')
    if (!stackSvg) throw new Error('Expected SVG')
    stackSvg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(
      stackContainer
        .querySelector('.ts-chart-tooltip')
        ?.getAttribute('aria-label'),
    ).toContain('Change: 6')
    stackHost.destroy()
  })

  it('expands structured tooltip content when pinned', () => {
    const contentPinned = vi.fn()
    const container = document.createElement('div')
    const definition = defineChart({
      marks: [lineY([{ x: 0, y: 4, note: 'Released' }], { x: 'x', y: 'y' })],
      x: { ...linearAxes([0, 1], [0, 4]).x, axis: { label: 'Week' } },
      y: {
        ...linearAxes([0, 1], [0, 4]).y,
        axis: { ticks: { format: (value) => `${value}k` } },
      },
    })
    const host = mountChart(container, {
      definition: withChartOptions(definition, {
        tooltip: {
          use: tooltipExtension,
          content: ([point], context) => {
            contentPinned(context.pinned)
            return {
              title: point ? context.formatX(point.xValue) : undefined,
              rows: point
                ? [
                    {
                      label: 'Status',
                      value: point.datum.note,
                      color: point.color,
                    },
                    ...(context.pinned
                      ? [
                          {
                            label: 'Downloads',
                            value: `${point.yValue}k`,
                          },
                        ]
                      : []),
                  ]
                : [],
            }
          },
        },
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Custom tooltip content',
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')
    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const tooltip = container.querySelector('.ts-chart-tooltip')
    expect(tooltip?.querySelectorAll('.ts-chart-tooltip__row')).toHaveLength(1)
    expect(tooltip?.textContent).toContain('Released')
    expect(tooltip?.textContent).not.toContain('4k')
    expect(contentPinned).toHaveBeenLastCalledWith(false)

    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
    )
    expect(contentPinned).toHaveBeenLastCalledWith(true)
    expect(tooltip?.querySelectorAll('.ts-chart-tooltip__row')).toHaveLength(2)
    expect(tooltip?.textContent).toContain('4k')
    host.destroy()
  })

  it('orders automatic point items and formats datum fields', () => {
    const itemPinned = vi.fn()
    const data = [
      {
        id: 'a',
        period: 'A',
        series: 'Atlas',
        value: 4,
        volume: 1_200,
        change: 0.25,
      },
    ]
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [
          lineY(data, {
            x: 'period',
            y: 'value',
            z: 'series',
            key: 'id',
          }),
        ],
        ...bandXAxes(['A'], [0, 4]),
        focus: 'nearest',
        tooltip: {
          use: tooltipExtension,
          items: [
            {
              channel: 'y',
              label: 'Revenue',
              text: (point) => point.yValue.toFixed(1),
            },
            {
              field: 'volume',
              label: 'Volume',
              text: (point) => `${point.datum.volume / 1_000}k`,
            },
            {
              id: 'change',
              label: 'Change',
              text: (point, context) => {
                itemPinned(context.pinned)
                return context.pinned ? `${point.datum.change * 100}%` : null
              },
            },
            {
              id: 'empty',
              text: () => null,
            },
            {
              channel: 'x',
              label: 'Period',
            },
            'group',
          ],
        },
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Ordered tooltip details',
    })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('Expected SVG')
    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    const rows = [
      ...container.querySelectorAll<HTMLElement>('.ts-chart-tooltip__row'),
    ]
    expect(rows.map((row) => row.textContent)).toEqual([
      'Revenue4.0',
      'Volume1.2k',
      'PeriodA',
      'GroupAtlas',
    ])
    expect(container.querySelector('.ts-chart-tooltip__title')).toBeNull()
    expect(itemPinned).toHaveBeenLastCalledWith(false)

    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
    )
    expect(itemPinned).toHaveBeenLastCalledWith(true)
    expect(container.querySelector('.ts-chart-tooltip')?.textContent).toContain(
      'Change25%',
    )
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
        tooltip: tooltipExtension,
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Sticky tooltip chart',
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
    svg.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: document.body,
      }),
    )
    svg.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
    container.dispatchEvent(new MouseEvent('mouseleave'))

    const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
    expect(tooltip?.hidden).toBe(false)
    expect(tooltip?.textContent).toContain('4')
    expect(tooltip?.dataset.sticky).toBe('true')
    expect(tooltip?.style.pointerEvents).toBe('auto')
    expect(tooltip?.style.userSelect).toBe('text')

    tooltip?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    container.dispatchEvent(new MouseEvent('mouseleave'))
    expect(tooltip?.hidden).toBe(false)

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

  it('can disable tooltip pinning', () => {
    const container = document.createElement('div')
    const host = mountChart(container, {
      definition: defineChart({
        marks: [lineY([{ x: 0, y: 4 }], { x: 'x', y: 'y' })],
        ...linearAxes([0, 1], [0, 4]),
        tooltip: { use: tooltipExtension, sticky: false },
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Transient tooltip chart',
    })
    const svg = container.querySelector('svg')
    const point = host.getScene().points[0]
    if (!svg || !point) throw new Error('Expected chart point')
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
        clientX: point.x,
        clientY: point.y,
      }),
    )
    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: point.x,
        clientY: point.y,
      }),
    )
    container.dispatchEvent(new MouseEvent('mouseleave'))

    expect(
      container.querySelector<HTMLElement>('.ts-chart-tooltip')?.hidden,
    ).toBe(true)
    host.destroy()
  })

  it('clears transient focus when focus leaves the host or a pointer is canceled', () => {
    const data = [
      { id: 'a', x: 0, y: 4 },
      { id: 'b', x: 1, y: 8 },
    ]
    const frame = document.createElement('iframe')
    document.body.append(frame)
    const chartDocument = frame.contentDocument
    if (!chartDocument) throw new Error('Expected iframe realm')
    const container = chartDocument.createElement('div')
    const outside = chartDocument.createElement('button')
    const onFocusChange = vi.fn()
    const onSelect = vi.fn()
    chartDocument.body.append(container, outside)
    const host = mountChart(container, {
      definition: defineChart({
        marks: [lineY(data, { x: 'x', y: 'y', key: 'id' })],
        ...linearAxes([0, 1], [0, 8]),
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Transient focus chart',
      onFocusChange,
      onSelect,
    })
    const svg = container.querySelector('svg')
    const first = host.getScene().points[0]
    if (!svg || !first) throw new Error('Expected chart point')
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

    svg.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    const internal = chartDocument.createElement('button')
    container.append(internal)
    expect(internal).not.toBeInstanceOf(Node)
    svg.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: internal,
      }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]).toEqual(first)

    svg.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: outside,
      }),
    )
    expect(onFocusChange.mock.calls.at(-1)?.[0]).toBeNull()

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
    container.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
    expect(onFocusChange.mock.calls.at(-1)?.[0]).toBeNull()
    expect(onSelect).toHaveBeenCalledOnce()

    host.destroy()
    frame.remove()
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
      definition: withChartOptions(definition, {
        focus: focusX,
        maxFocusDistance: 1_000,
        tooltip: {
          use: tooltipExtension,
          formatGroup: (points) =>
            points.map((point) => point.groupLabel).join(', '),
        },
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Grouped downloads',
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

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back to the default height for invalid aspect ratio %s',
    (aspectRatio) => {
      const container = document.createElement('div')
      const host = mountChart(container, {
        definition: defineChart({
          marks: [lineY([1, 2, 3])],
          ...linearAxes([0, 2], [0, 3]),
        }),
        width: 480,
        aspectRatio,
        ariaLabel: 'Invalid proportional chart',
      })

      expect(host.getScene()).toMatchObject({ width: 480, height: 320 })
      host.destroy()
    },
  )

  it('skips fixed-size layout and dormant post-render work', () => {
    const container = document.createElement('div')
    const measureBounds = vi.spyOn(container, 'getBoundingClientRect')
    const query = vi.spyOn(container, 'querySelector')
    const readStyle = vi.spyOn(window, 'getComputedStyle')
    const options = {
      definition: defineChart({
        marks: [lineY([1, 2, 3])],
        ...linearAxes([0, 2], [0, 3]),
      }),
      width: 480,
      height: 260,
      ariaLabel: 'Fixed-size chart',
    }
    const host = mountChart(container, options)

    expect(measureBounds).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalledWith('svg.ts-chart')
    expect(query).not.toHaveBeenCalledWith('[data-ts-focus-layer]')
    expect(readStyle).toHaveBeenCalledTimes(2)

    host.update({ ...options, width: 640 })

    expect(measureBounds).not.toHaveBeenCalled()
    expect(readStyle).toHaveBeenCalledTimes(3)
    host.destroy()
    readStyle.mockRestore()
  })

  it('relayouts when an injected text measurer changes', () => {
    const compact = textMeasurer(0.4)
    const spacious = textMeasurer(1.2)
    const definition = defineChart({
      marks: [lineY([1, 2, 3])],
      x: { ...linearAxes([0, 2], [0, 3]).x, axis: { label: 'Release' } },
      y: {
        ...linearAxes([0, 2], [0, 3]).y,
        axis: {
          ticks: { format: () => 'Long formatted tick' },
          label: 'Downloads',
        },
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
    const measureBounds = vi.spyOn(container, 'getBoundingClientRect')
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
    expect(measureBounds).not.toHaveBeenCalled()

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
    const createDefinition = (value: number) =>
      defineChart(() => ({
        marks: [lineY([0, value])],
        ...linearAxes([0, 1], [0, 12]),
      }))
    const originalMatchMedia = window.matchMedia
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1)
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const container = document.createElement('div')
    const options = {
      definition: createDefinition(4),
      width: 480,
      height: 260,
      ariaLabel: 'Motion chart',
    }
    const host = mountChart(container, options)

    host.update({
      ...options,
      definition: withChartOptions(createDefinition(8), { animate: true }),
    })
    expect(requestFrame).not.toHaveBeenCalled()

    host.update({
      ...options,
      definition: withChartOptions(createDefinition(12), {
        animate: { respectReducedMotion: false },
      }),
    })
    expect(requestFrame).toHaveBeenCalled()

    host.destroy()
    window.matchMedia = originalMatchMedia
    requestFrame.mockRestore()
  })
})

function withChartOptions<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: ChartDefinition<TDatum, TXValue, TYValue>,
  options: ChartDefinitionOptions<TDatum, TXValue, TYValue>,
): ChartDefinition<TDatum, TXValue, TYValue> {
  return { ...definition, ...options }
}

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
