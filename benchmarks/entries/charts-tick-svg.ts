import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { tickX, tickY } from '@tanstack/charts/tick'
import { scaleBand, scaleLinear } from 'd3-scale'

const data = [
  { category: 'A', low: 3, value: 5, high: 8 },
  { category: 'B', low: 4, value: 7, high: 9 },
]
const definition = defineChart({
  marks: [
    tickY(data, { x: 'category', y: 'low' }),
    tickY(data, { x: 'category', y: 'high' }),
    tickX(data, { x: 'category', y: 'value' }),
  ],
  scales: {
    x: { scale: scaleBand<string>().domain(['A', 'B']).padding(0.2) },
    y: { scale: scaleLinear().domain([0, 10]) },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Interval ticks',
  })
}
