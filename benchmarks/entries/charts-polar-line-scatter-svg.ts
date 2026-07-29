import {
  angleGrid,
  polar,
  radialDot,
  radialGrid,
  radialLine,
} from '@tanstack/charts/polar'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveLinearClosed } from 'd3-shape'

const metrics = ['latency', 'errors', 'traffic', 'saturation'] as const
const samples = [
  { metric: 'latency', value: 72, observation: 68 },
  { metric: 'errors', value: 44, observation: 51 },
  { metric: 'traffic', value: 86, observation: 79 },
  { metric: 'saturation', value: 63, observation: 70 },
] as const

const definition = defineChart({
  marks: [
    polar({
      angle: { scale: scalePoint<string>().domain(metrics), wrap: true },
      radius: { scale: scaleLinear().domain([0, 100]) },
      guides: [
        radialGrid({ values: [25, 50, 75, 100] }),
        angleGrid({ values: metrics }),
      ],
      marks: [
        radialLine(samples, {
          angle: 'metric',
          radius: 'value',
          key: 'metric',
          curve: curveLinearClosed,
          stroke: '#2563eb',
        }),
        radialDot(samples, {
          angle: 'metric',
          radius: 'observation',
          key: 'metric',
          r: 4,
          fill: '#f97316',
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
    ariaLabel: 'Polar line and scatter composition',
  })
}
