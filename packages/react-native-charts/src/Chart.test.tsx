import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { bandX } from '@tanstack/charts/band'
import { barY } from '@tanstack/charts/bar'
import { crosshair } from '@tanstack/charts/crosshair'
import { createChartCursor, cursorHost } from '@tanstack/charts/cursor'
import { whenFocused } from '@tanstack/charts/focus/mark'
import { lineY } from '@tanstack/charts/line'
import { defineChart } from '@tanstack/charts/scene'
import type {
  ChartCursorController,
  ChartCursorState,
  ChartCursorStateUpdater,
  ChartScene,
} from '@tanstack/charts/types'
import { Chart } from './Chart'
import {
  tooltip,
  type NativeChartTooltipComponent,
  type NativeChartTooltipExtension,
} from './tooltip-entry'

interface MockNativeViewProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'style'
> {
  style?: unknown
  testID?: string
  accessibilityActions?: readonly { name: string }[]
  accessibilityRole?: string
  focusable?: boolean
  onAccessibilityAction?: (event: {
    nativeEvent: { actionName: string }
  }) => void
  onResponderGrant?: (event: {
    nativeEvent: { locationX: number; locationY: number }
  }) => void
  onResponderMove?: (event: {
    nativeEvent: { locationX: number; locationY: number }
  }) => void
  onResponderRelease?: (event: {
    nativeEvent: { locationX: number; locationY: number }
  }) => void
  onResponderTerminate?: () => void
  onStartShouldSetResponder?: () => boolean
  onMoveShouldSetResponder?: () => boolean
}

const nativeViewState = vi.hoisted(() => ({
  props: null as MockNativeViewProps | null,
}))

vi.mock('react-native', async () => {
  const ReactModule = await import('react')
  return {
    Text: 'span',
    View: ReactModule.forwardRef<HTMLDivElement, MockNativeViewProps>(
      function MockView(props, ref) {
        nativeViewState.props = props
        const {
          accessibilityActions,
          accessibilityRole,
          children,
          focusable,
          onAccessibilityAction,
          onBlur,
          onFocus,
          onResponderGrant,
          onResponderMove,
          onResponderRelease,
          onResponderTerminate,
          onStartShouldSetResponder,
          style,
          testID,
        } = props
        const resolvedStyle = Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : style
        const responderEvent = (event: React.PointerEvent<HTMLDivElement>) => ({
          nativeEvent: {
            locationX: event.clientX,
            locationY: event.clientY,
          },
        })
        const actionNames = accessibilityActions?.map(({ name }) => name) ?? []
        return ReactModule.createElement(
          'div',
          {
            'data-accessibility-actions': actionNames.join(' '),
            'data-accessibility-role': accessibilityRole,
            'data-focusable': String(Boolean(focusable)),
            'data-testid': testID,
            ref,
            onBlur,
            onFocus,
            onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
              const actionName =
                event.key === 'ArrowRight'
                  ? 'increment'
                  : event.key === 'ArrowLeft'
                    ? 'decrement'
                    : event.key === 'Enter' || event.key === ' '
                      ? 'activate'
                      : event.key === 'Escape'
                        ? 'escape'
                        : undefined
              if (actionName && actionNames.includes(actionName)) {
                onAccessibilityAction?.({ nativeEvent: { actionName } })
              }
            },
            onPointerCancel: onResponderTerminate,
            onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
              if (onStartShouldSetResponder?.() !== false) {
                onResponderGrant?.(responderEvent(event))
              }
            },
            onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
              onResponderMove?.(responderEvent(event))
            },
            onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
              onResponderRelease?.(responderEvent(event))
            },
            style: resolvedStyle as React.CSSProperties,
          },
          children,
        )
      },
    ),
  }
})

vi.mock('react-native-svg', () => ({
  Circle: 'circle',
  ClipPath: 'clipPath',
  Defs: 'defs',
  G: 'g',
  Line: 'line',
  LinearGradient: 'linearGradient',
  Path: 'path',
  Rect: 'rect',
  Stop: 'stop',
  Svg: 'svg',
  Text: 'text',
}))

const data = [
  { month: 1, value: 8 },
  { month: 2, value: 12 },
]
const definition = defineChart({
  marks: [
    lineY(data, {
      x: 'month',
      y: 'value',
      stroke: 'var(--series, #2563eb)',
      points: true,
    }),
  ],
  x: { scale: scaleLinear().domain([1, 2]) },
  y: { scale: scaleLinear().domain([8, 12]) },
  tooltip: { use: tooltip, sticky: true },
})

