import {
  createChartScene,
  defineChart,
  lineY,
  renderChartSvg,
} from '@tanstack/charts'
import type { ChartCurve } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

export function render(
  curve: ChartCurve,
  width: number,
  height: number,
): string {
  const definition = defineChart({
    marks: [lineY([4, 9, 7, 12, 10], { curve })],
    x: { scale: scaleLinear().domain([0, 4]) },
    y: { scale: scaleLinear().domain([0, 12]) },
  })
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Curved values',
  })
}
