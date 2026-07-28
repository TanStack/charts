import { hexagon } from '@tanstack/charts/hexagon'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  x: index % 6,
  y: Math.floor(index / 6),
  count: 1 + (index % 8),
}))
const definition = defineChart({
  marks: [
    hexagon(rows, {
      x: 'x',
      y: 'y',
      r: 'count',
      rScale: (count) => Math.sqrt(count) * 2,
      key: 'id',
    }),
  ],
  x: { scale: scaleLinear().domain([-1, 6]) },
  y: { scale: scaleLinear().domain([-1, 4]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Hexagons',
  })
}
