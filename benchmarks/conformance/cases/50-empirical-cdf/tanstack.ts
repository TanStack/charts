import { cars } from '@charts-poc/demo-data/cars'
import { d3Curve, defineChart, lineY, rank } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { curveStepAfter } from 'd3-shape'
import { tanstackMount } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'

type CarWithEconomy = CarsRow & { 'economy (mpg)': number }

const completeCars = cars.filter(
  (row): row is CarWithEconomy => row['economy (mpg)'] !== null,
)

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

export const empiricalCdfDefinition = (input: ConformanceInput) => {
  const source = completeCars
    .slice(input.revision * 8)
    .sort((left, right) => left['economy (mpg)'] - right['economy (mpg)'])
  const ranked = rank(source, { value: 'economy (mpg)', order: 'ascending' })
  const rows = ranked.map((row) => ({
    ...row,
    probability: row.rank / source.length,
  }))

  return defineChart({
    marks: [
      lineY(rows, {
        id: 'empirical-cdf',
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
  })
}

export const mount = tanstackMount(
  empiricalCdfDefinition,
  'Empirical cumulative distribution',
)
