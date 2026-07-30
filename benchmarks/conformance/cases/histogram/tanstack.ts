import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, rect } from '@tanstack/charts'
import { bin } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'

interface HistogramBin {
  id: string
  x0: number
  x1: number
  count: number
}

type CarWithEconomy = CarsRow & { 'economy (mpg)': number }

const completeCars = cars.filter(
  (row): row is CarWithEconomy => row['economy (mpg)'] !== null,
)
const boundaries = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
const createBins = bin<CarWithEconomy, number>()
  .value((row) => row['economy (mpg)'])
  .domain([boundaries[0] ?? 5, boundaries.at(-1) ?? 50])
  .thresholds(boundaries.slice(1, -1))

const definition = (input: ConformanceInput) => {
  const bins: readonly HistogramBin[] = createBins(
    completeCars.slice(input.revision * 8),
  ).flatMap((bucket, index) =>
    bucket.x0 === undefined || bucket.x1 === undefined
      ? []
      : [
          {
            id: `bin:${index}`,
            x0: bucket.x0,
            x1: bucket.x1,
            count: bucket.length,
          },
        ],
  )

  return defineChart({
    marks: [
      rect(bins, {
        x1: 'x0',
        x2: 'x1',
        y1: () => 0,
        y2: 'count',
        fill: '#2563eb',
        inset: 1,
      }),
    ],
    x: {
      scale: scaleLinear,
      grid: true,
      label: 'Fuel economy (mpg)',
    },
    y: {
      scale: scaleLinear,
      grid: true,
      label: 'Count',
    },
  })
}

export const mount = tanstackMount(definition, 'Histogram of fuel economy', {
  format: ({ datum }) =>
    `${datum.x0.toLocaleString('en-US')}–${datum.x1.toLocaleString(
      'en-US',
    )} · ${datum.count.toLocaleString('en-US')} observations`,
})
