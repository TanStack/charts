import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { anscombe } from '@charts-poc/demo-data/anscombe'
import { defineChart, dot, facet } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

export const definition = (input: ExampleOptions) =>
  defineChart({
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
  })
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = "Anscombe's quartet small multiples"

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
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
