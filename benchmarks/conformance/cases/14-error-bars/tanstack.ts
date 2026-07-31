import { penguins } from '@charts-poc/demo-data/penguins'
import { defineChart, dot, link, tickY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { summarizeErrorBars } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const estimate = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const definition = (input: ConformanceInput) => {
  const rows = summarizeErrorBars(penguins.slice(input.revision * 8))
  return defineChart({
    marks: [
      link(rows, {
        x1: 'species',
        y1: 'low',
        x2: 'species',
        y2: 'high',
        stroke: '#2563eb',
        strokeWidth: 1.5,
      }),
      tickY(rows, {
        x: 'species',
        y: 'low',
        stroke: '#2563eb',
        strokeWidth: 1.5,
      }),
      tickY(rows, {
        x: 'species',
        y: 'high',
        stroke: '#2563eb',
        strokeWidth: 1.5,
      }),
      dot(rows, {
        x: 'species',
        y: 'mean',
        fill: '#2563eb',
        r: 3.5,
      }),
    ],
    x: {
      scale: () => scaleBand<string>().padding(0.22),
    },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Body mass (g)' } },
  })
}

export const mount = tanstackMount(
  definition,
  'Point estimates with error bars',
  {
    format: (point) =>
      `${point.datum.species} · Mean: ${estimate.format(point.datum.mean)} g · Range: ${estimate.format(point.datum.low)}–${estimate.format(point.datum.high)} g`,
  },
)
