import { ridgelineY } from '@tanstack/charts/ridgeline'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'
import type { ChartScale } from '@tanstack/charts/types'

const rows = [
  { id: 'a:0', category: 'A', x: 0, height: 0 },
  { id: 'a:1', category: 'A', x: 1, height: 1 },
  { id: 'a:2', category: 'A', x: 2, height: 0.25 },
  { id: 'b:0', category: 'B', x: 0, height: 0.25 },
  { id: 'b:1', category: 'B', x: 1, height: 0.75 },
  { id: 'b:2', category: 'B', x: 2, height: 0 },
]
const categoryScale = {
  id: 'ridge-category',
  resolve: ({ id, range }) => {
    const domain = ['A', 'B']
    const map = (value: unknown) =>
      value === 'A' ? range[0] : value === 'B' ? range[1] : Number.NaN
    return {
      id,
      type: 'point',
      domain,
      map,
      ticks: domain.map((value) => ({
        value,
        position: map(value),
        label: value,
      })),
      bandwidth: 0,
    }
  },
} satisfies ChartScale
const definition = defineChart({
  marks: [
    ridgelineY(rows, {
      x: 'x',
      y: 'category',
      height: 'height',
      key: 'id',
      overlap: 0.8,
    }),
  ],
  guides: false,
  scales: {
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: categoryScale },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Ridgeline chart',
  })
}
