import {
  createChartScene,
  defineChart,
  lineY,
  renderChartSvg,
} from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  scales: {
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([0, 10]) },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Values',
  })
}
