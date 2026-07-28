import {
  createChartScene,
  defineChart,
  lineY,
  renderChartSvg,
} from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'

const dates = [
  new Date('2026-01-01T00:00:00Z'),
  new Date('2026-02-01T00:00:00Z'),
]
const definition = defineChart({
  marks: [
    lineY(
      [
        { date: dates[0]!, value: 4 },
        { date: dates[1]!, value: 9 },
      ],
      { x: 'date', y: 'value' },
    ),
  ],
  x: { scale: scaleUtc().domain(dates) },
  y: { scale: scaleLinear().domain([0, 10]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Values over time',
  })
}
