import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dodgeY, dot } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'

type CarWithEconomy = CarsRow & { 'economy (mpg)': number }

const completeCars = cars.filter(
  (row): row is CarWithEconomy => row['economy (mpg)'] !== null,
)

const margin = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
}

const definition = (input: ConformanceInput) =>
  defineChart({
    marks: [
      dot(completeCars.slice(input.revision * 8, input.revision * 8 + 72), {
        x: 'economy (mpg)',
        key: (row) => `${row.name}:${row.year}:${row['weight (lb)']}`,
        r: 4,
        fill: '#0d9488',
        stroke: '#ffffff',
        strokeWidth: 1,
        layout: dodgeY({
          anchor: 'middle',
          padding: 1,
        }),
      }),
    ],
    guides: false,
    margin,
    x: {
      scale: scaleLinear().domain([5, 50]),
    },
  })

export const mount = tanstackMount(definition, 'Beeswarm distribution')
