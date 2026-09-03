import { frame } from '@tanstack/charts/frame'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'

const definition = defineChart({
  marks: [
    frame({
      fill: '#eff6ff',
      stroke: '#2563eb',
      radius: 4,
    }),
  ],
  guides: false,
  scales: {
    x: null,
    y: null,
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Framed chart',
  })
}
