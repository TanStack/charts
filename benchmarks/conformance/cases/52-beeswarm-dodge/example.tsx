import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { cars } from '@tanstack/charts-data/cars'
import { defineChart, dodgeY, dot } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import type { CarsRow } from '@tanstack/charts-data/cars'

type CarWithEconomy = CarsRow & { 'economy (mpg)': number }

const completeCars = cars.filter(
  (row): row is CarWithEconomy => row['economy (mpg)'] !== null,
)

const margin = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
}

export const createExampleChart = (input: ChartOptions) =>
  defineChart(
    {
      marks: [
        dot(completeCars.slice(input.revision * 8, input.revision * 8 + 72), {
          x: 'economy (mpg)',
          key: (row) => `${row.name}:${row.year}:${row['weight (lb)']}`,
          r: 4,
          fill: '#0d9488',
          stroke: '#ffffff',
          strokeWidth: 1,
          layout: dodgeY({
            anchor: 'middle',
            padding: 1,
          }),
        }),
      ],
      guides: false,
      margin,
      x: {
        scale: scaleLinear().domain([5, 50]),
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Beeswarm distribution'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
