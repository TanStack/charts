import { defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleLog } from 'd3-scale'
import { logScatterData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => ({
  marks: [
    dot(logScatterData(input.revision), {
      x: 'x',
      y: 'y',
      key: 'id',
      r: 3.5,
      fill: '#f97316',
      stroke: '#9a3412',
      strokeWidth: 0.75,
    }),
  ],
  margin: {
    top: 16,
    right: 20,
    bottom: 40,
    left: 50,
  },
  x: {
    scale: scaleLog().domain([1, 10_000]),
    grid: true,
    label: 'Requests per second',
  },
  y: {
    scale: scaleLinear().domain([0, 100]),
    grid: true,
    label: 'Latency',
  },
}))

export const mount = tanstackMount(definition, 'Log-scale scatterplot')
