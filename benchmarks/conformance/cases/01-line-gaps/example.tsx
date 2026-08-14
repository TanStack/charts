import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { aapl } from '@charts-poc/demo-data/aapl'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'

export const definition = (input: ExampleOptions) => {
  const rows = aapl.slice(Math.abs(input.revision) % 2)

  return defineChart({
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
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Apple closing price with first-quarter gaps'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(definition(options), {
    keyboard: true,
    tooltip: exampleTooltip,
  })

export const chart = createExampleChart({
  width: 640,
  height: 480,
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
