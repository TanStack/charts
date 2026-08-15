import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, link } from '@tanstack/charts'
import { aapl } from '@tanstack/charts-data/aapl'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { selectCandleData } from './selection'

const candleDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
const price = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const createExampleChart = (input: ChartOptions) => {
  const rows = selectCandleData(aapl, input.revision)
  const gains = rows.filter((row) => row.Close >= row.Open)
  const losses = rows.filter((row) => row.Close < row.Open)
  return defineChart(
    {
      marks: [
        link(rows, {
          x1: 'Date',
          y1: 'Low',
          x2: 'Date',
          y2: 'High',
          stroke: '#64748b',
          strokeWidth: 1,
        }),
        link(gains, {
          x1: 'Date',
          y1: 'Open',
          x2: 'Date',
          y2: 'Close',
          stroke: '#10b981',
          strokeWidth: 5,
        }),
        link(losses, {
          x1: 'Date',
          y1: 'Open',
          x2: 'Date',
          y2: 'Close',
          stroke: '#ef4444',
          strokeWidth: 5,
        }),
      ],
      x: { scale: scaleUtc },
      y: { scale: scaleLinear, grid: true, axis: { label: 'Price' } },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: (point) =>
            `${candleDate.format(point.datum.Date)} · Open: ${price.format(point.datum.Open)} · High: ${price.format(point.datum.High)} · Low: ${price.format(point.datum.Low)} · Close: ${price.format(point.datum.Close)}`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Apple daily candlestick chart'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
