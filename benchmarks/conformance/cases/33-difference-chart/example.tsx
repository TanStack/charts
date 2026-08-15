import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { aapl } from '@tanstack/charts-data/aapl'
import { defineChart, differenceY, rollingWindow } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { formatDifferenceMonth } from './model'

export const differenceRows = (input: ChartOptions) =>
  rollingWindow(aapl.slice(input.revision * 10, input.revision * 10 + 120), {
    size: 20,
    orderBy: 'Date',
    anchor: 'end',
    partial: false,
    outputs: {
      average: { value: 'Close', reduce: 'mean' },
    },
  })

export const createExampleChart = (input: ChartOptions) => {
  const rows = differenceRows(input)

  return defineChart(
    {
      marks: [
        differenceY(rows, {
          id: 'difference',
          x: 'Date',
          y1: 'average',
          y2: 'Close',
          positiveFill: '#16a34a',
          negativeFill: '#dc2626',
          fillOpacity: 0.35,
          stroke: '#166534',
          strokeWidth: 2,
          comparisonStroke: '#475569',
          comparisonStrokeWidth: 2,
        }),
      ],
      x: {
        scale: scaleUtc,
        axis: { ticks: { count: 9, format: formatDifferenceMonth } },
      },
      y: { scale: scaleLinear, grid: true, axis: { ticks: { count: 6 } } },
      margin: { top: 20, right: 20, bottom: 30, left: 80 },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel =
  'Apple closing price versus its twenty-day average'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
