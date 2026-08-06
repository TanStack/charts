import { lineX } from '@tanstack/charts/line'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const definition = defineChart({
  marks: [lineX([4, 9, 7])],
  x: { scale: scaleLinear().domain([0, 10]) },
  y: { scale: scaleLinear().domain([0, 2]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Horizontal values',
  })
}
