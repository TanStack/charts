import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { scaleLinear } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { lineY } from '@tanstack/charts/line'
import { defineChart } from '@tanstack/charts/scene'
import { Chart } from './Chart'
import {
  tooltip,
  type NativeChartTooltipComponent,
  type NativeChartTooltipExtension,
} from './tooltip-entry'

vi.mock('react-native', async () => {
  const ReactModule = await import('react')
  return {
    Text: 'span',
    View: ReactModule.forwardRef<
      HTMLDivElement,
      React.HTMLAttributes<HTMLDivElement> & { style?: unknown }
    >(function MockView({ children, onBlur, onFocus, style }, ref) {
      const resolvedStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style
      return ReactModule.createElement(
        'div',
        {
          ref,
          onBlur,
          onFocus,
          style: resolvedStyle as React.CSSProperties,
        },
        children,
      )
    }),
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
