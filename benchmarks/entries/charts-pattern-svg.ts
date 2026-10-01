import {
  createChartScene,
  defineChart,
  lineY,
  renderChartSvg,
} from '@tanstack/charts'
import { dotPattern, linePattern } from '@tanstack/charts/pattern'
import { scaleLinear } from 'd3-scale'

const definition = defineChart({
  marks: [
    lineY([4, 9, 7], { stroke: 'url(#hatch)', strokeWidth: 8 }),
    lineY([2, 3, 5], { stroke: 'url(#grain)', strokeWidth: 8 }),
  ],
  scales: {
    x: { scale: scaleLinear().domain([0, 2]) },
    y: { scale: scaleLinear().domain([0, 10]) },
  },
  patterns: [
    linePattern({ id: 'hatch', color: 'currentColor', strokeWidth: 2 }),
    dotPattern({ id: 'grain', color: 'currentColor', radius: 1 }),
  ],
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Patterned area',
  })
}
