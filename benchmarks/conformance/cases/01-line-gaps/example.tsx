import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { aapl } from '@tanstack/charts-data/aapl'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'

export const createExampleChart = (input: ChartOptions) => {
  const rows = aapl.slice(Math.abs(input.revision) % 2)

  return defineChart(
    {
      marks: [
        lineY(rows, {
          x: 'Date',
          y: (row) => (row.Date.getUTCMonth() < 3 ? null : row.Close),
          stroke: '#2563eb',
          strokeWidth: 2.25,
        }),
      ],
      x: { scale: scaleUtc, axis: { label: 'Week' } },
      y: { scale: scaleLinear, grid: true, axis: { label: 'Close (USD)' } },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Apple closing price with first-quarter gaps'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
