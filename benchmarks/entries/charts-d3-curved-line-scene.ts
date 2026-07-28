import { createChartScene, defineChart, lineY } from '@tanstack/charts'
import { d3Curve } from '@tanstack/charts/d3/shape'
import { scaleLinear } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'

const definition = defineChart({
  marks: [lineY([4, 9, 7], { curve: d3Curve(curveMonotoneX) })],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 10]) },
})

export const scene = createChartScene(definition, {
  width: 640,
  height: 320,
})
