import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, dot } from '@tanstack/charts'
import { cars } from '@charts-poc/demo-data/cars'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { selectManyPointData } from './selection'

const colors = ['#2563eb', '#7c3aed', '#db2777', '#f97316', '#0f766e']

export const manyPointScatterDefinition = (points: readonly CarsRow[]) =>
  defineChart({
    marks: [
      dot(points, {
        id: 'cars',
        x: 'weight (lb)',
        y: '0-60 mph (s)',
        color: 'cylinders',
        key: (row) => JSON.stringify([row.name, row.year, row['weight (lb)']]),
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
  })

export const definition = (input: ExampleOptions) =>
  manyPointScatterDefinition(selectManyPointData(cars, input.revision))
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Automobile specifications scatter'

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
