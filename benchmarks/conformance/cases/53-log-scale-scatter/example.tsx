import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { flare } from '@tanstack/charts-data/flare'
import { defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleLog } from 'd3-scale'
import type { FlareRow } from '@tanstack/charts-data/flare'

type SizedFlareRow = FlareRow & { readonly size: number }

function logScaleRows(input: ChartOptions) {
  return flare
    .filter((row): row is SizedFlareRow => row.size !== null && row.size > 0)
    .slice(input.revision * 8, input.revision * 8 + 200)
}

export const createExampleChart = (input: ChartOptions) => {
  const rows = logScaleRows(input)

  return defineChart(
    {
      marks: [
        dot(rows, {
          id: 'class-size-points',
          x: 'size',
          y: (row) => row.name.split('.').length - 1,
          key: 'name',
          r: 3.5,
          fill: '#f97316',
          stroke: '#9a3412',
          strokeWidth: 0.75,
        }),
      ],
      margin: {
        top: 16,
        right: 20,
        bottom: 40,
        left: 50,
      },
      x: {
        scale: scaleLog().domain([200, 30_000]),
        grid: true,
        axis: { label: 'Class size' },
      },
      y: { scale: scaleLinear, grid: true, axis: { label: 'Hierarchy depth' } },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Flare class size on a logarithmic scale'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
