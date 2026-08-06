import { linearRegressionY } from '@tanstack/charts/regression'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = [
  { x: 0, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 1 },
  { x: 3, y: 4 },
  { x: 4, y: 5 },
]
const definition = defineChart({
  marks: [
    linearRegressionY(rows, {
      x: 'x',
      y: 'y',
      samples: 16,
      stroke: '#dc2626',
    }),
  ],
  guides: false,
  x: { scale: scaleLinear },
  y: { scale: scaleLinear },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Linear regression',
  })
}
