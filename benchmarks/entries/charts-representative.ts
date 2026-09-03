import {
  areaY,
  barY,
  createChartScene,
  defineChart,
  dot,
  lineY,
  renderChartSvg,
  ruleX,
  ruleY,
  text,
} from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'

const data = [
  { id: 'a', category: 'Alpha', x: 0, y: 4, label: 'A' },
  { id: 'b', category: 'Beta', x: 1, y: 8, label: 'B' },
]

const definition = defineChart({
  marks: [
    areaY(data, { x: 'category', y: 'y' }),
    barY(data, { x: 'category', y: 'y', key: 'id' }),
    lineY(data, { x: 'category', y: 'y', key: 'id' }),
    dot(data, { x: 'category', y: 'y', key: 'id' }),
    ruleX(['Alpha']),
    ruleY([0]),
    text(data, { x: 'category', y: 'y', text: 'label' }),
  ],
  scales: {
    x: {
      scale: scaleBand<string>()
        .domain(data.map((point) => point.category))
        .paddingInner(0.1)
        .paddingOuter(0.05),
    },
    y: { scale: scaleLinear().domain([0, 8]) },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Representative chart',
  })
}
