import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dot, frame } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) => {
  const rows = cars
    .filter((row) => row['economy (mpg)'] !== null)
    .slice(input.revision * 8, input.revision * 8 + 320)

  return defineChart({
    marks: [
      frame({
        inset: 4,
        radius: 6,
        fill: '#eff6ff',
        stroke: '#2563eb',
        strokeOpacity: 0.7,
      }),
      dot(rows, {
        x: 'weight (lb)',
        y: 'economy (mpg)',
        fill: '#2563eb',
        fillOpacity: 0.65,
        r: 3,
      }),
    ],
    x: { scale: scaleLinear },
    y: { scale: scaleLinear },
    guides: false,
    margin: 20,
  })
}

export const mount = tanstackMount(
  definition,
  'Guide-free scatterplot with a framed plotting region',
)
