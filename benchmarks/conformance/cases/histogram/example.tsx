import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { cars } from '@charts-poc/demo-data/cars'
import { binX, defineChart, rect } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import type { CarsRow } from '@charts-poc/demo-data/cars'

type CarWithEconomy = CarsRow & { 'economy (mpg)': number }

const completeCars = cars.filter(
  (row): row is CarWithEconomy => row['economy (mpg)'] !== null,
)
const boundaries = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
export const definition = (input: ExampleOptions) => {
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
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Histogram of fuel economy'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
    keyboard: true,
    tooltip: {
      use: exampleTooltip,
      ...{
        format: ({ datum }) =>
          `${datum.x1.toLocaleString('en-US')}–${datum.x2.toLocaleString(
            'en-US',
          )} · ${datum.count.toLocaleString('en-US')} observations`,
      },
    },
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
