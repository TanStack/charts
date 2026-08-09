import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

export { Chart } from '@tanstack/charts/react'

export const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 10]) },
})
