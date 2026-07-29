import { polar, radialArc } from '@tanstack/charts/polar'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { pie } from 'd3-shape'

const rows = [
  { id: 'ingest', value: 42, fill: '#2563eb' },
  { id: 'query', value: 28, fill: '#7c3aed' },
  { id: 'alerts', value: 18, fill: '#db2777' },
  { id: 'other', value: 12, fill: '#f59e0b' },
]

const slices = pie<(typeof rows)[number]>()
  .sort(null)
  .value((row) => row.value)(rows)

const definition = defineChart({
  marks: [
    polar({
      marks: [
        radialArc(slices, {
          key: (slice) => slice.data.id,
          startAngle: 'startAngle',
          endAngle: 'endAngle',
          padAngle: 'padAngle',
          fill: (slice) => slice.data.fill,
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
    ariaLabel: 'Pie chart',
  })
}
