import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dot, linearRegressionY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { tanstackCase, tanstackMount } from '../../shared/mount'
import { samplePreviewData } from '../../shared/preview'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'

type CompleteCar = CarsRow & {
  'power (hp)': number
  'economy (mpg)': number
}

export const completeCars = cars.filter(
  (row): row is CompleteCar =>
    row['power (hp)'] !== null && row['economy (mpg)'] !== null,
)

function regressionRows(input: ConformanceInput) {
  return completeCars.slice(input.revision * 8, input.revision * 8 + 320)
}

function regressionChart(
  rows: readonly CompleteCar[],
  scatterRows: readonly CompleteCar[],
) {
  return defineChart({
    marks: [
      dot(scatterRows, {
        x: 'power (hp)',
        y: 'economy (mpg)',
        key: (row) => JSON.stringify([row.name, row.year, row['weight (lb)']]),
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
  })
}

export const regressionDefinition = (input: ConformanceInput) => {
  const rows = regressionRows(input)
  return regressionChart(rows, rows)
}

const catalogRegressionDefinition = (input: ConformanceInput) => {
  const rows = regressionRows(input)
  return regressionChart(
    rows,
    samplePreviewData(rows, input, 80, [
      (row) => row['power (hp)'],
      (row) => row['economy (mpg)'],
    ]),
  )
}

export const mount = tanstackMount(
  regressionDefinition,
  'Scatterplot with linear regression',
  {
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
)

export const catalogCase = tanstackCase(
  catalogRegressionDefinition,
  mount.ariaLabel,
  mount.interactiveTooltip,
)
