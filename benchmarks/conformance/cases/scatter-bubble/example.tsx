import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { colorLegend, defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { bubbleRows } from './model'

const groupRange = ['#2563eb', '#f97316', '#10b981']

export const createExampleChart = (input: ChartOptions) => {
  const rows = bubbleRows(input.revision)

  return defineChart(
    {
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
      x: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Bill length (mm)' },
      },
      y: { scale: scaleLinear, grid: true, axis: { label: 'Bill depth (mm)' } },
      color: {
        range: groupRange,
        legend: colorLegend({ label: 'Species' }),
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Bubble scatterplot'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
