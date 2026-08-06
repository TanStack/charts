import { dodgeY } from '@tanstack/charts/dodge'
import { dot } from '@tanstack/charts/dot'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = Array.from({ length: 48 }, (_, index) => ({
  id: index,
  value: (index * 17) % 20,
}))
const definition = defineChart({
  marks: [
    dot(rows, {
      x: 'value',
      key: 'id',
      r: 4,
      layout: dodgeY({ anchor: 'middle', padding: 1 }),
    }),
  ],
  guides: false,
  x: { scale: scaleLinear().domain([0, 20]) },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Dodged dot chart',
  })
}
