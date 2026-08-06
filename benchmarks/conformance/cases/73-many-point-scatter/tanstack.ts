import { defineChart, dot } from '@tanstack/charts'
import { cars } from '@charts-poc/demo-data/cars'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { selectManyPointData } from './selection'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = ['#2563eb', '#7c3aed', '#db2777', '#f97316', '#0f766e']

export const manyPointScatterDefinition = (points: readonly CarsRow[]) =>
  defineChart({
    marks: [
      dot(points, {
        id: 'cars',
        x: 'weight (lb)',
        y: '0-60 mph (s)',
        color: 'cylinders',
        key: (row) => JSON.stringify([row.name, row.year, row['weight (lb)']]),
        r: 'displacement (cc)',
        rScale: {
          scale: () => scaleSqrt().range([2.25, 4.5]),
        },
        fillOpacity: 0.72,
      }),
    ],
    x: { scale: scaleLinear, grid: true, axis: { ticks: { count: 6 } } },
    y: { scale: scaleLinear, grid: true, axis: { ticks: { count: 6 } } },
    color: {
      range: colors,
    },
    margin: { top: 20, right: 20, bottom: 50, left: 80 },
  })

const definition = (input: ConformanceInput) =>
  manyPointScatterDefinition(selectManyPointData(cars, input.revision))

export const mount = tanstackMount(
  definition,
  'Automobile specifications scatter',
)
