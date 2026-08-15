import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, dot } from '@tanstack/charts'
import { cars } from '@tanstack/charts-data/cars'
import type { CarsRow } from '@tanstack/charts-data/cars'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { selectManyPointData } from './selection'

const colors = ['#2563eb', '#7c3aed', '#db2777', '#f97316', '#0f766e']

export const createExampleChart = (input: ChartOptions) => {
  const points: readonly CarsRow[] = selectManyPointData(cars, input.revision)

  return defineChart(
    {
      marks: [
        dot(points, {
          id: 'cars',
          x: 'weight (lb)',
          y: '0-60 mph (s)',
          color: 'cylinders',
          key: (row) =>
            JSON.stringify([row.name, row.year, row['weight (lb)']]),
          r: 'displacement (cc)',
          rScale: {
            scale: () => scaleSqrt().range([2.25, 4.5]),
          },
          fillOpacity: 0.72,
        }),
      ],
      x: { scale: scaleLinear, grid: true, axis: { ticks: { count: 6 } } },
      y: { scale: scaleLinear, grid: true, axis: { ticks: { count: 6 } } },
      color: {
        range: colors,
      },
      margin: { top: 20, right: 20, bottom: 50, left: 80 },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}

export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Automobile specifications scatter'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
