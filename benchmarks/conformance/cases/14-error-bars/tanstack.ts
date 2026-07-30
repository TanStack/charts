import { defineChart, dot, link, tickY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { errorData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const estimate = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const categories = [
  'Query',
  'Router',
  'Table',
  'Form',
  'Start',
  'Virtual',
  'Store',
  'DB',
]

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = errorData(input.revision)
    return {
      marks: [
        link(rows, {
          x1: 'category',
          y1: 'low',
          x2: 'category',
          y2: 'high',
          key: 'id',
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        tickY(rows, {
          x: 'category',
          y: 'low',
          key: 'id',
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        tickY(rows, {
          x: 'category',
          y: 'high',
          key: 'id',
          stroke: '#2563eb',
          strokeWidth: 1.5,
        }),
        dot(rows, {
          x: 'category',
          y: 'mean',
          key: 'id',
          fill: '#2563eb',
          r: 3.5,
        }),
      ],
      x: {
        scale: scaleBand<string>().domain(categories).padding(0.22),
      },
      y: {
        scale: scaleLinear().domain([0, 70]),
        grid: true,
        label: 'Estimate',
      },
    }
  })

export const mount = tanstackMount(
  definition,
  'Point estimates with error bars',
  {
    format: (point) =>
      `${point.datum.category} · Estimate: ${estimate.format(point.datum.mean)} · Range: ${estimate.format(point.datum.low)}–${estimate.format(point.datum.high)}`,
  },
)
