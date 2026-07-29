import { polar, radialArc } from '@tanstack/charts/polar'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'

const arcs = [
  {
    id: 'ingest',
    startAngle: 0,
    endAngle: Math.PI * 0.82,
    fill: '#2563eb',
  },
  {
    id: 'query',
    startAngle: Math.PI * 0.82,
    endAngle: Math.PI * 2,
    fill: '#7c3aed',
  },
]

const definition = defineChart({
  marks: [
    polar({
      marks: [
        radialArc(arcs, {
          key: 'id',
          startAngle: 'startAngle',
          endAngle: 'endAngle',
          fill: (row) => row.fill,
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
    ariaLabel: 'Polar arcs',
  })
}
