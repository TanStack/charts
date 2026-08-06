import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { densityContour } from '@tanstack/charts/spatial/density'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = Array.from({ length: 120 }, (_, index) => ({
  x: (index * 37) % 100,
  y: (index * 61) % 100,
}))
const definition = defineChart({
  marks: [
    densityContour(rows, {
      x: 'x',
      y: 'y',
      bandwidth: 18,
      thresholds: [0.0005, 0.001, 0.0015],
      fill: '#2563eb',
      fillOpacity: 0.2,
      stroke: '#1e3a8a',
    }),
  ],
  x: { scale: scaleLinear().domain([0, 100]) },
  y: { scale: scaleLinear().domain([0, 100]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Density contours',
  })
}
