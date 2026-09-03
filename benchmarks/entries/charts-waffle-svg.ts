import { waffleY } from '@tanstack/charts/waffle'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'

const rows = [
  { id: 'alpha', value: 0.46 },
  { id: 'beta', value: 0.31 },
  { id: 'gamma', value: 0.23 },
]
const definition = defineChart({
  marks: [
    waffleY(rows, {
      y: 'value',
      color: 'id',
      key: 'id',
      unit: 0.01,
      gap: 2,
      round: true,
    }),
  ],
  guides: false,
  scales: {
    x: null,
    y: null,
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Waffle chart',
  })
}
