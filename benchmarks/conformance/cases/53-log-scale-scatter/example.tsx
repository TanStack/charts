import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { flare } from '@charts-poc/demo-data/flare'
import { defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleLog } from 'd3-scale'
import type { FlareRow } from '@charts-poc/demo-data/flare'

type SizedFlareRow = FlareRow & { readonly size: number }

function logScaleRows(input: ExampleOptions) {
  return flare
    .filter((row): row is SizedFlareRow => row.size !== null && row.size > 0)
    .slice(input.revision * 8, input.revision * 8 + 200)
}

function logScaleChart(rows: readonly SizedFlareRow[]) {
  return defineChart({
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
  })
}

export const logScaleScatterDefinition = (input: ExampleOptions) =>
  logScaleChart(logScaleRows(input))
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Flare class size on a logarithmic scale'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(logScaleScatterDefinition(options), {
    keyboard: true,
    tooltip: exampleTooltip,
  })

export const chart = createExampleChart({
  width: 640,
  height: 480,
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
