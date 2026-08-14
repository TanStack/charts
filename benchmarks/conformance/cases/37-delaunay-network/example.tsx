import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dot } from '@tanstack/charts'
import { delaunayLink } from '@tanstack/charts/spatial/delaunay'
import { scaleLinear } from 'd3-scale'
import type { CarsRow } from '@charts-poc/demo-data/cars'

const carKey = (row: CarsRow) => `${row.name}:${row.year}:${row['weight (lb)']}`

export const definition = (input: ExampleOptions) => {
  const points = cars
    .filter((row) => {
      return row['economy (mpg)'] !== null && row['power (hp)'] !== null
    })
    .slice(input.revision * 3, input.revision * 3 + 24)
  return defineChart({
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
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Delaunay spatial network'

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
