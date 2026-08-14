import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { colorLegend, defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { bubbleRows } from './model'

const groupRange = ['#2563eb', '#f97316', '#10b981']

export const definition = (input: ExampleOptions) => {
  const rows = bubbleRows(input.revision)

  return defineChart({
    marks: [
      dot(rows, {
        key: (row) =>
          `${row.species}:${row.island}:${row.culmen_length_mm}:${row.culmen_depth_mm}:${row.flipper_length_mm}:${row.body_mass_g}:${row.sex}`,
        x: 'culmen_length_mm',
        y: 'culmen_depth_mm',
        color: 'species',
        r: 'body_mass_g',
        rScale: {
          scale: () => scaleSqrt().range([3, 11]),
        },
        fillOpacity: 0.78,
        stroke: 'currentColor',
        strokeOpacity: 0.28,
        strokeWidth: 0.75,
      }),
    ],
    x: { scale: scaleLinear, grid: true, axis: { label: 'Bill length (mm)' } },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Bill depth (mm)' } },
    color: {
      range: groupRange,
      legend: colorLegend({ label: 'Species' }),
    },
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Bubble scatterplot'

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
