import { createChartScene, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'

const data = [
  { date: new Date('2026-01-01T00:00:00Z'), value: 4 },
  { date: new Date('2026-02-01T00:00:00Z'), value: 9 },
]
const definition = defineChart({
  marks: [lineY(data, { x: 'date', y: 'value' })],
  x: { scale: scaleUtc().domain(data.map((point) => point.date)) },
  y: { scale: scaleLinear().domain([0, 10]) },
})

export const scene = createChartScene(definition, {
  width: 640,
  height: 320,
})
