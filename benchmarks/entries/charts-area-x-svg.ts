import { areaX } from '@tanstack/charts/area-x'
import { d3AreaXCurve } from '@tanstack/charts/d3/area-x'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'
import { curveBasis } from 'd3-shape'

const rows = [
  { value: 1, x1: 0.8, x2: 1.2 },
  { value: 2, x1: 0.6, x2: 1.4 },
  { value: 3, x1: 0.9, x2: 1.1 },
]
const definition = defineChart({
  marks: [
    areaX(rows, {
      x1: 'x1',
      x2: 'x2',
      y: 'value',
      curve: d3AreaXCurve(curveBasis),
    }),
  ],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Horizontal area',
  })
}
