import { defineChart, dot, frame } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { scatterData } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => ({
  marks: [
    frame({
      inset: 4,
      radius: 6,
      fill: '#eff6ff',
      stroke: '#2563eb',
      strokeOpacity: 0.7,
    }),
    dot(scatterData(input.revision), {
      x: 'x',
      y: 'y',
      key: 'id',
      fill: '#2563eb',
      fillOpacity: 0.65,
      r: 3,
    }),
  ],
  x: { scale: scaleLinear().domain([0, 105]) },
  y: { scale: scaleLinear().domain([0, 90]) },
  guides: false,
  margin: 20,
}))

export const mount = tanstackMount(
  definition,
  'Guide-free scatterplot with a framed plotting region',
)
