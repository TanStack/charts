import { link } from '@tanstack/charts/link'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const data = [
  { id: 'a', x1: 1, y1: 4, x2: 3, y2: 7 },
  { id: 'b', x1: 2, y1: 8, x2: 5, y2: 5 },
]
const definition = defineChart({
  marks: [
    link(data, {
      x1: 'x1',
      y1: 'y1',
      x2: 'x2',
      y2: 'y2',
      key: 'id',
    }),
  ],
  x: { scale: scaleLinear().domain([0, 6]) },
  y: { scale: scaleLinear().domain([0, 10]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Linked intervals',
  })
}
