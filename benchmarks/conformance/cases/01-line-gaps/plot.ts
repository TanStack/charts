import { aapl } from '@charts-poc/demo-data/aapl'
import * as Plot from '@observablehq/plot'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { mountObservablePlot } from '../../shared/mount'

function render(input: ConformanceInput) {
  const rows = aapl.slice(Math.abs(input.revision) % 2)

  return Plot.plot({
    width: input.width,
    height: input.height,
    ariaLabel: 'Apple closing price with first-quarter gaps',
    x: { type: 'utc', label: 'Week' },
    y: {
      grid: true,
      label: 'Close (USD)',
    },
    marks: [
      Plot.lineY(rows, {
        x: 'Date',
        y: (row) => (row.Date.getUTCMonth() < 3 ? null : row.Close),
        stroke: '#2563eb',
        strokeWidth: 2.25,
      }),
    ],
  })
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, render)
