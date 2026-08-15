import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, dot, lineY, select, text } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@tanstack/charts-data/aapl'
import type { AaplRow } from '@tanstack/charts-data/aapl'

const annotationColor = '#dc2626'
const dateKey = (row: AaplRow) => row.Date.getTime()

export const minimumAapl = select(aapl, {
  value: 'Close',
  select: 'min',
})
export const maximumAapl = select(aapl, {
  value: 'Close',
  select: 'max',
})

export interface ChartOptions {
  compact?: boolean
}

export const createExampleChart = ({ compact = false }: ChartOptions = {}) => {
  const rows = aapl
  const preview = compact ?? false

  return defineChart(
    {
      marks: [
        lineY(rows, {
          id: 'close-line',
          x: 'Date',
          y: 'Close',
          key: dateKey,
          stroke: '#2563eb',
          strokeWidth: 2.25,
        }),
        dot(minimumAapl, {
          id: 'minimum-point',
          x: 'Date',
          y: 'Close',
          key: dateKey,
          fill: annotationColor,
          r: 5,
        }),
        dot(maximumAapl, {
          id: 'maximum-point',
          x: 'Date',
          y: 'Close',
          key: dateKey,
          fill: annotationColor,
          r: 5,
        }),
        decorative(
          text(minimumAapl, {
            id: 'minimum-label',
            x: 'Date',
            y: 'Close',
            key: dateKey,
            text: ({ Close }) => `Low $${Close.toFixed(2)}`,
            fill: annotationColor,
            anchor: preview ? 'start' : 'middle',
            dx: preview ? 6 : 0,
            dy: preview ? -13 : 13,
          }),
        ),
        decorative(
          text(maximumAapl, {
            id: 'maximum-label',
            x: 'Date',
            y: 'Close',
            key: dateKey,
            text: ({ Close }) => `High $${Close.toFixed(2)}`,
            fill: annotationColor,
            anchor: 'end',
            dx: -7,
            dy: preview ? 13 : -13,
          }),
        ),
      ],
      x: { scale: scaleUtc, axis: { label: 'Date' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Apple close (USD)' },
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}

export const exampleAriaLabel =
  'Apple closing price with minimum and maximum annotations'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
