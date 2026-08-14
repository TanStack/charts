import { useMemo } from 'react'
import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  focusGroupAngle,
  polar,
  radialArea,
  radialGrid,
} from '@tanstack/charts/polar'
import { Chart } from '@tanstack/charts/react/core'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveLinearClosed } from 'd3-shape'
import {
  radarColors,
  radarMonths,
  radarPoints,
  radarSeries,
  type RadarPoint,
} from './data'
import { RadarMultipleCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import { tanstackCase } from '../../shared/mount'
import { createShadcnSpringRenderer } from '../../shared/shadcn-motion'
import type { ChartTooltipOptions } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

export const radarMultipleDefinition = defineChart({
  marks: [
    polar({
      radiusRatio: 0.76,
      angle: { scale: scalePoint<string>().domain(radarMonths), wrap: true },
      radius: { scale: scaleLinear().domain([0, 320]) },
      guides: [
        radialGrid({
          values: [80, 160, 240, 320],
          shape: 'polygon',
          stroke: 'var(--border)',
        }),
        angleGrid({
          values: radarMonths,
          labels: true,
          labelOffset: 10,
          labelFill: 'var(--muted-foreground, var(--muted))',
          labelFontSize: 12,
          stroke: 'var(--border)',
        }),
      ],
      marks: [
        radialArea(
          radarPoints.filter((row) => row.series === 'desktop'),
          {
            id: 'desktop-radar',
            className: 'ts-chart__radar',
            angle: 'month',
            radius: 'visitors',
            key: 'month',
            z: 'series',
            curve: curveLinearClosed,
            fill: radarColors[0],
            fillOpacity: 0.6,
            stroke: radarColors[0],
            strokeWidth: 1,
          },
        ),
        radialArea(
          radarPoints.filter((row) => row.series === 'mobile'),
          {
            id: 'mobile-radar',
            className: 'ts-chart__radar',
            angle: 'month',
            radius: 'visitors',
            key: 'month',
            z: 'series',
            curve: curveLinearClosed,
            fill: radarColors[1],
            fillOpacity: 1,
            stroke: radarColors[1],
            strokeWidth: 1,
          },
        ),
      ],
    }),
  ],
  color: { domain: radarSeries, range: radarColors },
  margin: 0,
})

const radarTooltip: ChartTooltipOptions<RadarPoint> = {
  className: 'sc-chart-tooltip',
  anchor: 'group-center',
  content: (focused) => ({
    title: focused[0]?.datum.month ?? '',
    rows: focused.map((point) => ({
      label: point.datum.series === 'desktop' ? 'Desktop' : 'Mobile',
      value: point.datum.visitors.toLocaleString('en-US'),
      color: point.datum.series === 'desktop' ? radarColors[0] : radarColors[1],
    })),
  }),
}

function TanStackView({ input }: { input: ConformanceInput }) {
  const renderer = useMemo(
    () => createShadcnSpringRenderer<RadarPoint, string, number>(),
    [],
  )
  const definition = useMemo(
    () =>
      defineChart(radarMultipleDefinition, {
        svgAnimation: false,
        focus: focusGroupAngle,
        keyboard: true,
        tooltip: { use: tooltip, ...radarTooltip },
      }),
    [],
  )
  return (
    <RadarMultipleCard input={input}>
      {({ width, height }) => (
        <Chart
          definition={definition}
          renderer={renderer}
          initialWidth={width}
          height={height}
          ariaLabel="Desktop and mobile visitor radar"
        />
      )}
    </RadarMultipleCard>
  )
}

export const catalogCase = tanstackCase(
  () => radarMultipleDefinition,
  'Desktop and mobile visitor radar',
  radarTooltip,
  { guides: true },
)
export const tanstackMount = shadcnChartMount(TanStackView)
