import { differenceY } from '@tanstack/charts/difference'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = [
  { x: 0, comparison: 2, primary: 1 },
  { x: 1, comparison: 2, primary: 3 },
  { x: 2, comparison: 2, primary: 4 },
  { x: 3, comparison: 2, primary: 1 },
]
const definition = defineChart({
  marks: [
    differenceY(rows, {
      x: 'x',
      y1: 'comparison',
      y2: 'primary',
      positiveFill: '#16a34a',
      negativeFill: '#dc2626',
    }),
  ],
  guides: false,
  scales: {
    x: { scale: scaleLinear },
    y: { scale: scaleLinear },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Difference chart',
  })
}
