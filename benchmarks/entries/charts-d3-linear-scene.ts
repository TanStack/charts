import { createChartScene, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  scales: {
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([0, 10]) },
  },
})

export const scene = createChartScene(definition, {
  width: 640,
  height: 320,
})
