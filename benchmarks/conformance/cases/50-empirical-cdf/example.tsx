import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { cars } from '@tanstack/charts-data/cars'
import { d3Curve, defineChart, lineY, rank } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { curveStepAfter } from 'd3-shape'
import type { CarsRow } from '@tanstack/charts-data/cars'

type CarWithEconomy = CarsRow & { 'economy (mpg)': number }

const completeCars = cars.filter(
  (row): row is CarWithEconomy => row['economy (mpg)'] !== null,
)

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

export const createExampleChart = (input: ChartOptions) => {
  const source = completeCars
    .slice(input.revision * 8)
    .sort((left, right) => left['economy (mpg)'] - right['economy (mpg)'])
  const ranked = rank(source, { value: 'economy (mpg)', order: 'ascending' })
  const fullRows = ranked.map((row) => ({
    ...row,
    probability: row.rank / source.length,
  }))
  const rows = fullRows

  return defineChart(
    {
      marks: [
        lineY(rows, {
          id: 'empirical-cdf',
          key: (row) => `${row.name}:${row.year}`,
          x: 'economy (mpg)',
          y: 'probability',
          curve: d3Curve(curveStepAfter),
          stroke: '#2563eb',
          strokeWidth: 2,
        }),
      ],
      x: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Fuel economy (mpg)' },
      },
      y: {
        scale: scaleLinear().domain([0, 1]),
        grid: true,
        axis: {
          ticks: { format: (value) => percent.format(value) },
          label: 'Cumulative proportion',
        },
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Empirical cumulative distribution'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
