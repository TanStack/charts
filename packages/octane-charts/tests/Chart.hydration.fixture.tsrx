import { defineChart, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/octane'
import { scaleLinear } from 'd3-scale'
import { useState } from 'octane'

const definition = defineChart({
  marks: [lineY([2, 4], { id: 'revenue' })],
  scales: {
    x: { scale: scaleLinear().domain([0, 1]) },
    y: { scale: scaleLinear().domain([0, 4]) },
  },
  guides: false,
})

export function HydrationSvgChart() {
  const [label, setLabel] = useState('Revenue by month')
  return (
    <div>
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel={label}
        idPrefix="octane-svg-hydration"
      />
      <button type="button" onClick={() => setLabel('Updated revenue by month')}>
        Update chart label
      </button>
    </div>
  )
}
