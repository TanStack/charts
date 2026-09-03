import { boxY } from '@tanstack/charts/box'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleBand, scaleLinear } from 'd3-scale'

const rows = [
  { id: 'a', category: 'A', value: 1 },
  { id: 'b', category: 'A', value: 2 },
  { id: 'c', category: 'A', value: 3 },
  { id: 'd', category: 'A', value: 5 },
  { id: 'e', category: 'A', value: 10 },
]
const definition = defineChart({
  marks: [
    boxY(rows, {
      x: 'category',
      y: 'value',
      key: 'id',
      fill: '#bfdbfe',
      stroke: '#2563eb',
    }),
  ],
  guides: false,
  scales: {
    x: { scale: scaleBand<string> },
    y: { scale: scaleLinear },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Boxplot',
  })
}
