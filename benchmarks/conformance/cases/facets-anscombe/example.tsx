import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { anscombe } from '@tanstack/charts-data/anscombe'
import { defineChart, dot, facet } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

export const createExampleChart = (input: ChartOptions) =>
  defineChart(
    {
      marks: [
        facet(anscombe, {
          by: 'series',
          columns: 4,
          gap: input.preview === true ? 4 : 12,
          label: input.preview === true ? false : (series) => String(series),
          chart: (facetRows) => ({
            marks: [
              dot(facetRows, {
                x: 'x',
                y: 'y',
                r: 3.5,
                fill: '#2563eb',
              }),
            ],
            x: {
              scale: scaleLinear().domain([3, 20]),
              grid: input.preview !== true,
              axis: input.preview === true ? false : { ticks: { count: 5 } },
            },
            y: {
              scale: scaleLinear().domain([2, 14]),
              grid: input.preview !== true,
              axis: input.preview === true ? false : { ticks: { count: 4 } },
            },
          }),
        }),
      ],
      margin: 0,
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
export interface ChartOptions {
  preview?: boolean
}

export const exampleAriaLabel = "Anscombe's quartet small multiples"

export const chart = createExampleChart({
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
