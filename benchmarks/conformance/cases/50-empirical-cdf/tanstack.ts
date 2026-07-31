import { cars } from '@charts-poc/demo-data/cars'
import { d3Curve, defineChart, lineY } from '@tanstack/charts'
import { rank } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { curveStepAfter } from 'd3-shape'
import { tanstackMount } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'

type CarWithEconomy = CarsRow & { 'economy (mpg)': number }

type EmpiricalPoint = CarWithEconomy & {
  probability: number
}

const completeCars = cars.filter(
  (row): row is CarWithEconomy => row['economy (mpg)'] !== null,
)

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

const definition = (input: ConformanceInput) => {
  const source = completeCars
    .slice(input.revision * 8)
    .sort((left, right) => left['economy (mpg)'] - right['economy (mpg)'])
  const ranks = rank(source.map((row) => row['economy (mpg)']))
  const rows: readonly EmpiricalPoint[] = source.map((row, index) => ({
    ...row,
    probability: ((ranks[index] ?? 0) + 1) / source.length,
  }))

  return defineChart({
    marks: [
      lineY(rows, {
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
  definition,
  'Empirical cumulative distribution',
)
