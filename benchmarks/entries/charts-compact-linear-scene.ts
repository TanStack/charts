import { createChartScene, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts-scales/linear'

const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 10]) },
})

export const scene = createChartScene(definition, {
  width: 640,
  height: 320,
})
