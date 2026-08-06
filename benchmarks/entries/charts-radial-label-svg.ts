import { polar, radialRule, radialText } from '@tanstack/charts/polar'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const tau = Math.PI * 2
const labels = [
  { id: 'north', angle: 0, radius: 1, label: 'North' },
  { id: 'east', angle: Math.PI / 2, radius: 1, label: 'East' },
  { id: 'south', angle: Math.PI, radius: 1, label: 'South' },
  { id: 'west', angle: (Math.PI * 3) / 2, radius: 1, label: 'West' },
]

const definition = defineChart({
  marks: [
    polar({
      radiusRatio: 0.72,
      angle: { scale: scaleLinear().domain([0, tau]) },
      radius: { scale: scaleLinear().domain([0, 1]) },
      marks: [
        radialRule(labels, {
          angle: 'angle',
          radius1: 'radius',
          radius2: 'radius',
          radius2Offset: 16,
          key: 'id',
        }),
        radialText(labels, {
          angle: 'angle',
          radius: 'radius',
          radiusOffset: 16,
          text: 'label',
          key: 'id',
          anchor: 'outside',
        }),
      ],
    }),
  ],
  margin: 0,
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Outside radial labels and leaders',
  })
}