describe('React Native Chart', () => {
  it('compiles a shared definition directly into native SVG components', () => {
    const markup = renderToStaticMarkup(
      <Chart
        definition={definition}
        accessibilityLabel="Revenue"
        width={480}
        height={260}
      />,
    )

    expect(markup).toContain('<svg')
    expect(markup).toContain('viewBox="0 0 480 260"')
    expect(markup).toContain('<path')
    expect(markup).toContain('<circle')
    expect(markup).toContain('#2563eb')
    expect(markup).not.toContain('var(--')
  })

  it('waits for a native layout instead of compiling speculative geometry', () => {
    const markup = renderToStaticMarkup(
      <Chart definition={definition} accessibilityLabel="Revenue" />,
    )

    expect(markup).not.toContain('<svg')
  })

  it('declines native responder capture when pointer interaction is disabled', () => {
    nativeViewState.props = null
    const pointerDisabledDefinition = defineChart(definition, {
      pointer: false,
    })

    renderToStaticMarkup(
      <Chart
        definition={pointerDisabledDefinition}
        accessibilityLabel="Revenue"
        width={480}
        height={260}
      />,
    )

    const responderProps = nativeViewState.props as MockNativeViewProps | null
    expect(responderProps?.onStartShouldSetResponder?.()).toBe(false)
    expect(responderProps?.onMoveShouldSetResponder?.()).toBe(false)
  })

  it('declines free-cursor responder capture when pointer interaction is disabled', () => {
    nativeViewState.props = null
    const controller = createChartCursor<never, never>()
    const pointerDisabledDefinition = defineChart({
      marks: [crosshair({ x: true, y: true })],
      guides: false,
      pointer: false,
      cursor: { use: cursorHost, controller, mode: 'free' },
    })

    renderToStaticMarkup(
      <Chart
        definition={pointerDisabledDefinition}
        accessibilityLabel="Disabled free cursor"
        width={480}
        height={260}
      />,
    )

    expect(nativeViewState.props?.onStartShouldSetResponder?.()).toBe(false)
    expect(nativeViewState.props?.onMoveShouldSetResponder?.()).toBe(false)
  })

  it('rejects tooltip extensions owned by another host', () => {
    const foreignDefinition = defineChart({
      marks: [lineY(data, { x: 'month', y: 'value' })],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([8, 12]) },
      tooltip: {
        id: 'foreign-tooltip',
        create: (): undefined => undefined,
      },
    })

    expect(() =>
      renderToStaticMarkup(
        <Chart
          definition={foreignDefinition}
          accessibilityLabel="Revenue"
          width={480}
          height={260}
        />,
      ),
    ).toThrow('tooltip extension from @tanstack/react-native-charts/tooltip')
  })

  it('creates branded native tooltip extensions without singleton identity', () => {
    const CustomTooltip: NativeChartTooltipComponent = () => null
    const create = vi.fn(() => CustomTooltip)
    const customTooltip: NativeChartTooltipExtension = {
      id: 'custom-native-tooltip',
      __chartExtensionType: 'tooltip',
      __nativeChartHost: 'react-native',
      create,
    }
    const customDefinition = defineChart({
      marks: [lineY(data, { x: 'month', y: 'value' })],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([8, 12]) },
      tooltip: { use: customTooltip, sticky: true },
    })

    renderToStaticMarkup(
      <Chart
        definition={customDefinition}
        accessibilityLabel="Revenue"
        width={480}
        height={260}
      />,
    )

    expect(create).toHaveBeenCalledOnce()
  })

  it('refreshes focused callbacks with points from a resized scene', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    const onFocusChange = vi.fn()

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={definition}
            accessibilityLabel="Revenue"
            width={480}
            height={260}
            onFocusChange={onFocusChange}
          />,
        )
      })
      const chart = container.firstElementChild
      if (!chart) throw new Error('Expected the native chart root to render.')

      await React.act(() => {
        chart.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      })
      const initial = onFocusChange.mock.lastCall?.[0]

      await React.act(() => {
        root.render(
          <Chart
            definition={definition}
            accessibilityLabel="Revenue"
            width={480}
            height={520}
            onFocusChange={onFocusChange}
          />,
        )
      })
      const restored = onFocusChange.mock.lastCall?.[0]

      expect(onFocusChange).toHaveBeenCalledTimes(2)
      expect(restored).not.toBe(initial)
      expect(restored?.y).not.toBe(initial?.y)
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('keeps the focus source when only callback props change', async () => {
    const focusSources: string[] = []
    const TrackingTooltip: NativeChartTooltipComponent = ({ focusSource }) => {
      focusSources.push(focusSource)
      return null
    }
    const trackingTooltip: NativeChartTooltipExtension = {
      id: 'tracking-native-tooltip',
      __chartExtensionType: 'tooltip',
      __nativeChartHost: 'react-native',
      create: () => TrackingTooltip,
    }
    const trackingDefinition = defineChart({
      marks: [lineY(data, { x: 'month', y: 'value' })],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([8, 12]) },
      tooltip: { use: trackingTooltip },
    })
    const container = document.createElement('div')
    const root = createRoot(container)
    const onFocusChange = vi.fn()

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={trackingDefinition}
            accessibilityLabel="Revenue"
            width={480}
            height={260}
            onFocusChange={vi.fn()}
          />,
        )
      })
      const chart = container.firstElementChild
      if (!chart) throw new Error('Expected the native chart root to render.')

      await React.act(() => {
        chart.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      })
      expect(focusSources.at(-1)).toBe('keyboard')

      await React.act(() => {
        root.render(
          <Chart
            definition={trackingDefinition}
            accessibilityLabel="Revenue"
            width={480}
            height={260}
            onFocusChange={vi.fn()}
          />,
        )
      })
      expect(focusSources.at(-1)).toBe('keyboard')
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('does not re-emit focus for an equivalent inline definition', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    let focusEvents = 0

    function InlineDefinitionChart() {
      const [, rerender] = React.useReducer((value) => value + 1, 0)
      const inlineDefinition = defineChart({
        marks: [lineY(data, { x: 'month', y: 'value' })],
        x: { scale: scaleLinear().domain([1, 2]) },
        y: { scale: scaleLinear().domain([8, 12]) },
      })
      return (
        <Chart
          definition={inlineDefinition}
          accessibilityLabel="Revenue"
          width={480}
          height={260}
          onFocusChange={(point) => {
            if (!point) return
            focusEvents += 1
            if (focusEvents < 3) rerender()
          }}
        />
      )
    }

    try {
      await React.act(() => root.render(<InlineDefinitionChart />))
      const chart = container.firstElementChild
      if (!chart) throw new Error('Expected the native chart root to render.')

      await React.act(() => {
        chart.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      })

      expect(focusEvents).toBe(1)
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('renders authored focus geometry through the shared presentation layer', async () => {
    const rows = [
      { category: 'A', value: 8 },
      { category: 'B', value: 12 },
    ]
    const focusedDefinition = defineChart({
      marks: [
        whenFocused(
          bandX(rows, {
            x: 'category',
            fill: '#facc15',
            fillOpacity: 0.35,
          }),
          { match: 'x' },
        ),
        barY(rows, { x: 'category', y: 'value', fill: '#2563eb' }),
      ],
      x: { scale: scaleBand<string>().domain(['A', 'B']) },
      y: { scale: scaleLinear().domain([0, 12]) },
      guides: false,
      focusRing: false,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={focusedDefinition}
            accessibilityLabel="Focused categories"
            width={320}
            height={180}
          />,
        )
      })
      expect(container.querySelector('[fill="#facc15"]')).toBeNull()

      await React.act(() => {
        container.firstElementChild?.dispatchEvent(
          new FocusEvent('focusin', { bubbles: true }),
        )
      })

      const focusedBand =
        container.querySelector<SVGRectElement>('[fill="#facc15"]')
      expect(focusedBand).not.toBeNull()
      expect(Number(focusedBand?.getAttribute('height'))).toBeGreaterThan(0)
      expect(container.querySelectorAll('svg')).toHaveLength(1)
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('honors focusRing false instead of painting a native-only indicator', async () => {
    const noRingDefinition = defineChart({
      marks: [lineY(data, { x: 'month', y: 'value' })],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([8, 12]) },
      guides: false,
      focusRing: false,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={noRingDefinition}
            accessibilityLabel="Trend without focus ring"
            width={320}
            height={180}
          />,
        )
      })
      await React.act(() => {
        container.firstElementChild?.dispatchEvent(
          new FocusEvent('focusin', { bubbles: true }),
        )
      })

      expect(container.querySelectorAll('circle')).toHaveLength(0)
      expect(container.querySelectorAll('svg')).toHaveLength(1)
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('renders a clipped two-axis crosshair, marker, labels, and focus fill', async () => {
    const crosshairDefinition = defineChart({
      marks: [
        lineY(data, { x: 'month', y: 'value', stroke: '#2563eb' }),
        crosshair({
          x: { label: { format: (value) => `Month ${value}` } },
          y: { label: { format: (value) => `Value ${value}` } },
          marker: true,
          stroke: '#64748b',
          strokeDasharray: '3 2',
        }),
      ],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([8, 12]) },
      guides: false,
      focusRing: false,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={crosshairDefinition}
            accessibilityLabel="Crosshair trend"
            focusFill="#fef3c7"
            width={320}
            height={180}
          />,
        )
      })
      await React.act(() => {
        container.firstElementChild?.dispatchEvent(
          new FocusEvent('focusin', { bubbles: true }),
        )
      })

      const rules = [...container.querySelectorAll<SVGLineElement>('line')]
      expect(rules).toHaveLength(2)
      expect(
        rules.some(
          (rule) => rule.getAttribute('x1') === rule.getAttribute('x2'),
        ),
      ).toBe(true)
      expect(
        rules.some(
          (rule) => rule.getAttribute('y1') === rule.getAttribute('y2'),
        ),
      ).toBe(true)
      expect(
        rules.every((rule) => rule.getAttribute('stroke-dasharray') === '3 2'),
      ).toBe(true)
      expect(container.querySelector('clipPath')).not.toBeNull()
      expect(container.textContent).toContain('Month 1')
      expect(container.textContent).toContain('Value 8')
      expect(container.querySelector('circle')?.getAttribute('fill')).toBe(
        '#fef3c7',
      )
      expect(container.querySelectorAll('svg')).toHaveLength(1)
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('resolves a shared focus cursor only against viewport-visible points', async () => {
    const rows = [0, 1, 2, 3].map((x) => ({ id: String(x), x, y: x }))
    const controller = createChartCursor<number, number>()
    const viewportDefinition = defineChart({
      marks: [
        lineY(rows, { x: 'x', y: 'y', key: 'id' }),
        crosshair({ x: true, y: false }),
      ],
      x: {
        scale: scaleLinear().domain([0, 3]),
        viewport: { domain: [1, 2] },
      },
      y: { scale: scaleLinear().domain([0, 3]) },
      guides: false,
      cursor: { use: cursorHost, controller, mode: 'focus', match: 'x' },
    })
    const onFocusChange = vi.fn()
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={viewportDefinition}
            accessibilityLabel="Viewport cursor"
            width={320}
            height={180}
            onFocusChange={onFocusChange}
          />,
        )
      })
      await React.act(() => {
        controller.setState({
          anchor: 'value',
          value: { x: 0 },
          source: 'programmatic',
          pinned: false,
        })
      })
      expect(onFocusChange).not.toHaveBeenCalled()

      await React.act(() => {
        controller.setState({
          anchor: 'value',
          value: { x: 1 },
          source: 'programmatic',
          pinned: false,
        })
      })
      expect(onFocusChange.mock.lastCall?.[0]?.xValue).toBe(1)
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('renders a categorical cursor band and y rule through clipped focus guides', async () => {
    const rows = [
      { id: 'a', category: 'A', value: 8 },
      { id: 'b', category: 'B', value: 12 },
    ]
    let renderedScene:
      ChartScene<(typeof rows)[number], string, number> | undefined
    const cursorDefinition = defineChart({
      marks: [
        crosshair<string, number>({
          id: 'category-band',
          x: {
            band: {
              inset: 2,
              fill: '#facc15',
              fillOpacity: 0.24,
            },
          },
          y: false,
        }),
        barY(rows, {
          id: 'category-bars',
          x: 'category',
          y: 'value',
          key: 'id',
          inset: 4,
          fill: '#2563eb',
        }),
        crosshair<string, number>({
          id: 'value-rule',
          x: false,
          y: {
            stroke: '#64748b',
            strokeDasharray: '4 4',
          },
        }),
      ],
      x: { scale: scaleBand<string>().domain(['A', 'B']).padding(0.18) },
      y: { scale: scaleLinear().domain([0, 12]) },
      guides: false,
      focusRing: false,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={cursorDefinition}
            accessibilityLabel="Categorical cursor guides"
            width={320}
            height={180}
            onRender={({ scene }) => {
              renderedScene = scene
            }}
          />,
        )
      })
      await React.act(() => {
        container.firstElementChild?.dispatchEvent(
          new FocusEvent('focusin', { bubbles: true }),
        )
      })

      const point = renderedScene?.points.find(
        (candidate) => candidate.datum.id === 'a',
      )
      const band = container.querySelector<SVGRectElement>('[fill="#facc15"]')
      const rule = container.querySelector<SVGLineElement>(
        'line[stroke="#64748b"]',
      )
      if (!renderedScene || !point || !band || !rule) {
        throw new Error('Expected categorical cursor guides')
      }
      const expectedBandWidth = renderedScene.scales.x.bandwidth - 4
      const expectedBandX = point.x - renderedScene.scales.x.bandwidth / 2 + 2

      expect(Number(band.getAttribute('x'))).toBeCloseTo(expectedBandX)
      expect(Number(band.getAttribute('width'))).toBeCloseTo(expectedBandWidth)
      expect(Number(band.getAttribute('y'))).toBeCloseTo(renderedScene.chart.y)
      expect(Number(band.getAttribute('height'))).toBeCloseTo(
        renderedScene.chart.height,
      )
      expect(band.closest('g[clip-path]')).not.toBeNull()
      expect(rule.getAttribute('y1')).toBe(rule.getAttribute('y2'))
      expect(rule.getAttribute('stroke-dasharray')).toBe('4 4')
      expect(rule.closest('g[clip-path]')).not.toBeNull()
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('renders and synchronizes a semantic focus cursor across native hosts without recompiling scenes', async () => {
    const rows = [
      { id: 'a-1', series: 'A', month: 1, value: 6 },
      { id: 'b-1', series: 'B', month: 1, value: 10 },
      { id: 'a-2', series: 'A', month: 2, value: 8 },
      { id: 'b-2', series: 'B', month: 2, value: 12 },
    ]
    const controller = createChartCursor<number, number>()
    const controlledDefinition = defineChart({
      marks: [
        lineY(rows, {
          x: 'month',
          y: 'value',
          z: 'series',
          key: 'id',
        }),
        crosshair({
          x: { label: { format: (value) => `Month ${value}` } },
          y: false,
          marker: true,
        }),
      ],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([0, 12]) },
      guides: false,
      focus: 'group-x',
      focusRing: false,
      cursor: {
        use: cursorHost,
        controller,
        mode: 'focus',
        match: 'x',
        pin: true,
      },
    })
    const firstRender = vi.fn()
    const secondRender = vi.fn()
    const firstFocus = vi.fn()
    const secondFocus = vi.fn()
    const firstGroup = vi.fn()
    const secondGroup = vi.fn()
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(
          <>
            <Chart
              definition={controlledDefinition}
              accessibilityLabel="First synchronized chart"
              testID="first-cursor-chart"
              width={320}
              height={180}
              onFocusChange={firstFocus}
              onFocusGroupChange={firstGroup}
              onRender={firstRender}
            />
            <Chart
              definition={controlledDefinition}
              accessibilityLabel="Second synchronized chart"
              testID="second-cursor-chart"
              width={640}
              height={240}
              onFocusChange={secondFocus}
              onFocusGroupChange={secondGroup}
              onRender={secondRender}
            />
          </>,
        )
      })
      expect(container.querySelectorAll('line')).toHaveLength(0)

      await React.act(() => {
        controller.setState({
          anchor: 'value',
          value: { x: 2 },
          group: 'B',
          source: 'programmatic',
          pinned: false,
        })
      })

      expect(firstFocus.mock.lastCall?.[0]?.datum.id).toBe('b-2')
      expect(secondFocus.mock.lastCall?.[0]?.datum.id).toBe('b-2')
      expect(firstGroup.mock.lastCall?.[0]).toHaveLength(2)
      expect(secondGroup.mock.lastCall?.[0]).toHaveLength(2)
      const focusedGroup = firstGroup.mock.lastCall?.[0] as
        readonly { datum: { id: string } }[] | undefined
      expect(focusedGroup?.map((point) => point.datum.id)).toEqual([
        'b-2',
        'a-2',
      ])
      expect(container.textContent).toContain('Month 2')

      const firstChart = container.querySelector(
        '[data-testid="first-cursor-chart"]',
      )
      const secondChart = container.querySelector(
        '[data-testid="second-cursor-chart"]',
      )
      const firstRule = firstChart?.querySelector('line')
      const secondRule = secondChart?.querySelector('line')
      expect(Number(firstRule?.getAttribute('x1'))).toBeLessThan(
        Number(secondRule?.getAttribute('x1')),
      )
      expect(firstRender).toHaveBeenCalledOnce()
      expect(secondRender).toHaveBeenCalledOnce()

      await React.act(() => {
        controller.setState((current) =>
          current ? { ...current, source: 'keyboard', pinned: true } : current,
        )
      })
      expect(firstFocus).toHaveBeenCalledOnce()
      expect(secondFocus).toHaveBeenCalledOnce()
      expect(firstRender).toHaveBeenCalledOnce()
      expect(secondRender).toHaveBeenCalledOnce()

      await React.act(() => controller.setState(null))
      expect(firstFocus).toHaveBeenLastCalledWith(null)
      expect(secondFocus).toHaveBeenLastCalledWith(null)
      expect(container.querySelectorAll('line')).toHaveLength(0)
      expect(firstRender).toHaveBeenCalledOnce()
      expect(secondRender).toHaveBeenCalledOnce()
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('paints a programmatic cursor without advertising disabled native focus', async () => {
    const rows = [
      { id: 'a', x: 1, y: 4 },
      { id: 'b', x: 2, y: 8 },
    ]
    const programmatic = {
      anchor: 'value' as const,
      value: { x: 2 },
      source: 'programmatic' as const,
      pinned: true,
    }
    const controller = createChartCursor<number, number>(programmatic)
    const definition = defineChart({
      marks: [
        lineY(rows, { x: 'x', y: 'y', key: 'id' }),
        crosshair({ id: 'disabled-focus-cursor', y: false }),
      ],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([0, 10]) },
      guides: false,
      focus: false,
      cursor: {
        use: cursorHost,
        controller,
        mode: 'focus',
        match: 'x',
      },
    })
    const container = document.createElement('div')
    const root = createRoot(container)
    const onFocusChange = vi.fn()

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={definition}
            accessibilityLabel="Disabled native focus cursor chart"
            testID="disabled-native-focus-cursor-chart"
            width={320}
            height={180}
            onFocusChange={onFocusChange}
          />,
        )
      })
      const chart = container.querySelector<HTMLElement>(
        '[data-testid="disabled-native-focus-cursor-chart"]',
      )
      if (!chart) throw new Error('Expected disabled native focus cursor chart')

      expect(chart.dataset.accessibilityRole).toBe('image')
      expect(chart.dataset.focusable).toBe('false')
      expect(chart.dataset.accessibilityActions).toBe('')
      expect(container.querySelector('line')).not.toBeNull()
      expect(onFocusChange.mock.lastCall?.[0]?.xValue).toBe(2)

      await dispatchPointer(chart, 'pointerdown', 160, 90)
      expect(controller.getState()).toBe(programmatic)
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('publishes grouped native pointer and accessibility focus, pins the tooltip, and dismisses with Escape', async () => {
    const rows = [
      { id: 'a-1', series: 'A', month: 1, value: 6 },
      { id: 'b-1', series: 'B', month: 1, value: 10 },
      { id: 'a-2', series: 'A', month: 2, value: 8 },
      { id: 'b-2', series: 'B', month: 2, value: 12 },
    ]
    const tooltipStates: Array<{
      pinned: boolean
      source: string
      points: number
    }> = []
    const TrackingTooltip: NativeChartTooltipComponent = ({
      focusSource,
      pinned,
      points,
    }) => {
      tooltipStates.push({ pinned, source: focusSource, points: points.length })
      return <span data-native-tooltip />
    }
    const trackingTooltip: NativeChartTooltipExtension = {
      id: 'cursor-tracking-tooltip',
      __chartExtensionType: 'tooltip',
      __nativeChartHost: 'react-native',
      create: () => TrackingTooltip,
    }
    const controller = createChartCursor<number, number>()
    const renderedScenes: ChartScene<(typeof rows)[number], number, number>[] =
      []
    const onFocusChange = vi.fn()
    const onFocusGroupChange = vi.fn()
    const onSelect = vi.fn()
    const onRender = vi.fn(
      ({ scene }: { scene: (typeof renderedScenes)[number] }) => {
        renderedScenes.push(scene)
      },
    )
    const cursorDefinition = defineChart({
      marks: [
        lineY(rows, {
          x: 'month',
          y: 'value',
          z: 'series',
          key: 'id',
        }),
        crosshair({ x: true, y: false, marker: true }),
      ],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([0, 12]) },
      guides: false,
      focus: 'group-x',
      focusRing: false,
      tooltip: { use: trackingTooltip, sticky: true },
      cursor: {
        use: cursorHost,
        controller,
        mode: 'focus',
        match: 'x',
        pin: true,
      },
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={cursorDefinition}
            accessibilityLabel="Pointer cursor chart"
            testID="pointer-cursor-chart"
            width={320}
            height={180}
            onFocusChange={onFocusChange}
            onFocusGroupChange={onFocusGroupChange}
            onSelect={onSelect}
            onRender={onRender}
          />,
        )
      })
      const chart = container.querySelector<HTMLElement>(
        '[data-testid="pointer-cursor-chart"]',
      )
      const firstPoint = renderedScenes
        .at(-1)
        ?.points.find((point) => point.datum.id === 'b-1')
      if (!chart || !firstPoint) throw new Error('Expected native cursor chart')
      expect(chart.dataset.accessibilityRole).toBe('adjustable')
      expect(chart.dataset.accessibilityActions).toContain('escape')

      await dispatchPointer(chart, 'pointerdown', firstPoint.x, firstPoint.y)
      expect(controller.getState()).toMatchObject({
        anchor: 'value',
        value: { x: 1 },
        source: 'pointer',
        pinned: false,
      })
      expect(onFocusGroupChange.mock.lastCall?.[0]).toHaveLength(2)

      await dispatchPointer(chart, 'pointerup', firstPoint.x, firstPoint.y)
      expect(controller.getState()?.pinned).toBe(true)
      expect(onSelect.mock.lastCall?.[0]?.xValue).toBe(1)
      expect(tooltipStates.at(-1)).toEqual({
        pinned: true,
        source: 'pointer',
        points: 2,
      })

      await React.act(() => {
        chart.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
      })
      expect(controller.getState()?.pinned).toBe(true)
      await React.act(() => {
        chart.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      })
      expect(controller.getState()?.pinned).toBe(true)

      await React.act(() => {
        chart.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
        )
      })
      expect(controller.getState()).toBeNull()
      expect(onFocusChange).toHaveBeenLastCalledWith(null)
      expect(container.querySelector('[data-native-tooltip]')).toBeNull()

      const programmaticState = {
        anchor: 'value' as const,
        value: { x: 2 },
        source: 'programmatic' as const,
        pinned: false,
      }
      await React.act(() => controller.setState(programmaticState))
      await dispatchPointer(chart, 'pointerdown', -1_000, -1_000)
      expect(controller.getState()).toBe(programmaticState)
      await React.act(() => {
        chart.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
      })
      expect(controller.getState()).toBe(programmaticState)
      await React.act(() => controller.setState(null))

      await React.act(() => {
        chart.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      })
      expect(controller.getState()).toMatchObject({
        value: { x: 1 },
        source: 'keyboard',
      })
      await React.act(() => {
        chart.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            key: 'ArrowRight',
          }),
        )
      })
      expect(controller.getState()).toMatchObject({
        value: { x: 2 },
        source: 'keyboard',
      })
      expect(onRender).toHaveBeenCalledOnce()
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('treats native focus match as binding identity without clearing foreign or pinned state', async () => {
    const controller = createChartCursor<number, number>()
    const baseDefinition = defineChart({
      marks: [
        lineY(data, { x: 'month', y: 'value' }),
        crosshair({ x: true, y: true }),
      ],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([8, 12]) },
      guides: false,
      focusRing: false,
      maxFocusDistance: 1_000,
    })
    const definitionFor = (match: 'x' | 'y') =>
      defineChart(baseDefinition, {
        cursor: {
          use: cursorHost,
          controller,
          mode: 'focus',
          match,
          pin: true,
        },
      })
    const container = document.createElement('div')
    const root = createRoot(container)
    const render = async (match: 'x' | 'y') => {
      await React.act(() => {
        root.render(
          <Chart
            definition={definitionFor(match)}
            accessibilityLabel="Match-changed native cursor"
            testID="match-changed-native-cursor"
            width={320}
            height={180}
          />,
        )
      })
    }

    try {
      await render('x')
      const chart = container.querySelector<HTMLElement>(
        '[data-testid="match-changed-native-cursor"]',
      )
      if (!chart) throw new Error('Expected match-changed native cursor')

      await dispatchPointer(chart, 'pointerdown', 0, 180)
      expect(controller.getState()).toMatchObject({ value: { x: 1 } })
      await render('y')
      expect(controller.getState()).toBeNull()

      await dispatchPointer(chart, 'pointerdown', 0, 180)
      expect(controller.getState()).toMatchObject({ value: { y: 8 } })
      const foreign = {
        anchor: 'value' as const,
        value: { y: 12 },
        source: 'programmatic' as const,
        pinned: false,
      }
      await React.act(() => controller.setState(foreign))
      await render('x')
      expect(controller.getState()).toBe(foreign)

      await dispatchPointer(chart, 'pointerdown', 0, 180)
      await dispatchPointer(chart, 'pointerup', 0, 180)
      const pinned = controller.getState()
      expect(pinned?.pinned).toBe(true)
      await render('y')
      expect(controller.getState()).toBe(pinned)
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('runs a free cursor without datum focus or keyboard navigation and clears pointer-owned state', async () => {
    const controller = createChartCursor<never, never>()
    const freeDefinition = defineChart({
      marks: [
        crosshair({
          x: true,
          y: true,
          marker: true,
        }),
      ],
      guides: false,
      cursor: {
        use: cursorHost,
        controller,
        mode: 'free',
        pin: true,
      },
    })
    const onFocusChange = vi.fn()
    const onFocusGroupChange = vi.fn()
    const onRender = vi.fn()
    function FreeCursorHarness() {
      React.useSyncExternalStore(
        controller.subscribe,
        controller.getState,
        controller.getState,
      )
      return (
        <Chart
          definition={freeDefinition}
          accessibilityLabel="Free cursor chart"
          testID="free-cursor-chart"
          width={320}
          height={180}
          onFocusChange={onFocusChange}
          onFocusGroupChange={onFocusGroupChange}
          onRender={() => onRender()}
        />
      )
    }
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(<FreeCursorHarness />)
      })
      const chart = container.querySelector<HTMLElement>(
        '[data-testid="free-cursor-chart"]',
      )
      if (!chart) throw new Error('Expected free native cursor chart')
      expect(chart.dataset.accessibilityRole).toBe('image')
      expect(chart.dataset.focusable).toBe('false')
      expect(chart.dataset.accessibilityActions).toBe('')
      expect(container.querySelectorAll('line')).toHaveLength(0)

      await dispatchPointer(chart, 'pointerdown', 80, 135)
      expect(controller.getState()).toMatchObject({
        anchor: 'normalized',
        normalized: { x: 0.25, y: 0.75 },
        source: 'pointer',
        pinned: false,
      })
      expect(container.querySelectorAll('line')).toHaveLength(2)
      expect(container.querySelectorAll('circle')).toHaveLength(1)
      expect(onFocusChange).not.toHaveBeenCalled()
      expect(onFocusGroupChange).not.toHaveBeenCalled()
      expect(onRender).toHaveBeenCalledOnce()

      const stateBeforeKey = controller.getState()
      await React.act(() => {
        chart.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            key: 'ArrowRight',
          }),
        )
      })
      expect(controller.getState()).toBe(stateBeforeKey)

      await dispatchPointer(chart, 'pointerup', 80, 135)
      expect(controller.getState()?.pinned).toBe(true)
      await React.act(() => {
        chart.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
      })
      expect(controller.getState()?.pinned).toBe(true)

      await dispatchPointer(chart, 'pointerdown', 160, 90)
      await dispatchPointer(chart, 'pointerup', 160, 90)
      expect(controller.getState()).toBeNull()
      expect(container.querySelectorAll('line')).toHaveLength(0)

      await dispatchPointer(chart, 'pointermove', 160, 90)
      expect(controller.getState()).not.toBeNull()
      await dispatchPointer(chart, 'pointermove', -1, 90)
      expect(controller.getState()).toBeNull()
      expect(onRender).toHaveBeenCalledOnce()

      await React.act(() => {
        controller.setState({
          anchor: 'normalized',
          normalized: { x: 0.5, y: 0.25 },
          source: 'programmatic',
          pinned: true,
        })
      })
      expect(container.querySelectorAll('line')).toHaveLength(2)
      expect(onRender).toHaveBeenCalledOnce()
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('clears only transient cursor state published by the terminating native host', async () => {
    const controller = createChartCursor<never, never>()
    const sharedDefinition = defineChart({
      marks: [crosshair({ x: true, y: true })],
      guides: false,
      cursor: {
        use: cursorHost,
        controller,
        mode: 'free',
      },
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(
          <>
            <Chart
              definition={sharedDefinition}
              accessibilityLabel="First cursor owner"
              testID="cursor-owner-a"
              width={320}
              height={180}
            />
            <Chart
              definition={sharedDefinition}
              accessibilityLabel="Second cursor owner"
              testID="cursor-owner-b"
              width={320}
              height={180}
            />
          </>,
        )
      })
      const first = container.querySelector<HTMLElement>(
        '[data-testid="cursor-owner-a"]',
      )
      const second = container.querySelector<HTMLElement>(
        '[data-testid="cursor-owner-b"]',
      )
      if (!first || !second) throw new Error('Expected shared cursor owners')

      await dispatchPointer(first, 'pointermove', 80, 90)
      const firstState = controller.getState()
      expect(firstState).toMatchObject({ normalized: { x: 0.25, y: 0.5 } })

      const programmaticState = {
        anchor: 'normalized' as const,
        normalized: { x: 0.5, y: 0.5 },
        source: 'programmatic' as const,
        pinned: false,
      }
      await React.act(() => controller.setState(programmaticState))
      await React.act(() => {
        first.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
      })
      expect(controller.getState()).toBe(programmaticState)
      await React.act(() => {
        first.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      })
      expect(controller.getState()).toBe(programmaticState)

      await dispatchPointer(first, 'pointermove', 80, 90)
      expect(controller.getState()).not.toBe(firstState)
      await dispatchPointer(second, 'pointermove', 240, 45)
      const secondState = controller.getState()
      expect(secondState).toMatchObject({
        normalized: { x: 0.75, y: 0.25 },
        source: 'pointer',
      })

      await dispatchPointer(first, 'pointermove', -1, 90)
      expect(controller.getState()).toBe(secondState)
      await React.act(() => {
        first.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
      })
      expect(controller.getState()).toBe(secondState)
      await React.act(() => {
        first.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      })
      expect(controller.getState()).toBe(secondState)

      await React.act(() => {
        second.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
      })
      expect(controller.getState()).toBeNull()

      await dispatchPointer(second, 'pointermove', 240, 45)
      await React.act(() => {
        second.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      })
      expect(controller.getState()).toBeNull()
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('does not revive stale local focus or pointer state when a cursor binding is added and removed', async () => {
    const tooltipPointers: Array<{ x: number; y: number } | null> = []
    const TrackingTooltip: NativeChartTooltipComponent = ({ pointer }) => {
      tooltipPointers.push(pointer)
      return <span data-switching-tooltip />
    }
    const trackingTooltip: NativeChartTooltipExtension = {
      id: 'switching-cursor-tooltip',
      __chartExtensionType: 'tooltip',
      __nativeChartHost: 'react-native',
      create: () => TrackingTooltip,
    }
    const baseDefinition = defineChart({
      marks: [
        lineY(data, { x: 'month', y: 'value' }),
        crosshair({ x: true, y: false }),
      ],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([8, 12]) },
      guides: false,
      focusRing: false,
      focus: 'group-x',
      tooltip: { use: trackingTooltip, sticky: false },
      maxFocusDistance: 1_000,
    })
    const controller = createChartCursor<number, number>()
    const controlledDefinition = defineChart(baseDefinition, {
      cursor: {
        use: cursorHost,
        controller,
        mode: 'focus',
        match: 'x',
      },
    })
    const onFocusChange = vi.fn()
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await React.act(() => {
        root.render(
          <Chart
            definition={baseDefinition}
            accessibilityLabel="Switching cursor chart"
            testID="switching-cursor-chart"
            width={320}
            height={180}
            onFocusChange={onFocusChange}
          />,
        )
      })
      const chart = container.querySelector<HTMLElement>(
        '[data-testid="switching-cursor-chart"]',
      )
      if (!chart) throw new Error('Expected switching cursor chart')

      await dispatchPointer(chart, 'pointermove', 0, 180)
      expect(onFocusChange.mock.lastCall?.[0]?.xValue).toBe(1)
      expect(tooltipPointers.at(-1)).not.toBeNull()

      controller.setState({
        anchor: 'value',
        value: { x: 2 },
        source: 'pointer',
        pinned: false,
      })
      await React.act(() => {
        root.render(
          <Chart
            definition={controlledDefinition}
            accessibilityLabel="Switching cursor chart"
            testID="switching-cursor-chart"
            width={320}
            height={180}
            onFocusChange={onFocusChange}
          />,
        )
      })
      expect(onFocusChange.mock.lastCall?.[0]?.xValue).toBe(2)
      expect(tooltipPointers.at(-1)).toBeNull()

      await React.act(() => {
        root.render(
          <Chart
            definition={baseDefinition}
            accessibilityLabel="Switching cursor chart"
            testID="switching-cursor-chart"
            width={320}
            height={180}
            onFocusChange={onFocusChange}
          />,
        )
      })
      expect(onFocusChange).toHaveBeenLastCalledWith(null)
      expect(container.querySelector('[data-switching-tooltip]')).toBeNull()
      expect(container.querySelectorAll('line')).toHaveLength(0)
    } finally {
      await React.act(() => root.unmount())
    }
  })

  it('unsubscribes when a cursor is replaced, removed, and unmounted', async () => {
    const first = trackedCursorController()
    const second = trackedCursorController()
    const unboundDefinition = defineChart({
      marks: [crosshair({ x: true, y: true })],
      guides: false,
    })
    const definitionFor = (controller: ChartCursorController<never, never>) =>
      defineChart({
        marks: [crosshair({ x: true, y: true })],
        guides: false,
        cursor: { use: cursorHost, controller, mode: 'free' },
      })
    const container = document.createElement('div')
    const root = createRoot(container)

    await React.act(() => {
      root.render(
        <Chart
          definition={definitionFor(first.controller)}
          accessibilityLabel="Replaceable cursor"
          width={320}
          height={180}
        />,
      )
    })
    expect(first.subscribe).toHaveBeenCalledOnce()

    await React.act(() => {
      root.render(
        <Chart
          definition={definitionFor(second.controller)}
          accessibilityLabel="Replaceable cursor"
          width={320}
          height={180}
        />,
      )
    })
    expect(first.unsubscribe).toHaveBeenCalledOnce()
    expect(second.subscribe).toHaveBeenCalledOnce()

    await React.act(() => {
      second.controller.setState({
        anchor: 'normalized',
        normalized: { x: 0.5, y: 0.5 },
        source: 'programmatic',
        pinned: false,
      })
    })
    expect(container.querySelectorAll('line')).toHaveLength(2)

    await React.act(() => {
      root.render(
        <Chart
          definition={unboundDefinition}
          accessibilityLabel="Removed cursor"
          width={320}
          height={180}
        />,
      )
    })
    expect(second.unsubscribe).toHaveBeenCalledOnce()
    expect(container.querySelectorAll('line')).toHaveLength(0)

    await React.act(() => {
      second.controller.setState({
        anchor: 'normalized',
        normalized: { x: 0.25, y: 0.75 },
        source: 'programmatic',
        pinned: false,
      })
    })
    expect(container.querySelectorAll('line')).toHaveLength(0)

    await React.act(() => {
      root.render(
        <Chart
          definition={definitionFor(second.controller)}
          accessibilityLabel="Restored cursor"
          width={320}
          height={180}
        />,
      )
    })
    expect(second.subscribe).toHaveBeenCalledTimes(2)
    expect(container.querySelectorAll('line')).toHaveLength(2)

    await React.act(() => root.unmount())
    expect(second.unsubscribe).toHaveBeenCalledTimes(2)
    expect(container.childElementCount).toBe(0)
  })

  it('supports method-backed cursor controllers without losing their receiver', async () => {
    const controller = new MethodCursorController()
    const methodDefinition = defineChart({
      marks: [crosshair({ x: true, y: true })],
      guides: false,
      cursor: { use: cursorHost, controller, mode: 'free' },
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    await React.act(() => {
      root.render(
        <Chart
          definition={methodDefinition}
          accessibilityLabel="Method cursor"
          width={320}
          height={180}
        />,
      )
    })
    await React.act(() => {
      controller.setState({
        anchor: 'normalized',
        normalized: { x: 0.5, y: 0.5 },
        source: 'programmatic',
        pinned: false,
      })
    })
    expect(container.querySelectorAll('line')).toHaveLength(2)
    await React.act(() => root.unmount())
  })

  it('clears an owned transient cursor when its native binding is removed or unmounted', async () => {
    const controller = createChartCursor<never, never>()
    const bound = defineChart({
      marks: [crosshair({ x: true, y: true })],
      guides: false,
      cursor: { use: cursorHost, controller, mode: 'free' },
    })
    const unbound = defineChart({
      marks: [crosshair({ x: true, y: true })],
      guides: false,
    })
    const container = document.createElement('div')
    const root = createRoot(container)
    const render = async (definition: typeof bound | typeof unbound) => {
      await React.act(() => {
        root.render(
          <Chart
            definition={definition}
            accessibilityLabel="Owned transient cursor"
            testID="owned-transient-cursor"
            width={320}
            height={180}
          />,
        )
      })
    }

    await render(bound)
    let chart = container.querySelector<HTMLElement>(
      '[data-testid="owned-transient-cursor"]',
    )!
    await dispatchPointer(chart, 'pointermove', 80, 90)
    expect(controller.getState()).not.toBeNull()
    await render(unbound)
    expect(controller.getState()).toBeNull()

    await render(bound)
    chart = container.querySelector<HTMLElement>(
      '[data-testid="owned-transient-cursor"]',
    )!
    await dispatchPointer(chart, 'pointermove', 160, 45)
    expect(controller.getState()).not.toBeNull()
    await React.act(() => root.unmount())
    expect(controller.getState()).toBeNull()
  })

  it('rejects browser tooltip portal extensions', () => {
    const portalDefinition = defineChart({
      marks: [lineY(data, { x: 'month', y: 'value' })],
      x: { scale: scaleLinear().domain([1, 2]) },
      y: { scale: scaleLinear().domain([8, 12]) },
      tooltip: {
        use: tooltip,
        portal: {
          id: 'browser-portal',
          create: (): undefined => undefined,
        },
      },
    })

    expect(() =>
      renderToStaticMarkup(
        <Chart
          definition={portalDefinition}
          accessibilityLabel="Revenue"
          width={480}
          height={260}
        />,
      ),
    ).toThrow('do not support browser tooltip portal extensions')
  })
})

async function dispatchPointer(
  element: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number,
  y: number,
) {
  await React.act(() => {
    element.dispatchEvent(
      new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
    )
  })
}

function trackedCursorController() {
  const base = createChartCursor<never, never>()
  const unsubscribe = vi.fn()
  const subscribe = vi.fn((listener: () => void) => {
    const stop = base.subscribe(listener)
    return () => {
      unsubscribe()
      stop()
    }
  })
  return {
    controller: {
      getState: base.getState,
      setState: base.setState,
      subscribe,
    } satisfies ChartCursorController<never, never>,
    subscribe,
    unsubscribe,
  }
}

class MethodCursorController implements ChartCursorController<never, never> {
  private state: ChartCursorState<never, never> | null = null
  private readonly listeners = new Set<() => void>()

  getState() {
    return this.state
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setState(next: ChartCursorStateUpdater<never, never>) {
    this.state = typeof next === 'function' ? next(this.state) : next
    for (const listener of this.listeners) listener()
  }
}
