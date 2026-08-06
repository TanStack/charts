import { dot } from '@tanstack/charts/dot'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = [
  { id: 'a', x: 1, y: 2 },
  { id: 'b', x: 2, y: 4 },
  { id: 'c', x: 3, y: 3 },
]
const definition = defineChart({
  marks: [dot(rows, { x: 'x', y: 'y', key: 'id', r: 4 })],
  guides: false,
  x: { scale: scaleLinear().domain([0, 4]) },
  y: { scale: scaleLinear().domain([0, 5]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Dot chart',
  })
}
