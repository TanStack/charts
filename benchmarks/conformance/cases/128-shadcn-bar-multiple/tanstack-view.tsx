import { useMemo } from 'react'
import { barY, defineChart, group } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react/core'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleBand, scaleLinear } from 'd3-scale'
import { visitorMonths, type VisitorMonth } from './data'
import { BarMultipleCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import { tanstackCase } from '../../shared/mount'
import { createShadcnSpringRenderer } from '../../shared/shadcn-motion'
import type { ChartTooltipOptions } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const series = ['desktop', 'mobile'] as const
const colors = [
  'var(--chart-1, var(--ts-chart-1))',
  'var(--chart-2, var(--ts-chart-2))',
]
const groupScale = scaleBand<string>()
  .domain(series)
  .paddingInner(0.08)
  .paddingOuter(0)

export const barMultipleDefinition = defineChart({
  marks: [
    barY(visitorMonths, {
      id: 'desktop-bars',
      x: 'month',
      y: 'desktop',
      z: () => 'desktop',
      color: () => 'desktop',
      layout: group({ scale: groupScale }),
      radius: 4,
    }),
    barY(visitorMonths, {
      id: 'mobile-bars',
      x: 'month',
      y: 'mobile',
      z: () => 'mobile',
      color: () => 'mobile',
      layout: group({ scale: groupScale }),
      radius: 4,
    }),
  ],
  x: {
    scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
    axis: {
      line: false,
      ticks: { size: 0, padding: 10, format: (value) => value.slice(0, 3) },
    },
  },
  y: {
    scale: scaleLinear().domain([0, 320]),
    grid: true,
    axis: { line: false, ticks: false, tickLabels: false },
  },
  color: { domain: series, range: colors },
  margin: { top: 5, right: 5, bottom: 35, left: 5 },
  theme: {
    foreground: 'var(--muted-foreground, var(--muted))',
    grid: 'var(--border)',
  },
})

const barTooltip: ChartTooltipOptions<VisitorMonth> = {
  className: 'sc-chart-tooltip',
  anchor: 'group-center',
  sort: 'color-domain',
  content: (points) => ({
    title: points[0]?.datum.month ?? '',
    rows: points.map((point) => ({
      label: point.markId === 'desktop-bars' ? 'Desktop' : 'Mobile',
      value: Number(point.yValue).toLocaleString('en-US'),
      color: point.markId === 'desktop-bars' ? colors[0] : colors[1],
    })),
  }),
}

function TanStackView({ input }: { input: ConformanceInput }) {
  const renderer = useMemo(
    () => createShadcnSpringRenderer<VisitorMonth, string, number>(),
    [],
  )
  const definition = useMemo(
    () =>
      defineChart(barMultipleDefinition, {
        svgAnimation: false,
        focus: 'group-x',
        keyboard: true,
        tooltip: { use: tooltip, ...barTooltip },
      }),
    [],
  )
  return (
    <BarMultipleCard input={input}>
      {({ width, height }) => (
        <Chart
          definition={definition}
          renderer={renderer}
          initialWidth={width}
          height={height}
          ariaLabel="Monthly desktop and mobile visitors"
        />
      )}
    </BarMultipleCard>
  )
}

export const catalogCase = tanstackCase(
  () => barMultipleDefinition,
  'Monthly desktop and mobile visitors',
  barTooltip,
  { margin: true },
)
export const tanstackMount = shadcnChartMount(TanStackView)
