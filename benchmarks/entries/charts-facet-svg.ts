import {
  createChartScene,
  facetChart,
  lineY,
  renderChartSvg,
} from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

const data = [
  { group: 'A', x: 0, y: 2 },
  { group: 'A', x: 1, y: 4 },
  { group: 'B', x: 0, y: 3 },
  { group: 'B', x: 1, y: 6 },
]
const definition = facetChart(data, {
  by: 'group',
  chart: (group) => ({
    marks: [lineY(group, { x: 'x', y: 'y' })],
    scales: {
      x: { scale: scaleLinear().domain([0, 1]) },
      y: { scale: scaleLinear().domain([0, 6]) },
    },
  }),
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Small multiples',
  })
}
