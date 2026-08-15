import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { cars } from '@tanstack/charts-data/cars'
import { defineChart } from '@tanstack/charts'
import { hexbin } from '@tanstack/charts/spatial/hexbin'
import { scaleLinear, scaleThreshold } from 'd3-scale'
import type { CarsRow } from '@tanstack/charts-data/cars'

type CompleteCar = CarsRow & {
  readonly 'economy (mpg)': number
}

const margin = { top: 20, right: 20, bottom: 40, left: 48 } as const
const colors = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8']
const coordinate = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

export const createExampleChart = (input: ChartOptions) => {
  const rows = cars
    .filter((row): row is CompleteCar => row['economy (mpg)'] !== null)
    .slice(input.revision * 8, input.revision * 8 + 360)

  return defineChart(
    {
      marks: [
        hexbin(rows, {
          x: 'weight (lb)',
          y: 'economy (mpg)',
          binWidth: 24,
          color: 'count',
          r: 11,
          stroke: '#ffffff',
          strokeWidth: 0.75,
        }),
      ],
      x: {
        scale: scaleLinear().domain([1500, 5500]),
        grid: true,
        axis: { label: 'Weight (lb)' },
      },
      y: {
        scale: scaleLinear().domain([5, 50]),
        grid: true,
        axis: { label: 'Fuel economy (mpg)' },
      },
      color: {
        scale: scaleThreshold<number, string>,
        domain: [5, 12, 24],
        range: colors,
      },
      margin,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: (point) =>
            `Bin center: ${coordinate.format(point.datum.x)} lb, ${coordinate.format(point.datum.y)} mpg · Cars: ${point.datum.count}`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Hexagonally binned point density'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
