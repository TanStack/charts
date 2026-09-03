import { polar, radialBarAngle, radialBarRadius } from '@tanstack/charts/polar'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleBand, scaleLinear } from 'd3-scale'

const rows = [
  { id: 'alpha', value: 8 },
  { id: 'beta', value: 5 },
  { id: 'gamma', value: 3 },
] as const
const radiusDefinition = defineChart({
  marks: [
    polar({
      scales: {
        angle: { scale: () => scaleBand<string>().padding(0.08) },
        radius: {
          scale: scaleLinear().domain([0, 8]),
          range: [({ radius }) => radius * 0.25, ({ radius }) => radius],
        },
      },

      marks: [
        radialBarRadius(rows, {
          angle: 'id',
          radius: 'value',
          key: 'id',
          fill: '#2563eb',
        }),
      ],
    }),
  ],
  scales: {
    x: null,
    y: null,
  },
})

const angleDefinition = defineChart({
  marks: [
    polar({
      scales: {
        angle: { scale: scaleLinear().domain([0, 8]) },
        radius: {
          scale: () => scaleBand<string>().paddingInner(0.3).paddingOuter(0.15),
          range: [({ radius }) => radius * 0.2, ({ radius }) => radius],
        },
      },

      marks: [
        radialBarAngle(rows, {
          angle: 'value',
          radius: 'id',
          key: 'id',
          cornerRadius: 'full',
          fill: '#7c3aed',
        }),
      ],
    }),
  ],
  scales: {
    x: null,
    y: null,
  },
})

export function render(width: number, height: number) {
  const options = { width, height }
  return [
    renderChartSvg(createChartScene(radiusDefinition, options), {
      ariaLabel: 'Radius-extending polar bars',
    }),
    renderChartSvg(createChartScene(angleDefinition, options), {
      ariaLabel: 'Angle-extending polar bars',
    }),
  ].join('\n')
}
