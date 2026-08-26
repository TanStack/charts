import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { voronoi } from '@tanstack/charts/spatial/voronoi'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  category: `group-${index % 3}`,
  x: (index * 37) % 100,
  y: (index * 61) % 100,
}))
const definition = defineChart({
  marks: [
    voronoi(rows, {
      x: 'x',
      y: 'y',
      key: 'id',
      color: 'category',
      fillOpacity: 0.2,
      stroke: '#ffffff',
      strokeWidth: 1,
    }),
  ],
  scales: {
    x: { scale: scaleLinear().domain([0, 100]) },
    y: { scale: scaleLinear().domain([0, 100]) },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Voronoi cells',
  })
}
