import { dot } from '@tanstack/charts/dot'
import { focusGuideX } from '@tanstack/charts/focus/guide'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = [
  { id: 'a', series: 'one', x: 1, y: 2 },
  { id: 'b', series: 'one', x: 2, y: 4 },
  { id: 'c', series: 'one', x: 3, y: 3 },
]
const definition = defineChart({
  marks: [
    dot(rows, { x: 'x', y: 'y', key: 'id', r: 4 }),
    focusGuideX(rows, {
      x: 'x',
      y: 'y',
      z: 'series',
      key: 'id',
      yRule: {},
      marker: {},
      xLabel: {},
      yLabel: {},
    }),
  ],
  guides: false,
  x: { scale: scaleLinear().domain([0, 4]) },
  y: { scale: scaleLinear().domain([0, 5]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Focus guide chart',
  })
}
