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
    x: {
      scale: scaleLinear().domain([0, 2]),
      axis: {
        label: {
          text: 'Quarter',
          fontSize: 13,
          fontWeight: 700,
          fill: '#2563eb',
          opacity: 0.8,
        },
      },
    },
    y: { scale: scaleLinear().domain([0, 10]) },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Styled axis title',
  })
}
