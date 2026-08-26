import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { vector } from '@tanstack/charts/vector'
import { scaleLinear } from 'd3-scale'

const rows = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  x: index % 6,
  y: Math.floor(index / 6),
  length: 8 + (index % 4) * 2,
  direction: (index * 37) % 360,
}))

const definition = defineChart({
  marks: [
    vector(rows, {
      x: 'x',
      y: 'y',
      length: 'length',
      rotate: 'direction',
      key: 'id',
    }),
  ],
  scales: {
    x: { scale: scaleLinear().domain([-1, 6]) },
    y: { scale: scaleLinear().domain([-1, 4]) },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Vector field',
  })
}
