import { hexbin } from '@tanstack/charts/spatial/hexbin'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = Array.from({ length: 120 }, (_, index) => ({
  id: index,
  x: (index * 37) % 100,
  y: (index * 61) % 100,
}))
const definition = defineChart({
  marks: [
    hexbin(rows, {
      x: 'x',
      y: 'y',
      color: 'count',
      binWidth: 20,
    }),
  ],
  x: { scale: scaleLinear().domain([0, 100]) },
  y: { scale: scaleLinear().domain([0, 100]) },
  color: {
    scale: scaleLinear<string>,
    range: ['#dbeafe', '#1d4ed8'],
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Hexbin density',
  })
}
