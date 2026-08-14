import { forwardRef, useMemo } from 'react'
import { areaY, d3Curve, defineChart, stack } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/react/core'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveNatural } from 'd3-shape'
import {
  dashboardChartWidth,
  dashboardTickValues,
  ShadcnDashboard,
  type DashboardChartProps,
} from './dashboard'
import {
  dashboardAreaRows,
  filterDashboardData,
  formatDashboardDate,
  type DashboardAreaDatum,
  type DashboardDatum,
  type DashboardSeries,
} from './data'
import { reactMount } from '../../shared/react-mount'
import { tanstackCase } from '../../shared/mount'
import { createShadcnSpringRenderer } from '../../shared/shadcn-motion'
import type { ChartTooltipContent, ChartTooltipOptions } from '@tanstack/charts'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const seriesOrder: readonly DashboardSeries[] = ['mobile', 'desktop']
const primaryColor = 'var(--sd-primary, var(--ts-chart-1, #171717))'
const mutedColor = 'var(--sd-muted-foreground, #737373)'
const borderColor = 'var(--sd-border, #e5e5e5)'

export function shadcnDashboardChartDefinition(
  data: readonly DashboardDatum[],
  width = 288,
) {
  const rows = dashboardAreaRows(data)
  const tickValues = dashboardTickValues(data, width)

  return defineChart({
    marks: [
      areaY(rows, {
        id: 'visitor-areas',
        x: 'dateKey',
        y: 'visitors',
        z: 'series',
        color: 'series',
        key: (row) => `${row.dateKey}:${row.series}`,
        layout: stack({ order: seriesOrder }),
        curve: d3Curve(curveNatural),
        fill: (row) => `url(#fill-${row.series})`,
        fillOpacity: 0.6,
        stroke: primaryColor,
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scalePoint,
      axis: {
        line: false,
        ticks: {
          values: tickValues,
          size: 0,
          padding: 8,
          format: formatDashboardDate,
        },
        tickLabels: {
          fontSize: 12,
          opacity: 0.72,
          dy: 5,
          anchor: ({ value }) =>
            value === data.at(-1)?.date ? 'end' : 'middle',
          dx: ({ value }) => (value === data.at(-1)?.date ? 5 : 0),
          thin: { minGap: 32, priority: 'ends' },
        },
      },
    },
    y: {
      scale: scaleLinear().domain([0, 1_200]),
      grid: true,
      axis: {
        line: false,
        ticks: { values: [0, 300, 600, 900, 1_200], size: 0 },
        tickLabels: false,
      },
    },
    color: {
      domain: seriesOrder,
      range: [primaryColor, primaryColor],
    },
    gradients: [
      {
        id: 'fill-mobile',
        x1: 0,
        y1: 1,
        x2: 0,
        y2: 0,
        stops: [
          { offset: 0.05, color: primaryColor, opacity: 0.1 },
          { offset: 0.95, color: primaryColor, opacity: 0.8 },
        ],
      },
      {
        id: 'fill-desktop',
        x1: 0,
        y1: 1,
        x2: 0,
        y2: 0,
        stops: [
          { offset: 0.05, color: primaryColor, opacity: 0.1 },
          { offset: 0.95, color: primaryColor, opacity: 1 },
        ],
      },
    ],
    margin: { top: 5, right: 5, bottom: 35, left: 5 },
    theme: {
      foreground: mutedColor,
      grid: borderColor,
      background: 'transparent',
      palette: [primaryColor],
    },
    clip: true,
  })
}

const dashboardTooltip: ChartTooltipOptions<DashboardAreaDatum> = {
  className: 'sd-chart-tooltip',
  anchor: 'group-center',
  placement: ['top', 'right', 'left', 'bottom'],
  sticky: false,
  sort: 'color-domain',
  content(points): ChartTooltipContent {
    return {
      title: formatDashboardDate(points[0]?.xValue ?? ''),
      rows: points.map((point) => ({
        label: point.datum.series === 'desktop' ? 'Desktop' : 'Mobile',
        value: point.datum.visitors.toLocaleString('en-US'),
        color: 'var(--sd-primary)',
      })),
    }
  },
}

function TanStackDashboardChart({ data, input }: DashboardChartProps) {
  const width = dashboardChartWidth(input.width)
  const renderer = useMemo(
    () => createShadcnSpringRenderer<DashboardAreaDatum, string, number>(),
    [],
  )
  const definition = useMemo(
    () =>
      defineChart(shadcnDashboardChartDefinition(data, width), {
        svgAnimation: false,
        focus: 'group-x',
        focusRing: true,
        maxFocusDistance: Number.POSITIVE_INFINITY,
        keyboard: true,
        tooltip: { use: tooltip, ...dashboardTooltip },
      }),
    [data, width],
  )

  return (
    <Chart
      definition={definition}
      renderer={renderer}
      initialWidth={width}
      height={250}
      ariaLabel="Total visitors for the last three months"
    />
  )
}

const TanStackDashboardView = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function TanStackDashboardView({ input }, ref) {
  return (
    <ShadcnDashboard
      ref={ref}
      ChartRenderer={TanStackDashboardChart}
      input={input}
    />
  )
})

export const catalogCase = tanstackCase(
  () => shadcnDashboardChartDefinition(filterDashboardData('90d')),
  'Total visitors for the last three months',
  dashboardTooltip,
  { margin: true },
)

export const mount = reactMount(TanStackDashboardView)
