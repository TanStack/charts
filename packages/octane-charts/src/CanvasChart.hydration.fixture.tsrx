import { defineChart, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/octane/canvas'
import { scaleLinear } from 'd3-scale'

const data = [
  { id: 'jan', month: 1, value: 8 },
  { id: 'feb', month: 2, value: 12 },
]
const definition = defineChart({
  marks: [
    lineY(data, {
      x: 'month',
      y: 'value',
      key: 'id',
      stroke: '#2563eb',
    }),
  ],
  x: { scale: scaleLinear().domain([1, 2]) },
  y: { scale: scaleLinear().domain([8, 12]) },
  guides: false,
})

export function HydrationCanvasChart() {
  return (
    <Chart
      definition={definition}
      width={480}
      height={260}
      ariaLabel="Revenue"
      idPrefix="octane-canvas-hydration"
    />
  )
}
