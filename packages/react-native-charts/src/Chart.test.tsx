import * as React from 'react'
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

vi.mock('react-native', () => ({
  Text: 'span',
  View: 'div',
}))

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
const definition = defineChart(
  {
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
  },
  { tooltip: { use: tooltip, sticky: true } },
)

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
    const foreignDefinition = defineChart(
      {
        marks: [lineY(data, { x: 'month', y: 'value' })],
        x: { scale: scaleLinear().domain([1, 2]) },
        y: { scale: scaleLinear().domain([8, 12]) },
      },
      {
        tooltip: {
          id: 'foreign-tooltip',
          create: () => undefined,
        },
      },
    )

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
    const customDefinition = defineChart(
      {
        marks: [lineY(data, { x: 'month', y: 'value' })],
        x: { scale: scaleLinear().domain([1, 2]) },
        y: { scale: scaleLinear().domain([8, 12]) },
      },
      { tooltip: { use: customTooltip, sticky: true } },
    )

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

  it('rejects browser tooltip portal extensions', () => {
    const portalDefinition = defineChart(
      {
        marks: [lineY(data, { x: 'month', y: 'value' })],
        x: { scale: scaleLinear().domain([1, 2]) },
        y: { scale: scaleLinear().domain([8, 12]) },
      },
      {
        tooltip: {
          use: tooltip,
          portal: {
            id: 'browser-portal',
            create: () => undefined,
          },
        },
      },
    )

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
