import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { extent, mean } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'

interface RegressionPoint {
  id: string
  'power (hp)': number
  'economy (mpg)': number
}

type CompleteCar = CarsRow & {
  'power (hp)': number
  'economy (mpg)': number
}

const completeCars = cars.filter(
  (row): row is CompleteCar =>
    row['power (hp)'] !== null && row['economy (mpg)'] !== null,
)

const definition = (input: ConformanceInput) => {
  const rows = completeCars.slice(input.revision * 8, input.revision * 8 + 320)
  const meanX = mean(rows, (row) => row['power (hp)']) ?? 0
  const meanY = mean(rows, (row) => row['economy (mpg)']) ?? 0
  let covariance = 0
  let variance = 0
  for (const row of rows) {
    covariance += (row['power (hp)'] - meanX) * (row['economy (mpg)'] - meanY)
    variance += (row['power (hp)'] - meanX) ** 2
  }
  const slope = variance === 0 ? 0 : covariance / variance
  const intercept = meanY - slope * meanX
  const [minimumPower = 0, maximumPower = 0] = extent(
    rows,
    (row) => row['power (hp)'],
  )
  const trend: readonly RegressionPoint[] = [
    {
      id: 'start',
      'power (hp)': minimumPower,
      'economy (mpg)': intercept + slope * minimumPower,
    },
    {
      id: 'end',
      'power (hp)': maximumPower,
      'economy (mpg)': intercept + slope * maximumPower,
    },
  ]

  return defineChart({
    marks: [
      dot(rows, {
        x: 'power (hp)',
        y: 'economy (mpg)',
        fill: '#93c5fd',
        stroke: '#2563eb',
        r: 3,
      }),
      lineY(trend, {
        x: 'power (hp)',
        y: 'economy (mpg)',
        stroke: '#dc2626',
        strokeWidth: 2,
      }),
    ],
    x: {
      scale: scaleLinear,
      grid: true,
      label: 'Power (hp)',
    },
    y: {
      scale: scaleLinear,
      grid: true,
      label: 'Fuel economy (mpg)',
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Scatterplot with linear regression',
  {
    format: ({ datum }) =>
      'name' in datum
        ? `${datum.name} · ${datum['power (hp)'].toLocaleString(
            'en-US',
          )} hp · ${datum['economy (mpg)'].toLocaleString('en-US')} mpg`
        : `Regression · ${datum['power (hp)'].toLocaleString(
            'en-US',
          )} hp · predicted ${datum['economy (mpg)'].toLocaleString('en-US', {
            maximumFractionDigits: 1,
          })} mpg`,
  },
)
