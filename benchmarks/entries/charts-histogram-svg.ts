import {
  colorGradientLegend,
  binX,
  createChartScene,
  defineChart,
  rect,
  renderChartSvg,
} from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

const bins = binX([1, 2, 2, 3, 5, 8, 13, 21], {
  value: ({ datum }) => datum,
  thresholds: 5,
})
const definition = defineChart({
  marks: [
    rect(bins, {
      x: 'x',
      x1: 'x1',
      x2: 'x2',
      y1: () => 0,
      y2: 'value',
      z: 'value',
    }),
  ],
  x: { scale: scaleLinear().domain([0, 25]) },
  y: { scale: scaleLinear().domain([0, 4]) },
  color: {
    scale: scaleLinear<string>().domain([0, 4]).range(['#eff6ff', '#2563eb']),
    legend: colorGradientLegend(),
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Distribution',
  })
}
