import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import type { ChartScale } from '@tanstack/charts/types'
import { violinY } from '@tanstack/charts/violin'
import { scaleLinear } from 'd3-scale'

const rows = [
  { id: 'a:0', category: 'A', value: 0, width: 0 },
  { id: 'a:1', category: 'A', value: 1, width: 1 },
  { id: 'a:2', category: 'A', value: 2, width: 0.25 },
  { id: 'b:0', category: 'B', value: 0, width: 0.25 },
  { id: 'b:1', category: 'B', value: 1, width: 0.75 },
  { id: 'b:2', category: 'B', value: 2, width: 0 },
]
const categoryScale = {
  id: 'violin-category',
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
    violinY(rows, {
      x: 'category',
      y: 'value',
      width: 'width',
      key: 'id',
      span: 0.8,
    }),
  ],
  guides: false,
  x: { scale: categoryScale },
  y: { scale: scaleLinear().domain([0, 2]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Violin chart',
  })
}
