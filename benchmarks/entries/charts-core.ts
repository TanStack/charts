import { createChartScene, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

const data = [
  { id: 'a', x: 0, y: 4 },
  { id: 'b', x: 1, y: 9 },
  { id: 'c', x: 2, y: 7 },
]

export const scene = createChartScene(
  defineChart({
    marks: [
      lineY(data, {
        x: 'x',
        y: 'y',
        key: 'id',
      }),
    ],
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([0, 10]) },
  }),
  { width: 640, height: 320 },
)
