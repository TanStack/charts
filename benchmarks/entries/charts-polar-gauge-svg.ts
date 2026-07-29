import {
  polar,
  radialArc,
  radialDot,
  radialRule,
  radialText,
} from '@tanstack/charts/polar'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const startAngle = -Math.PI * 0.75
const endAngle = Math.PI * 0.75
const value = 72
const bands = [
  {
    id: 'healthy',
    startAngle,
    endAngle: startAngle + (endAngle - startAngle) * 0.6,
    fill: '#22c55e',
  },
  {
    id: 'warning',
    startAngle: startAngle + (endAngle - startAngle) * 0.6,
    endAngle: startAngle + (endAngle - startAngle) * 0.85,
    fill: '#f59e0b',
  },
  {
    id: 'critical',
    startAngle: startAngle + (endAngle - startAngle) * 0.85,
    endAngle,
    fill: '#ef4444',
  },
]

const definition = defineChart({
  marks: [
    polar({
      startAngle,
      endAngle,
      angle: { scale: scaleLinear().domain([0, 100]) },
      radius: { scale: scaleLinear().domain([0, 1]) },
      marks: [
        radialArc(bands, {
          key: 'id',
          startAngle: 'startAngle',
          endAngle: 'endAngle',
          innerRadius: ({ radius }) => radius * 0.72,
          cornerRadius: 3,
          fill: (band) => band.fill,
        }),
        radialRule([{ value }], {
          angle: 'value',
          radius1: 0,
          radius2: 0.68,
          strokeWidth: 3,
        }),
        radialDot([{ value, radius: 0 }], {
          angle: 'value',
          radius: 'radius',
          r: 5,
        }),
        radialText([{ value: 50, radius: 0.34, text: `${value}%` }], {
          angle: 'value',
          radius: 'radius',
          text: 'text',
          fontSize: 18,
          fontWeight: 700,
        }),
      ],
    }),
  ],
  guides: false,
  x: null,
  y: null,
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Threshold gauge',
  })
}
