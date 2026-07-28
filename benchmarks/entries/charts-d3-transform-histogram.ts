import {
  colorGradientLegend,
  createChartScene,
  defineChart,
  rect,
  renderChartSvg,
} from '@tanstack/charts'
import { bin } from 'd3-array'
import { scaleLinear } from 'd3-scale'

const bins = bin<number, number>()
  .value((value) => value)
  .thresholds(5)([1, 2, 2, 3, 5, 8, 13, 21])
const definition = defineChart({
  marks: [
    rect(bins, {
      x: (entry) => ((entry.x0 ?? 0) + (entry.x1 ?? 0)) / 2,
      x1: (entry) => entry.x0,
      x2: (entry) => entry.x1,
      y1: () => 0,
      y2: (entry) => entry.length,
      z: (entry) => entry.length,
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
