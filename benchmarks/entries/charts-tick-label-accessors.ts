import {
  createChartScene,
  defineChart,
  lineY,
  renderChartSvg,
} from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  x: {
    scale: scaleLinear().domain([0, 2]),
    axis: {
      ticks: { values: [0, 1, 2] },
      tickLabels: {
        fontSize: ({ index }) => (index === 0 ? 13 : undefined),
        fontWeight: ({ index }) => (index === 0 ? 600 : undefined),
        opacity: ({ index }) => (index === 0 ? 0.62 : undefined),
        anchor: ({ index }) => (index === 0 ? 'start' : undefined),
        dx: ({ index, bandwidth }) =>
          index === 0 ? -bandwidth / 2 : undefined,
        dy: ({ index }) => (index === 0 ? 1 : undefined),
      },
    },
  },
  y: { scale: scaleLinear().domain([0, 10]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Styled tick labels',
  })
}
