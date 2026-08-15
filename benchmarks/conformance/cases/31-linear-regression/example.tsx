import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { cars } from '@tanstack/charts-data/cars'
import { defineChart, dot, linearRegressionY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import type { CarsRow } from '@tanstack/charts-data/cars'

type CompleteCar = CarsRow & {
  'power (hp)': number
  'economy (mpg)': number
}

export const completeCars = cars.filter(
  (row): row is CompleteCar =>
    row['power (hp)'] !== null && row['economy (mpg)'] !== null,
)

export const createExampleChart = (input: ChartOptions) => {
  const rows = completeCars.slice(input.revision * 8, input.revision * 8 + 320)
  const scatterRows = rows

  return defineChart(
    {
      marks: [
        dot(scatterRows, {
          x: 'power (hp)',
          y: 'economy (mpg)',
          key: (row) =>
            JSON.stringify([row.name, row.year, row['weight (lb)']]),
          fill: '#93c5fd',
          stroke: '#2563eb',
          r: 3,
        }),
        linearRegressionY(rows, {
          id: 'regression',
          x: 'power (hp)',
          y: 'economy (mpg)',
          ci: 0,
          stroke: '#dc2626',
          strokeWidth: 2,
        }),
      ],
      x: { scale: scaleLinear, grid: true, axis: { label: 'Power (hp)' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Fuel economy (mpg)' },
      },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            'name' in datum
              ? `${datum.name} · ${datum['power (hp)'].toLocaleString(
                  'en-US',
                )} hp · ${datum['economy (mpg)'].toLocaleString('en-US')} mpg`
              : `Regression · ${datum.x.toLocaleString(
                  'en-US',
                )} hp · predicted ${datum.y.toLocaleString('en-US', {
                  maximumFractionDigits: 1,
                })} mpg`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Scatterplot with linear regression'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
