import { useMemo } from 'react'
import { defineChart } from '@tanstack/charts'
import {
  pie,
  polar,
  radialArc,
  radialBarAngle,
  radialText,
} from '@tanstack/charts/polar'
import { Chart } from '@tanstack/charts/react/core'
import { scaleBand, scaleLinear } from 'd3-scale'
import { radialCenterLabels, radialData, type RadialDatum } from './data'
import { RadialTextCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import { tanstackCase } from '../../shared/mount'
import {
  createShadcnSpringRenderer,
  shadcnSpringMotion,
} from '../../shared/shadcn-motion'
import type { ConformanceInput } from '../../types'
import type { PieDatum } from '@tanstack/charts/polar'

const startAngle = Math.PI / 2
const endAngle = (-Math.PI * 160) / 180
const radiusScale = scaleBand<string>().domain(['visitors'])
const backgroundArc = pie([{ id: 'background', value: 1 }], { value: 'value' })
type RadialTextDatum =
  | PieDatum<{ id: string; value: number }>
  | RadialDatum
  | (typeof radialCenterLabels)[number]

export const radialTextDefinition = defineChart({
  motion: shadcnSpringMotion,
  marks: [
    polar({
      angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
      radius: { scale: scaleLinear().domain([0, 1]) },
      marks: [
        radialArc(backgroundArc, {
          id: 'radial-background',
          key: 'id',
          innerRadius: 80,
          outerRadius: 90,
          fill: 'var(--muted, var(--panel-muted))',
        }),
      ],
    }),
    polar({
      radiusRatio: 0.72,
      startAngle,
      endAngle,
      angle: { scale: scaleLinear().domain([0, 200]) },
      radius: {
        scale: radiusScale,
        range: [80, 90],
      },
      marks: [
        radialBarAngle(radialData, {
          id: 'radial-value',
          angle: 'visitors',
          radius: 'ring',
          key: 'browser',
          fill: 'var(--chart-2, var(--ts-chart-2))',
          cornerRadius: 10,
        }),
      ],
    }),
    polar({
      angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
      radius: { scale: scaleLinear().domain([0, 1]) },
      marks: [
        radialText(radialCenterLabels.slice(0, 1), {
          id: 'radial-total',
          angle: 'angle',
          radius: 'radius',
          key: 'id',
          text: 'text',
          dy: 0,
          fill: 'var(--foreground, currentColor)',
          fontSize: 36,
          fontWeight: 700,
        }),
        radialText(radialCenterLabels.slice(1), {
          id: 'radial-label',
          angle: 'angle',
          radius: 'radius',
          key: 'id',
          text: 'text',
          dy: 24,
          fill: 'var(--muted-foreground, var(--muted))',
          fontSize: 14,
        }),
      ],
    }),
  ],
  margin: 0,
})

function TanStackView({ input }: { input: ConformanceInput }) {
  const renderer = useMemo(
    () =>
      createShadcnSpringRenderer<RadialTextDatum, number, string | number>(),
    [],
  )
  const definition = useMemo(
    () =>
      defineChart(radialTextDefinition, { svgAnimation: false, focus: false }),
    [],
  )
  return (
    <RadialTextCard input={input}>
      {({ width, height }) => (
        <Chart
          definition={definition}
          renderer={renderer}
          initialWidth={width}
          height={height}
          ariaLabel="Safari visitors radial chart"
        />
      )}
    </RadialTextCard>
  )
}

export const catalogCase = tanstackCase(
  () => radialTextDefinition,
  'Safari visitors radial chart',
)
export const tanstackMount = shadcnChartMount(TanStackView)
