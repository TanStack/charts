import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { cars } from '@tanstack/charts-data/cars'
import { defineChart, dot } from '@tanstack/charts'
import { delaunayLink } from '@tanstack/charts/spatial/delaunay'
import { scaleLinear } from 'd3-scale'
import type { CarsRow } from '@tanstack/charts-data/cars'

const carKey = (row: CarsRow) => `${row.name}:${row.year}:${row['weight (lb)']}`

export const createExampleChart = (input: ChartOptions) => {
  const points = cars
    .filter((row) => {
      return row['economy (mpg)'] !== null && row['power (hp)'] !== null
    })
    .slice(input.revision * 3, input.revision * 3 + 24)
  return defineChart(
    {
      marks: [
        delaunayLink(points, {
          x: 'weight (lb)',
          y: 'economy (mpg)',
          key: carKey,
          stroke: '#94a3b8',
          strokeOpacity: 0.75,
          strokeWidth: 1,
        }),
        dot(points, {
          x: 'weight (lb)',
          y: 'economy (mpg)',
          key: carKey,
          fill: '#2563eb',
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 4,
        }),
      ],
      x: { scale: scaleLinear, grid: true, axis: { label: 'Weight (lb)' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Fuel economy (mpg)' },
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Delaunay spatial network'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
