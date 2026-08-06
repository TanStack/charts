import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { delaunayLink } from '@tanstack/charts/spatial/delaunay'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  x: (index * 37) % 100,
  y: (index * 61) % 100,
}))
const definition = defineChart({
  marks: [delaunayLink(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 100]) },
  y: { scale: scaleLinear().domain([0, 100]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Delaunay links',
  })
}
