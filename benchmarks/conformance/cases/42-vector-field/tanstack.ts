import { defineChart, vector } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { vectorData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => ({
  marks: [
    vector(vectorData(input.revision), {
      x: 'x',
      y: 'y',
      length: 'speed',
      rotate: 'direction',
      key: 'id',
      stroke: '#2563eb',
    }),
  ],
  x: {
    scale: scaleLinear().domain([-0.75, 5.75]),
    grid: true,
    label: 'X',
  },
  y: {
    scale: scaleLinear().domain([-0.75, 4.75]),
    grid: true,
    label: 'Y',
  },
}))

export const mount = tanstackMount(definition, 'Two-dimensional vector field')
