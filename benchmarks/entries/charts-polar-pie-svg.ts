import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'

const rows = [
  { id: 'ingest', value: 42, fill: '#2563eb' },
  { id: 'query', value: 28, fill: '#7c3aed' },
  { id: 'alerts', value: 18, fill: '#db2777' },
  { id: 'other', value: 12, fill: '#f59e0b' },
]

const slices = pie(rows, { value: 'value' })

const definition = defineChart({
  marks: [
    polar({
      marks: [
        radialArc(slices, {
          key: 'id',
          fill: 'fill',
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
