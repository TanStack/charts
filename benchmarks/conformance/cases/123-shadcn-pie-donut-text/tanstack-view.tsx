import { useMemo } from 'react'
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc, radialText } from '@tanstack/charts/polar'
import { Chart } from '@tanstack/charts/react/core'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleLinear } from 'd3-scale'
import {
  browserColors,
  browserData,
  centerLabels,
  type BrowserDatum,
  type CenterLabel,
} from './data'
import { PieDonutTextCard } from './view'
import { shadcnChartMount } from '../../shared/shadcn-chart-card'
import { tanstackCase } from '../../shared/mount'
import {
  createShadcnSpringRenderer,
  shadcnSpringMotion,
} from '../../shared/shadcn-motion'
import type { ChartTooltipOptions } from '@tanstack/charts'
import type { PieDatum } from '@tanstack/charts/polar'
import type { ConformanceInput } from '../../types'

const browsers = browserData.map((row) => row.browser)
const arcs = pie(browserData, {
  value: 'visitors',
  startAngle: Math.PI / 2,
  endAngle: (-Math.PI * 3) / 2,
})

export const pieDonutTextDefinition = defineChart({
  motion: shadcnSpringMotion,
  marks: [
    polar({
      radiusRatio: 0.768,
      angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
      radius: { scale: scaleLinear().domain([0, 1]) },
      marks: [
        radialArc(arcs, {
          id: 'browser-slices',
          key: 'browser',
          innerRadius: ({ radius }) => radius * 0.625,
          color: 'browser',
          stroke: 'var(--background, var(--panel))',
          strokeWidth: 5,
        }),
        radialText(centerLabels.slice(0, 1), {
          id: 'visitor-total',
          angle: 'angle',
          radius: 'radius',
          key: 'id',
          text: 'text',
          dy: -5,
          fill: 'var(--foreground, currentColor)',
          fontSize: 30,
          fontWeight: 700,
        }),
        radialText(centerLabels.slice(1), {
          id: 'visitor-label',
          angle: 'angle',
          radius: 'radius',
          key: 'id',
          text: 'text',
          dy: 19,
          fill: 'var(--muted-foreground, var(--muted))',
          fontSize: 14,
        }),
      ],
    }),
  ],
  color: { domain: browsers, range: browserColors },
  margin: 0,
})

const donutTooltip: ChartTooltipOptions<PieDatum<BrowserDatum> | CenterLabel> =
  {
    className: 'sc-chart-tooltip',
    content: (points) => ({
      rows: points.flatMap((point) =>
        'browser' in point.datum
          ? [
              {
                label:
                  point.datum.browser[0]!.toUpperCase() +
                  point.datum.browser.slice(1),
                value: point.datum.visitors.toLocaleString('en-US'),
                color: point.color,
              },
            ]
          : [],
      ),
    }),
  }

function TanStackView({ input }: { input: ConformanceInput }) {
  const renderer = useMemo(
    () =>
      createShadcnSpringRenderer<
        PieDatum<BrowserDatum> | CenterLabel,
        number,
        number
      >(),
    [],
  )
  const definition = useMemo(
    () =>
      defineChart(pieDonutTextDefinition, {
        svgAnimation: false,
        keyboard: true,
        tooltip: { use: tooltip, ...donutTooltip },
      }),
    [],
  )
  return (
    <PieDonutTextCard input={input}>
      {({ width, height }) => (
        <Chart
          definition={definition}
          renderer={renderer}
          initialWidth={width}
          height={height}
          ariaLabel="Browser visitors donut"
        />
      )}
    </PieDonutTextCard>
  )
}

export const catalogCase = tanstackCase(
  () => pieDonutTextDefinition,
  'Browser visitors donut',
  donutTooltip,
)
export const tanstackMount = shadcnChartMount(TanStackView)
