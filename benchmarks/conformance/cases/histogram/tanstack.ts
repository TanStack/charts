import { cars } from '@charts-poc/demo-data/cars'
import { binX, defineChart, rect } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { tanstackCase } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'

type CarWithEconomy = CarsRow & { 'economy (mpg)': number }

const completeCars = cars.filter(
  (row): row is CarWithEconomy => row['economy (mpg)'] !== null,
)
const boundaries = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
const definition = (input: ConformanceInput) => {
  const bins = binX(completeCars.slice(input.revision * 8), {
    value: 'economy (mpg)',
    thresholds: boundaries,
    outputs: { count: { reduce: 'count' } },
  })

  return defineChart({
    marks: [
      rect(bins, {
        x1: 'x1',
        x2: 'x2',
        y1: () => 0,
        y2: 'count',
        fill: '#2563eb',
        inset: 1,
      }),
    ],
    x: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Fuel economy (mpg)' },
    },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Count' } },
  })
}

export const catalogCase = tanstackCase(
  definition,
  'Histogram of fuel economy',
  {
    format: ({ datum }) =>
      `${datum.x1.toLocaleString('en-US')}–${datum.x2.toLocaleString(
        'en-US',
      )} · ${datum.count.toLocaleString('en-US')} observations`,
  },
)

export const mount = catalogCase.mount
