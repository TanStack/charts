import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { contour } from '@tanstack/charts/spatial/contour'
import { renderChartSvg } from '@tanstack/charts/svg'

const values = [
  0, 0, 0, 0, 0, 0, 3, 5, 3, 0, 0, 5, 9, 5, 0, 0, 3, 5, 3, 0, 0, 0, 0, 0, 0,
]
const definition = defineChart({
  marks: [
    contour(values, {
      width: 5,
      height: 5,
      thresholds: [3, 6],
      fill: (datum) => (datum.value >= 6 ? '#2563eb' : '#bfdbfe'),
      stroke: '#ffffff',
      strokeWidth: 0.75,
    }),
  ],
  guides: false,
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Scalar contours',
  })
}
