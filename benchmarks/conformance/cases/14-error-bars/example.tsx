import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { penguins } from '@tanstack/charts-data/penguins'
import type { PenguinsRow } from '@tanstack/charts-data/penguins'
import {
  defineChart,
  deviation,
  dot,
  groupBy,
  link,
  tickY,
} from '@tanstack/charts'
import type { TransformReduceContext } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'

const estimate = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const sampleDeviation = (context: TransformReduceContext<unknown>) =>
  context.values.length < 2 ? 0 : deviation(context)

export const createExampleChart = (input: ChartOptions) => {
  const observations = penguins
    .slice(input.revision * 8)
    .filter(
      (row): row is PenguinsRow & { body_mass_g: number } =>
        row.body_mass_g !== null,
    )
  const rows = groupBy(observations, {
    by: 'species',
    outputs: {
      mean: { value: 'body_mass_g', reduce: 'mean' },
      deviation: { value: 'body_mass_g', reduce: sampleDeviation },
    },
  })

  return defineChart(
    {
      marks: [
        link(rows, {
          id: 'error-interval',
          x1: 'species',
          y1: ({ mean, deviation: spread }) => mean - spread,
          x2: 'species',
          y2: ({ mean, deviation: spread }) => mean + spread,
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        tickY(rows, {
          id: 'error-low',
          x: 'species',
          y: ({ mean, deviation: spread }) => mean - spread,
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        tickY(rows, {
          id: 'error-high',
          x: 'species',
          y: ({ mean, deviation: spread }) => mean + spread,
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        dot(rows, {
          id: 'error-mean',
          x: 'species',
          y: 'mean',
          key: 'species',
          fill: '#2563eb',
          r: 3.5,
        }),
      ],
      x: {
        scale: () => scaleBand<string>().padding(0.22),
      },
      y: { scale: scaleLinear, grid: true, axis: { label: 'Body mass (g)' } },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: (point) =>
            `${point.datum.species} · Mean: ${estimate.format(point.datum.mean)} g · Range: ${estimate.format(point.datum.mean - point.datum.deviation)}–${estimate.format(point.datum.mean + point.datum.deviation)} g`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Point estimates with error bars'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
